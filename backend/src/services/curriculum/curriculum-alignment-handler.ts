import { curriculumAlignmentInputSchema, type CurriculumAlignmentInput, type SkillClassification } from "@pedago/shared";
import type { Json } from "@pedago/shared/database";
import { z } from "zod";
import { curriculumAlignmentPrompt } from "../../prompts/index.js";
import type { IndustryDemandResult, SkillDemandObservation } from "../../providers/industry/industry-demand-provider.js";
import { keywordOverlap, normalizeSkill, round, truncate } from "../../utils/text.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, EvidenceCandidate, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";

const outputSchema = z.object({
  recommendations: z
    .array(
      z.object({
        priority: z.number().int().min(1).max(30),
        title: z.string().min(1).max(200),
        type: z.enum(["micro_update", "lab", "project", "module"]),
        rationale: z.string().min(1).max(1200),
        estimatedHours: z.number().min(0.5).max(120),
        placement: z.string().min(1).max(200),
        evidenceKeys: z.array(z.string()).min(1).max(8),
      }),
    )
    .min(1)
    .max(20),
  ...aiFindingsBlock,
});

export interface SkillMeasure {
  skill: string;
  normalizedSkill: string;
  demandScore: number;
  coverageScore: number;
  classification: SkillClassification;
  evidenceCount: number;
  demandEvidenceKeys: string[];
  syllabusEvidenceKeys: string[];
  rationale: string;
}

export interface CurriculumAlignmentOutput {
  targetSector: string;
  alignmentScore: number;
  scoreVersion: string;
  skills: SkillMeasure[];
  counts: Record<SkillClassification, number>;
  sources: IndustryDemandResult["sources"];
  recommendations: z.infer<typeof outputSchema>["recommendations"];
}

export const ALIGNMENT_SCORE_VERSION = "curriculum-alignment.v1";

interface Extra {
  measures: SkillMeasure[];
  alignmentScore: number;
  sources: IndustryDemandResult["sources"];
}

/**
 * Deterministic demand/coverage measurement.
 *  - demandScore: skill frequency normalised by the most demanded skill (0..1)
 *  - coverageScore: best keyword overlap between the skill and syllabus topics/outcomes/document chunks (0..1)
 *  - classification: missing (coverage < 0.2), legacy (covered but demand < 0.15 or legacy hint), current otherwise
 *  - alignmentScore: Σ demand × coverage / Σ demand × 100
 */
export function measureAlignment(
  observations: SkillDemandObservation[],
  syllabusTerms: { text: string; key: string | null }[],
  legacyHints: string[],
  demandKeyBySkill: Map<string, string[]>,
): { measures: SkillMeasure[]; alignmentScore: number } {
  const totals = new Map<string, { skill: string; frequency: number; count: number }>();
  for (const observation of observations) {
    const entry = totals.get(observation.normalizedSkill) ?? { skill: observation.skill, frequency: 0, count: 0 };
    entry.frequency += observation.frequency;
    entry.count += 1;
    totals.set(observation.normalizedSkill, entry);
  }
  const maxFrequency = Math.max(1, ...[...totals.values()].map((entry) => entry.frequency));
  const hints = legacyHints.map((hint) => normalizeSkill(hint));
  const measures: SkillMeasure[] = [...totals.entries()].map(([normalizedSkill, entry]) => {
    const demandScore = round(entry.frequency / maxFrequency, 3);
    let coverageScore = 0;
    const syllabusKeys: string[] = [];
    for (const term of syllabusTerms) {
      const overlap = term.text.toLowerCase().includes(normalizedSkill) ? 1 : keywordOverlap(normalizedSkill, term.text);
      if (overlap > coverageScore) coverageScore = overlap;
      if (overlap >= 0.3 && term.key) syllabusKeys.push(term.key);
    }
    coverageScore = round(Math.min(1, coverageScore), 3);
    const isLegacyHint = hints.some((hint) => hint && normalizedSkill.includes(hint));
    const classification: SkillClassification = isLegacyHint ? "legacy" : coverageScore < 0.2 ? "missing" : demandScore < 0.15 ? "legacy" : "current";
    return {
      skill: entry.skill,
      normalizedSkill,
      demandScore,
      coverageScore,
      classification,
      evidenceCount: entry.count,
      demandEvidenceKeys: demandKeyBySkill.get(normalizedSkill) ?? [],
      syllabusEvidenceKeys: [...new Set(syllabusKeys)].slice(0, 4),
      rationale: `Demand ${demandScore} (${entry.frequency} mentions across ${entry.count} observations); syllabus coverage ${coverageScore}${isLegacyHint ? "; flagged as legacy by faculty hint" : ""}.`,
    };
  });
  // Legacy syllabus terms that no observation demands are also reported so faculty can prune them.
  for (const hint of hints) {
    if (hint && !measures.some((measure) => measure.normalizedSkill.includes(hint))) {
      const covered = syllabusTerms.filter((term) => term.text.toLowerCase().includes(hint));
      if (covered.length > 0) {
        measures.push({ skill: hint, normalizedSkill: hint, demandScore: 0, coverageScore: 1, classification: "legacy", evidenceCount: 0, demandEvidenceKeys: [], syllabusEvidenceKeys: covered.map((term) => term.key).filter((key): key is string => Boolean(key)).slice(0, 4), rationale: "Present in the syllabus with no observed industry demand." });
      }
    }
  }
  measures.sort((a, b) => b.demandScore - a.demandScore || a.skill.localeCompare(b.skill));
  const demandTotal = measures.reduce((sum, measure) => sum + measure.demandScore, 0);
  const alignmentScore = demandTotal === 0 ? 0 : round((measures.reduce((sum, measure) => sum + measure.demandScore * measure.coverageScore, 0) / demandTotal) * 100, 1);
  return { measures, alignmentScore };
}

export class CurriculumAlignmentHandler implements AnalysisHandler<CurriculumAlignmentInput, HandlerResult<CurriculumAlignmentOutput>, Extra> {
  readonly type = "curriculum_alignment" as const;
  readonly promptVersion = curriculumAlignmentPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): CurriculumAlignmentInput {
    return curriculumAlignmentInputSchema.parse(input);
  }

  async collectContext(context: AnalysisContext<CurriculumAlignmentInput>): Promise<CollectedContext<CurriculumAlignmentInput, Extra>> {
    const { input } = context;
    const datasets = context.documents.filter((document) => document.kind === "job_dataset");
    const syllabusDocuments = context.documents.filter((document) => document.kind !== "job_dataset");
    await context.reportProgress("indexing", 35, "Collecting industry demand observations");
    const demand = await context.deps.industryDemand.collect(context.workspace.id, input.targetSector, datasets, input.industrySourceKeys);

    const evidence: EvidenceCandidate[] = [];
    const demandKeyBySkill = new Map<string, string[]>();
    // One evidence item per unique dataset row/observation (bounded); skills sharing a row share the key.
    const keyByLocator = new Map<string, string>();
    for (const observation of demand.observations) {
      const locatorKey = `${observation.sourceKey}:${JSON.stringify(observation.locator)}`;
      let key = keyByLocator.get(locatorKey);
      if (!key) {
        if (evidence.length >= 40) continue;
        key = evidenceKey(evidence.length);
        keyByLocator.set(locatorKey, key);
        evidence.push({ key, sourceType: observation.documentChunkId ? "document_chunk" : "external_dataset", documentId: observation.documentId, documentChunkId: observation.documentChunkId, externalSourceUrl: typeof observation.locator.url === "string" ? observation.locator.url : undefined, title: `${observation.sourceName}: ${observation.skill}`, locator: observation.locator, excerpt: truncate(observation.excerpt, 400), metadata: { sourceKey: observation.sourceKey, retrievedAt: observation.retrievedAt, frequency: observation.frequency, sampleSize: observation.sampleSize } });
      }
      demandKeyBySkill.set(observation.normalizedSkill, [...new Set([...(demandKeyBySkill.get(observation.normalizedSkill) ?? []), key])]);
    }
    const syllabusTerms: { text: string; key: string | null }[] = [...input.syllabusTopics, ...input.learningOutcomes].map((text) => ({ text, key: null }));
    if (syllabusTerms.length > 0) {
      const key = evidenceKey(evidence.length);
      evidence.push(metricEvidence(key, "Syllabus topics and learning outcomes", truncate([...input.syllabusTopics, ...input.learningOutcomes].join("; "), 1500), { topics: input.syllabusTopics.length, outcomes: input.learningOutcomes.length }));
      for (const term of syllabusTerms) term.key = key;
    }
    const syllabusEvidence = await collectDocumentEvidence({ ...context, documents: syllabusDocuments }, demand.observations.slice(0, 5).map((observation) => observation.skill).concat([input.targetSector]), { limit: 12, startIndex: evidence.length, fullIfChunksUnder: 40 });
    evidence.push(...syllabusEvidence.evidence);
    for (const item of syllabusEvidence.evidence) syllabusTerms.push({ text: item.excerpt, key: item.key });

    const { measures, alignmentScore } = measureAlignment(demand.observations, syllabusTerms, input.legacyHintTerms, demandKeyBySkill);
    evidence.push(metricEvidence(evidenceKey(evidence.length), "Alignment measures", `Alignment ${alignmentScore}/100 (${ALIGNMENT_SCORE_VERSION}). ${measures.map((measure) => `${measure.skill}: ${measure.classification} (demand ${measure.demandScore}, coverage ${measure.coverageScore})`).join("; ")}`, { alignmentScore }));
    const limitations = [...demand.limitations];
    if (syllabusTerms.length === 0) limitations.push("No syllabus topics, outcomes, or documents supplied; coverage is zero by construction.");
    return { ...context, evidence, extra: { measures, alignmentScore, sources: demand.sources }, limitations, retrieval: syllabusEvidence.retrieval, externalSources: { sources: demand.sources } };
  }

  async execute(context: CollectedContext<CurriculumAlignmentInput, Extra>): Promise<HandlerResult<CurriculumAlignmentOutput>> {
    const { extra, input } = context;
    const counts: Record<SkillClassification, number> = { current: 0, legacy: 0, missing: 0 };
    for (const measure of extra.measures) counts[measure.classification] += 1;
    const measureKey = context.evidence[context.evidence.length - 1]!.key;
    const findings = [
      measuredFinding(`Alignment score ${extra.alignmentScore}/100`, `${counts.current} current, ${counts.legacy} legacy, ${counts.missing} missing skills for ${input.targetSector}.`, [measureKey], { category: "score", metrics: { counts, scoreVersion: ALIGNMENT_SCORE_VERSION } }),
      ...extra.measures.filter((measure) => measure.classification !== "current").slice(0, 12).map((measure) => measuredFinding(`${measure.classification}: ${measure.skill}`, measure.rationale, [...measure.demandEvidenceKeys.slice(0, 3), ...measure.syllabusEvidenceKeys.slice(0, 2), measureKey], { category: measure.classification, confidence: measure.evidenceCount >= 3 ? "high" : "medium", metrics: { demandScore: measure.demandScore, coverageScore: measure.coverageScore, evidenceCount: measure.evidenceCount } })),
    ];
    if (extra.measures.length === 0) {
      return { findings, artifacts: [], output: { targetSector: input.targetSector, alignmentScore: 0, scoreVersion: ALIGNMENT_SCORE_VERSION, skills: [], counts, sources: extra.sources, recommendations: [] }, confidence: "low", limitations: context.limitations, modelCalls: [], promptVersion: this.promptVersion };
    }
    const response = await runPrompt(context, curriculumAlignmentPrompt, { targetSector: input.targetSector, measures: JSON.stringify(extra.measures.map((measure) => ({ skill: measure.skill, classification: measure.classification, demand: measure.demandScore, coverage: measure.coverageScore, evidenceKeys: [...measure.demandEvidenceKeys.slice(0, 2), ...measure.syllabusEvidenceKeys.slice(0, 1)] }))), evidence: context.evidence }, outputSchema);
    const recommendations = [...response.data.recommendations].sort((a, b) => a.priority - b.priority);
    findings.push(...response.data.findings.map((finding) => toFindingDraft(finding, "recommendation_insight")));
    const output: CurriculumAlignmentOutput = { targetSector: input.targetSector, alignmentScore: extra.alignmentScore, scoreVersion: ALIGNMENT_SCORE_VERSION, skills: extra.measures, counts, sources: extra.sources, recommendations };
    const text = [
      `## Curriculum alignment — ${input.targetSector}`,
      `Alignment score **${extra.alignmentScore}/100** (${ALIGNMENT_SCORE_VERSION}). Sources: ${extra.sources.map((source) => `${source.name} (retrieved ${source.retrievedAt.slice(0, 10)}, ${source.observationCount} observations)`).join("; ") || "none"}`,
      ``,
      `| Skill | Classification | Demand | Coverage |`,
      `|---|---|---|---|`,
      ...extra.measures.map((measure) => `| ${measure.skill} | ${measure.classification} | ${measure.demandScore} | ${measure.coverageScore} |`),
      ``,
      `### Prioritised updates`,
      ...recommendations.map((item) => `${item.priority}. **${item.title}** (${item.type}, ~${item.estimatedHours}h, ${item.placement}) — ${item.rationale} [${item.evidenceKeys.join(", ")}]`),
    ].join("\n");
    return { findings, artifacts: [{ type: "curriculum_pack", title: `Course enhancement pack — ${input.targetSector}`, content: output as unknown as Record<string, unknown>, contentText: text }], output, confidence: overallConfidence(findings), limitations: response.data.limitations, modelCalls: [response.model], promptVersion: this.promptVersion };
  }

  async persist(context: PersistContext<HandlerResult<CurriculumAlignmentOutput>, CurriculumAlignmentInput, Extra>): Promise<void> {
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    if (context.extra.measures.length > 0) {
      await context.deps.industry.insertMappings(context.extra.measures.map((measure) => ({ ...tenant, analysis_id: context.analysis.id, course_topic_id: null, skill: measure.skill, classification: measure.classification, coverage_score: measure.coverageScore, demand_score: measure.demandScore, evidence_count: measure.evidenceCount, rationale: measure.rationale })));
    }
    if (context.result.output.recommendations.length > 0) {
      await context.deps.industry.insertRecommendations(context.result.output.recommendations.map((item) => ({ ...tenant, analysis_id: context.analysis.id, priority: item.priority, title: item.title, rationale: item.rationale, estimated_hours: item.estimatedHours, placement: item.placement, recommendation_type: item.type, content: { evidenceKeys: item.evidenceKeys } as Json })));
    }
  }
}
