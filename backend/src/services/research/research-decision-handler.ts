import {
  defaultResearchDecisionWeights,
  researchDecisionInputSchema,
  researchDecisionWeightsSchema,
  type ResearchDecisionInput,
  type ResearchDecisionWeights,
} from "@pedago/shared";
import type { Json } from "@pedago/shared/database";
import { z } from "zod";
import { researchDecisionPrompt } from "../../prompts/index.js";
import { round } from "../../utils/text.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";
import { collectResearchContext, type RankedWork } from "./research-context.js";

const buildOutputSchema = (optionCount: number) => z.object({
  optionAssessments: z
    .array(
      z.object({
        optionIndex: z.number().int().min(0).max(Math.max(0, optionCount - 1)),
        strengths: z.array(z.string().min(1).max(500)).min(1).max(6),
        risks: z.array(z.string().min(1).max(500)).min(1).max(6),
        evidenceKeys: z.array(z.string()).max(8),
      }),
    )
    .min(1),
  ...aiFindingsBlock,
});

export interface ScoredOption {
  index: number;
  label: string;
  description: string;
  criteria: Record<keyof ResearchDecisionWeights, number>;
  weightedScore: number;
  rank: number;
  contributions: Record<keyof ResearchDecisionWeights, number>;
}

export interface ResearchDecisionOutput {
  weights: ResearchDecisionWeights;
  options: (ScoredOption & { strengths: string[]; risks: string[]; evidenceKeys: string[] })[];
  scoreVersion: string;
}

export const DECISION_SCORE_VERSION = "research-decision-score.v1";

/**
 * Deterministic weighted score. Risk is inverted (higher risk lowers the score). Result is on a
 * 0–100 scale: Σ weight_i × normalized_i where normalized is criterion/10 (or (10-risk)/10).
 */
export function scoreDecisionOptions(options: ResearchDecisionInput["options"], weights: ResearchDecisionWeights): ScoredOption[] {
  const scored = options.map((option, index) => {
    const contributions = {} as Record<keyof ResearchDecisionWeights, number>;
    let total = 0;
    for (const key of Object.keys(weights) as (keyof ResearchDecisionWeights)[]) {
      const raw = option.criteria[key];
      const normalized = key === "risk" ? (10 - raw) / 10 : raw / 10;
      const contribution = round(weights[key] * normalized, 3);
      contributions[key] = contribution;
      total += contribution;
    }
    return { index, label: option.label, description: option.description, criteria: option.criteria, weightedScore: round(total, 2), rank: 0, contributions };
  });
  const ordered = [...scored].sort((a, b) => b.weightedScore - a.weightedScore || a.index - b.index);
  ordered.forEach((option, position) => {
    option.rank = position + 1;
  });
  return scored;
}

interface Extra {
  weights: ResearchDecisionWeights;
  scored: ScoredOption[];
  ranked: RankedWork[];
}

export class ResearchDecisionHandler implements AnalysisHandler<ResearchDecisionInput, HandlerResult<ResearchDecisionOutput>, Extra> {
  readonly type = "research_decision" as const;
  readonly promptVersion = researchDecisionPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): ResearchDecisionInput {
    return researchDecisionInputSchema.parse(input);
  }

  async collectContext(context: AnalysisContext<ResearchDecisionInput>): Promise<CollectedContext<ResearchDecisionInput, Extra>> {
    const { input } = context;
    const weights = researchDecisionWeightsSchema.parse(input.weights ?? context.settings.weights ?? defaultResearchDecisionWeights);
    const scored = scoreDecisionOptions(input.options, weights);
    const evidence = scored.map((option) =>
      metricEvidence(evidenceKey(option.index), `Weighted score: ${option.label}`, `Score ${option.weightedScore}/100 (rank ${option.rank}). Contributions: ${Object.entries(option.contributions).map(([k, v]) => `${k}=${v}`).join(", ")}.`, { optionIndex: option.index }),
    );
    let ranked: RankedWork[] = [];
    const limitations: string[] = [];
    let externalSources: Record<string, unknown> = {};
    if (input.checkNovelty) {
      await context.reportProgress("indexing", 35, "Retrieving novelty evidence for each option");
      const research = await collectResearchContext(context, input.options.map((option) => option.label).slice(0, 4), {
        limitPerSource: 10,
        rankAgainst: input.options.map((option) => option.label).join("; "),
        maxEvidence: 10,
        startIndex: evidence.length,
        yearFrom: context.settings.yearFrom,
        yearTo: context.settings.yearTo,
      });
      evidence.push(...research.evidence);
      ranked = research.ranked;
      limitations.push(...research.limitations);
      externalSources = { sources: research.aggregated.coverage, totalRetrieved: research.aggregated.works.length };
    } else {
      limitations.push("Novelty evidence scores were supplied by the faculty member and not checked against literature.");
    }
    return { ...context, evidence, extra: { weights, scored, ranked }, limitations, retrieval: {}, externalSources };
  }

  async execute(context: CollectedContext<ResearchDecisionInput, Extra>): Promise<HandlerResult<ResearchDecisionOutput>> {
    const { extra, input } = context;
    const response = await runPrompt(
      context,
      researchDecisionPrompt,
      {
        options: input.options.map((option, index) => `[${index}] ${option.label}: ${option.description}\n    criteria=${JSON.stringify(option.criteria)}${option.notes ? `\n    notes=${option.notes}` : ""}`).join("\n"),
        weights: JSON.stringify(extra.weights),
        ranking: [...extra.scored].sort((a, b) => a.rank - b.rank).map((option) => `#${option.rank} ${option.label} (${option.weightedScore})`).join(", "),
        evidence: context.evidence,
      },
      buildOutputSchema(input.options.length),
    );
    const assessments = new Map(response.data.optionAssessments.map((assessment) => [assessment.optionIndex, assessment]));
    const output: ResearchDecisionOutput = {
      weights: extra.weights,
      scoreVersion: DECISION_SCORE_VERSION,
      options: extra.scored.map((option) => {
        const assessment = assessments.get(option.index);
        return { ...option, strengths: assessment?.strengths ?? [], risks: assessment?.risks ?? [], evidenceKeys: assessment?.evidenceKeys ?? [] };
      }),
    };
    const findings = [
      measuredFinding(
        "Weighted ranking",
        [...extra.scored].sort((a, b) => a.rank - b.rank).map((option) => `#${option.rank} ${option.label}: ${option.weightedScore}/100`).join("; "),
        extra.scored.map((option) => evidenceKey(option.index)),
        { category: "ranking", metrics: { weights: extra.weights, scoreVersion: DECISION_SCORE_VERSION } },
      ),
      ...response.data.findings.map((finding) => toFindingDraft(finding, "reasoning")),
    ];
    const report = [
      `## Research decision matrix`,
      `Weights: ${Object.entries(extra.weights).map(([k, v]) => `${k}=${v}`).join(", ")} (score version ${DECISION_SCORE_VERSION})`,
      ``,
      `| Rank | Option | Score |`,
      `|---|---|---|`,
      ...[...output.options].sort((a, b) => a.rank - b.rank).map((option) => `| ${option.rank} | ${option.label} | ${option.weightedScore} |`),
      ``,
      ...output.options.flatMap((option) => [`### ${option.label}`, `Strengths: ${option.strengths.join("; ") || "—"}`, `Risks: ${option.risks.join("; ") || "—"}`, ``]),
    ].join("\n");
    return {
      findings,
      artifacts: [{ type: "research_report", title: "Research decision matrix", content: output as unknown as Record<string, unknown>, contentText: report }],
      output,
      confidence: overallConfidence(findings),
      limitations: response.data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<ResearchDecisionOutput>, ResearchDecisionInput, Extra>): Promise<void> {
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    await context.deps.research.insertDecisionOptions(
      context.extra.scored.map((option) => ({ ...tenant, analysis_id: context.analysis.id, label: option.label, description: option.description, criteria_scores: { ...option.criteria, contributions: option.contributions } as Json, weighted_score: option.weightedScore, rank: option.rank })),
    );
    if (context.extra.ranked.length > 0) {
      await context.deps.analyses.linkResearchWorks(context.extra.ranked.map((item) => ({ analysis_id: context.analysis.id, research_work_id: item.row.id, relevance_score: item.relevance, relationship: "context" as const })));
    }
  }
}
