import { gapVerdicts, researchGapInputSchema, type ResearchGapInput } from "@pedago/shared";
import type { Json } from "@pedago/shared/database";
import { z } from "zod";
import { researchGapPrompt } from "../../prompts/index.js";
import { aiFindingSchema, aiFindingsBlock, measuredFinding, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, HandlerResult, PersistContext } from "../analysis/types.js";
import { overallConfidence } from "../analysis/types.js";
import { buildSearchQueries, collectResearchContext, type RankedWork } from "./research-context.js";

const outputSchema = z.object({
  verdict: z.enum(gapVerdicts),
  verdictRationale: z.string().min(1).max(3000),
  closestWorkKeys: z.array(z.string()).max(8),
  supportingFindings: z.array(aiFindingSchema).max(10),
  contradictingFindings: z.array(aiFindingSchema).max(10),
  suggestedClaimReformulation: z.string().min(1).max(2000),
  limitations: aiFindingsBlock.limitations,
});

interface Extra {
  ranked: RankedWork[];
  coverage: Record<string, unknown>;
  queries: string[];
  yearRange: string;
}

export interface ResearchGapOutput {
  verdict: (typeof gapVerdicts)[number];
  verdictRationale: string;
  closestWork: { evidenceKey: string; title: string; year?: number; url: string; relevance: number }[];
  searchCoverage: Record<string, unknown>;
  suggestedClaimReformulation: string;
  retrievedWorkCount: number;
}

export class ResearchGapHandler implements AnalysisHandler<ResearchGapInput, HandlerResult<ResearchGapOutput>, Extra> {
  readonly type = "research_gap" as const;
  readonly promptVersion = researchGapPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): ResearchGapInput {
    return researchGapInputSchema.parse(input);
  }

  async collectContext(context: AnalysisContext<ResearchGapInput>): Promise<CollectedContext<ResearchGapInput, Extra>> {
    const { input } = context;
    const queries = buildSearchQueries({ topic: input.topic, method: input.method, problem: input.problem, populationContext: input.populationContext });
    await context.reportProgress("indexing", 35, `Searching ${queries.length} queries across literature sources`);
    const research = await collectResearchContext(context, queries, {
      sources: input.sources,
      yearFrom: input.yearFrom ?? context.settings.yearFrom,
      yearTo: input.yearTo ?? context.settings.yearTo,
      limitPerSource: input.maxResultsPerSource ?? 25,
      rankAgainst: `${input.topic}. ${input.claimedGap}`,
      maxEvidence: Math.min(context.settings.maxEvidence ?? 15, 25),
    });

    const documentEvidence = await collectDocumentEvidence(context, [input.claimedGap, input.topic], { limit: 6, startIndex: research.evidence.length });
    const yearRange = `${input.yearFrom ?? context.settings.yearFrom ?? "any"}–${input.yearTo ?? context.settings.yearTo ?? "present"}`;
    const coverage = {
      sources: research.aggregated.coverage,
      queries,
      yearRange,
      totalRetrieved: research.aggregated.works.length,
      duplicatesRemoved: research.aggregated.duplicatesRemoved,
      retrievedAt: research.aggregated.retrievedAt,
    };
    return {
      ...context,
      evidence: [...research.evidence, ...documentEvidence.evidence],
      extra: { ranked: research.ranked, coverage, queries, yearRange },
      limitations: research.limitations,
      retrieval: documentEvidence.retrieval,
      externalSources: coverage,
    };
  }

  async execute(context: CollectedContext<ResearchGapInput, Extra>): Promise<HandlerResult<ResearchGapOutput>> {
    const { input, extra } = context;
    if (context.evidence.length === 0) {
      // No evidence at all: do not ask the model to speculate.
      return {
        findings: [
          measuredFinding("Insufficient evidence to evaluate the claimed gap", "No literature or uploaded documents were retrieved for the search queries.", [], {
            category: "verdict",
            confidence: "low",
            limitations: ["No works retrieved from the configured sources.", ...context.limitations],
          }),
        ],
        artifacts: [],
        output: {
          verdict: "insufficient_evidence",
          verdictRationale: "The search returned no works to compare against the claim.",
          closestWork: [],
          searchCoverage: extra.coverage,
          suggestedClaimReformulation: input.claimedGap,
          retrievedWorkCount: 0,
        },
        confidence: "low",
        limitations: ["No works retrieved; verdict is insufficient_evidence by construction."],
        modelCalls: [],
        promptVersion: this.promptVersion,
      };
    }
    const response = await runPrompt(
      context,
      researchGapPrompt,
      {
        topic: input.topic,
        claimedGap: input.claimedGap,
        method: input.method,
        problem: input.problem,
        populationContext: input.populationContext,
        yearRange: extra.yearRange,
        coverage: `${JSON.stringify(extra.coverage.sources)} (deduplicated works: ${extra.ranked.length} shown of ${(extra.coverage as { totalRetrieved: number }).totalRetrieved})`,
        evidence: context.evidence,
      },
      outputSchema,
    );
    const data = response.data;
    const evidenceByKey = new Map(context.evidence.map((item) => [item.key, item]));
    const closestKeys = data.closestWorkKeys.filter((key) => evidenceByKey.has(key));
    const failedSources = (extra.coverage.sources as { ok: boolean }[]).filter((entry) => !entry.ok).length;
    // Novelty cannot be asserted from incomplete coverage; downgrade "supported" when sources failed.
    const verdict = data.verdict === "supported" && failedSources > 0 ? "partially_supported" : data.verdict;
    const findings = [
      measuredFinding(
        `Verdict: ${verdict.replace("_", " ")}`,
        data.verdictRationale,
        closestKeys.length > 0 ? closestKeys : context.evidence.slice(0, 3).map((item) => item.key),
        {
          category: "verdict",
          confidence: verdict === "insufficient_evidence" ? "low" : failedSources > 0 ? "medium" : "high",
          metrics: { verdict, retrievedWorks: extra.ranked.length, failedSources },
          limitations: [...data.limitations, ...context.limitations],
        },
      ),
      ...data.supportingFindings.map((finding) => toFindingDraft(finding, "supporting", "supports")),
      ...data.contradictingFindings.map((finding) => toFindingDraft(finding, "contradicting", "contradicts")),
    ];
    const closestWork = closestKeys.map((key) => {
      const ranked = extra.ranked.find((item) => item.key === key);
      const item = evidenceByKey.get(key)!;
      return { evidenceKey: key, title: item.title, year: item.publishedYear, url: item.externalSourceUrl ?? "", relevance: ranked?.relevance ?? 0 };
    });
    const output: ResearchGapOutput = {
      verdict,
      verdictRationale: data.verdictRationale,
      closestWork,
      searchCoverage: extra.coverage,
      suggestedClaimReformulation: data.suggestedClaimReformulation,
      retrievedWorkCount: extra.ranked.length,
    };
    const report = [
      `## Research gap verification`,
      `**Claim:** ${input.claimedGap}`,
      `**Verdict:** ${verdict}`,
      ``,
      data.verdictRationale,
      ``,
      `### Closest prior work`,
      ...closestWork.map((work) => `- [${work.evidenceKey}] ${work.title}${work.year ? ` (${work.year})` : ""} — ${work.url}`),
      ``,
      `### Suggested reformulation`,
      data.suggestedClaimReformulation,
      ``,
      `### Search coverage`,
      ...(extra.coverage.sources as { source: string; query: string; ok: boolean; returned: number; errorCode: string | null }[]).map(
        (entry) => `- ${entry.source} — "${entry.query}": ${entry.ok ? `${entry.returned} results` : `failed (${entry.errorCode})`}`,
      ),
      ``,
      `### Limitations`,
      ...[...data.limitations, ...context.limitations].map((item) => `- ${item}`),
    ].join("\n");
    return {
      findings,
      artifacts: [{ type: "research_report", title: `Gap verification: ${input.topic}`, content: output as unknown as Record<string, unknown>, contentText: report }],
      output,
      confidence: overallConfidence(findings),
      limitations: data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<ResearchGapOutput>, ResearchGapInput, Extra>): Promise<void> {
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    for (const entry of (context.extra.coverage.sources as { source: string; query: string; ok: boolean; returned: number; errorCode: string | null }[]) ?? []) {
      await context.deps.research.recordQuery({
        ...tenant,
        analysis_id: context.analysis.id,
        query_text: entry.query,
        source: entry.source,
        filters: { yearRange: context.extra.yearRange } as Json,
        executed_at: (context.extra.coverage.retrievedAt as string) ?? new Date().toISOString(),
        result_count: entry.returned,
        error_code: entry.errorCode,
      });
    }
    const closest = new Set(context.result.output.closestWork.map((work) => work.evidenceKey));
    if (context.extra.ranked.length > 0) {
      await context.deps.analyses.linkResearchWorks(
        context.extra.ranked.map((item) => ({
          analysis_id: context.analysis.id,
          research_work_id: item.row.id,
          relevance_score: item.relevance,
          relationship: closest.has(item.key) ? "closest" : "context",
        })),
      );
    }
  }
}
