import { researchQuestionInputSchema, type ResearchQuestionInput } from "@pedago/shared";
import { z } from "zod";
import { researchQuestionPrompt } from "../../prompts/index.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";
import { collectResearchContext, type RankedWork } from "./research-context.js";

const dimensionSchema = z.object({ score: z.number().min(0).max(10), justification: z.string().min(1).max(1200) });
const outputSchema = z.object({
  scores: z.object({
    clarity: dimensionSchema,
    specificity: dimensionSchema,
    variables: dimensionSchema,
    populationContext: dimensionSchema,
    measurability: dimensionSchema,
    feasibility: dimensionSchema,
    scope: dimensionSchema,
    noveltyEvidence: dimensionSchema.extend({ evidenceKeys: z.array(z.string()).max(8) }),
    hypothesisQuality: dimensionSchema,
  }),
  issues: z.array(z.object({ dimension: z.string().min(1), phrase: z.string().min(1).max(400), problem: z.string().min(1).max(800), fix: z.string().min(1).max(800) })).max(15),
  revisedAlternatives: z.array(z.object({ question: z.string().min(10).max(1500), tradeoffs: z.string().min(1).max(1200) })).min(1).max(4),
  ...aiFindingsBlock,
});

export type ResearchQuestionOutput = z.infer<typeof outputSchema> & { overallScore: number; noveltyCoverage: Record<string, unknown> | null };

interface Extra {
  ranked: RankedWork[];
  coverage: Record<string, unknown> | null;
}

export class ResearchQuestionHandler implements AnalysisHandler<ResearchQuestionInput, HandlerResult<ResearchQuestionOutput>, Extra> {
  readonly type = "research_question" as const;
  readonly promptVersion = researchQuestionPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): ResearchQuestionInput {
    return researchQuestionInputSchema.parse(input);
  }

  async collectContext(context: AnalysisContext<ResearchQuestionInput>): Promise<CollectedContext<ResearchQuestionInput, Extra>> {
    const { input } = context;
    let evidence = [] as CollectedContext<ResearchQuestionInput, Extra>["evidence"];
    let ranked: RankedWork[] = [];
    let coverage: Record<string, unknown> | null = null;
    const limitations: string[] = [];
    if (input.checkNovelty) {
      await context.reportProgress("indexing", 35, "Checking novelty evidence in literature sources");
      const research = await collectResearchContext(context, [input.researchQuestion.slice(0, 200)], {
        sources: input.sources,
        yearFrom: context.settings.yearFrom,
        yearTo: context.settings.yearTo,
        limitPerSource: 15,
        rankAgainst: input.researchQuestion,
        maxEvidence: 8,
      });
      evidence = research.evidence;
      ranked = research.ranked;
      coverage = { sources: research.aggregated.coverage, totalRetrieved: research.aggregated.works.length, retrievedAt: research.aggregated.retrievedAt };
      limitations.push(...research.limitations);
    } else {
      limitations.push("Novelty check disabled; noveltyEvidence score is not grounded in literature retrieval.");
    }
    const documents = await collectDocumentEvidence(context, [input.researchQuestion], { limit: 6, startIndex: evidence.length });
    const combined = [...evidence, ...documents.evidence];
    // The question (and hypothesis) under test is itself citable context so findings can locate issues in it.
    combined.push(metricEvidence(evidenceKey(combined.length), "Research question under test", `${input.researchQuestion}${input.hypothesis ? `\nHypothesis: ${input.hypothesis}` : ""}`, { kind: "input" }));
    return { ...context, evidence: combined, extra: { ranked, coverage }, limitations, retrieval: documents.retrieval, externalSources: coverage ?? {} };
  }

  async execute(context: CollectedContext<ResearchQuestionInput, Extra>): Promise<HandlerResult<ResearchQuestionOutput>> {
    const { input } = context;
    const response = await runPrompt(context, researchQuestionPrompt, { researchQuestion: input.researchQuestion, hypothesis: input.hypothesis, context: input.context, evidence: context.evidence }, outputSchema);
    const data = response.data;
    if (context.evidence.filter((item) => item.sourceType === "research_work").length === 0) {
      // Without literature evidence the novelty score cannot exceed a low band.
      data.scores.noveltyEvidence = { ...data.scores.noveltyEvidence, score: Math.min(data.scores.noveltyEvidence.score, 3), evidenceKeys: [] };
    }
    const scoreValues = Object.values(data.scores).map((dimension) => dimension.score);
    const overallScore = Math.round((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) * 10) / 10;
    const output: ResearchQuestionOutput = { ...data, overallScore, noveltyCoverage: context.extra.coverage };
    const findings = [
      ...data.findings.map((finding) => toFindingDraft(finding, "stress_test")),
      ...(data.scores.noveltyEvidence.evidenceKeys.length > 0
        ? [measuredFinding("Novelty evidence located", data.scores.noveltyEvidence.justification, data.scores.noveltyEvidence.evidenceKeys, { category: "novelty", confidence: "medium", metrics: { score: data.scores.noveltyEvidence.score } })]
        : []),
    ];
    const report = [
      `## Research question stress test`,
      `> ${input.researchQuestion}`,
      ``,
      `Overall score: **${overallScore}/10**`,
      ``,
      `| Dimension | Score | Justification |`,
      `|---|---|---|`,
      ...Object.entries(data.scores).map(([name, dimension]) => `| ${name} | ${dimension.score} | ${dimension.justification.replace(/\|/g, "/")} |`),
      ``,
      `### Issues`,
      ...data.issues.map((issue) => `- **${issue.dimension}** — "${issue.phrase}": ${issue.problem} → ${issue.fix}`),
      ``,
      `### Revised alternatives`,
      ...data.revisedAlternatives.map((alternative, index) => `${index + 1}. ${alternative.question}\n   _Tradeoffs:_ ${alternative.tradeoffs}`),
    ].join("\n");
    return {
      findings,
      artifacts: [{ type: "research_report", title: "Research question stress test", content: output as unknown as Record<string, unknown>, contentText: report }],
      output,
      confidence: overallConfidence(findings, "medium"),
      limitations: data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<ResearchQuestionOutput>, ResearchQuestionInput, Extra>): Promise<void> {
    if (context.extra.ranked.length > 0) {
      await context.deps.analyses.linkResearchWorks(context.extra.ranked.map((item) => ({ analysis_id: context.analysis.id, research_work_id: item.row.id, relevance_score: item.relevance, relationship: "context" as const })));
    }
  }
}
