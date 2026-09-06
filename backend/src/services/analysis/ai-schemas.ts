import { confidenceLevels, insightSourceKinds } from "@pedago/shared";
import { z } from "zod";
import type { EvidenceCandidate, FindingDraft } from "./types.js";

export const aiFindingSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  confidence: z.enum(confidenceLevels),
  sourceKind: z.enum(insightSourceKinds),
  evidenceKeys: z.array(z.string()).min(1).max(12),
  limitations: z.array(z.string().max(500)).min(1).max(8),
  requiresHumanReview: z.boolean(),
});
export type AIFinding = z.infer<typeof aiFindingSchema>;

export const aiFindingsBlock = {
  findings: z.array(aiFindingSchema).min(1).max(20),
  limitations: z.array(z.string().max(500)).min(1).max(12),
};

export function toFindingDraft(
  finding: AIFinding,
  category: string,
  relation: FindingDraft["evidence"][number]["relation"] = "supports",
  metrics: Record<string, unknown> = {},
): FindingDraft {
  // AI hypotheses are capped at medium confidence and always require review.
  const isHypothesis = finding.sourceKind === "ai_hypothesis";
  return {
    title: finding.title,
    summary: finding.summary,
    confidence: isHypothesis && finding.confidence === "high" ? "medium" : finding.confidence,
    limitations: finding.limitations,
    requiresHumanReview: finding.requiresHumanReview || isHypothesis,
    category,
    metrics: { sourceKind: finding.sourceKind, ...metrics },
    evidence: [...new Set(finding.evidenceKeys)].map((key) => ({ key, relation })),
  };
}

/** A measured (deterministic) finding, never touched by the model. */
export function measuredFinding(
  title: string,
  summary: string,
  evidenceKeys: string[],
  options: { category: string; metrics?: Record<string, unknown>; confidence?: FindingDraft["confidence"]; limitations?: string[] },
): FindingDraft {
  return {
    title,
    summary,
    confidence: options.confidence ?? "high",
    limitations: options.limitations ?? ["Calculated from the supplied data only; coverage limits apply."],
    requiresHumanReview: false,
    category: options.category,
    metrics: { sourceKind: "data_derived_pattern", ...(options.metrics ?? {}) },
    evidence: evidenceKeys.map((key) => ({ key, relation: "supports" as const })),
  };
}

export function metricEvidence(key: string, title: string, excerpt: string, metadata: Record<string, unknown> = {}): EvidenceCandidate {
  return {
    key,
    sourceType: "calculated_metric",
    title,
    locator: { section: "calculated" },
    excerpt,
    metadata,
  };
}
