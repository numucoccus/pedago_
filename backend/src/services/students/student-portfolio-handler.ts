import { studentPortfolioInputSchema, type StudentPortfolioInput } from "@pedago/shared";
import type { AchievementRow, Json, StudentActivityMetricRow, StudentRow } from "@pedago/shared/database";
import { z } from "zod";
import { studentPortfolioPrompt } from "../../prompts/index.js";
import { AppError } from "../../utils/errors.js";
import { truncate } from "../../utils/text.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, EvidenceCandidate, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";
import { computePortfolioScore, detectWorkloadSignals, resolveWeights, type PortfolioScore, type WorkloadSignal } from "./portfolio-scoring.js";

const outputSchema = z.object({
  strengths: z.array(z.object({ dimension: z.string().min(1).max(60), summary: z.string().min(1).max(800), evidenceKeys: z.array(z.string()).min(1).max(8) })).max(8),
  growthAreas: z.array(z.object({ dimension: z.string().min(1).max(60), summary: z.string().min(1).max(800), evidenceKeys: z.array(z.string()).max(8) })).max(8),
  ...aiFindingsBlock,
});

export interface StudentPortfolioOutput {
  student: { id: string; displayName: string; program: string | null; cohort: string | null };
  score: PortfolioScore;
  achievements: { id: string; title: string; category: string; level: string | null; verificationStatus: string; date: string | null; evidenceKey: string }[];
  strengths: z.infer<typeof outputSchema>["strengths"];
  growthAreas: z.infer<typeof outputSchema>["growthAreas"];
  workloadSignals: WorkloadSignal[];
}

interface Extra {
  student: StudentRow;
  achievements: AchievementRow[];
  metrics: StudentActivityMetricRow[];
  score: PortfolioScore;
  signals: WorkloadSignal[];
}

export class StudentPortfolioHandler implements AnalysisHandler<StudentPortfolioInput, HandlerResult<StudentPortfolioOutput>, Extra> {
  readonly type = "student_portfolio" as const;
  readonly promptVersion = studentPortfolioPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): StudentPortfolioInput {
    return studentPortfolioInputSchema.parse(input);
  }

  async collectContext(context: AnalysisContext<StudentPortfolioInput>): Promise<CollectedContext<StudentPortfolioInput, Extra>> {
    const student = await context.deps.students.getById(context.input.studentId);
    if (!student || student.workspace_id !== context.workspace.id) {
      throw AppError.forbidden("Student does not belong to this workspace");
    }
    const [achievements, metrics, activeModel] = await Promise.all([
      context.deps.students.listAchievements(student.id),
      context.deps.students.listActivityMetrics(student.id),
      context.deps.students.getActiveScoringModel(context.workspace.id),
    ]);
    const weights = resolveWeights(context.input.weights ?? context.settings.weights ?? activeModel?.weights ?? undefined);
    const score = computePortfolioScore(student, achievements, metrics, weights);
    const signals = context.input.includeRiskSignals ? detectWorkloadSignals(achievements, metrics) : [];
    const evidence: EvidenceCandidate[] = achievements.map((achievement, index) => ({
      key: evidenceKey(index),
      sourceType: "calculated_metric",
      documentId: achievement.document_id ?? undefined,
      title: `${achievement.title} [${achievement.verification_status}]`,
      locator: { section: "achievement", achievementId: achievement.id },
      excerpt: truncate(`${achievement.title}${achievement.issuer ? ` — ${achievement.issuer}` : ""}${achievement.achievement_date ? ` (${achievement.achievement_date})` : ""}. Category ${achievement.category}, level ${achievement.level ?? "unspecified"}, verification ${achievement.verification_status}.${achievement.description ? ` ${achievement.description}` : ""}`, 600),
      metadata: { achievementId: achievement.id, verificationStatus: achievement.verification_status, category: achievement.category },
    }));
    evidence.push(metricEvidence(evidenceKey(evidence.length), "Deterministic merit score", `Total ${score.totalScore}/100 (${score.version}). ${score.breakdown.map((item) => `${item.dimension}: ${item.weightedScore}/${item.weight} — ${item.explanation}`).join(" ")}`, { score }));
    const documents = await collectDocumentEvidence(context, ["certificate transcript achievement"], { limit: 8, startIndex: evidence.length });
    evidence.push(...documents.evidence);
    const limitations: string[] = [];
    const unverified = achievements.filter((item) => item.verification_status === "unverified" || item.verification_status === "extracted").length;
    if (unverified > 0) limitations.push(`${unverified} achievements are unverified or only OCR-extracted and receive reduced credit.`);
    if (achievements.length === 0) limitations.push("No achievements recorded; the score reflects CGPA and consistency only.");
    if (student.consent_status !== "granted") limitations.push(`Student consent status is "${student.consent_status}"; confirm consent before sharing this portfolio.`);
    return { ...context, evidence, extra: { student, achievements, metrics, score, signals }, limitations, retrieval: documents.retrieval, externalSources: {} };
  }

  async execute(context: CollectedContext<StudentPortfolioInput, Extra>): Promise<HandlerResult<StudentPortfolioOutput>> {
    const { extra } = context;
    const scoreKey = evidenceKey(extra.achievements.length);
    const findings = [
      measuredFinding(`Merit score ${extra.score.totalScore}/100`, extra.score.breakdown.map((item) => `${item.dimension} ${item.weightedScore}/${item.weight}`).join(", "), [scoreKey], { category: "score", metrics: { version: extra.score.version, weights: extra.score.weights, breakdown: extra.score.breakdown } }),
      ...extra.signals.map((signal) => ({
        title: `Workload observation: ${signal.signalType.replace(/_/g, " ")}`,
        summary: signal.description,
        confidence: "low" as const,
        limitations: ["Observation only; requires a human conversation and must not be treated as a diagnosis."],
        requiresHumanReview: true,
        category: "workload_signal",
        metrics: { severity: signal.severity, sourceKind: "data_derived_pattern" },
        evidence: [{ key: scoreKey, relation: "context" as const }],
      })),
    ];
    let strengths: StudentPortfolioOutput["strengths"] = [];
    let growthAreas: StudentPortfolioOutput["growthAreas"] = [];
    let limitations = context.limitations;
    const modelCalls = [];
    if (extra.achievements.length > 0) {
      const response = await runPrompt(context, studentPortfolioPrompt, { scoreBreakdown: JSON.stringify(extra.score.breakdown), evidence: context.evidence }, outputSchema);
      strengths = response.data.strengths;
      growthAreas = response.data.growthAreas;
      limitations = response.data.limitations;
      modelCalls.push(response.model);
      findings.push(...response.data.findings.map((finding) => toFindingDraft(finding, "narrative")));
    }
    const output: StudentPortfolioOutput = {
      student: { id: extra.student.id, displayName: extra.student.display_name, program: extra.student.program, cohort: extra.student.cohort },
      score: extra.score,
      achievements: extra.achievements.map((achievement, index) => ({ id: achievement.id, title: achievement.title, category: achievement.category, level: achievement.level, verificationStatus: achievement.verification_status, date: achievement.achievement_date, evidenceKey: evidenceKey(index) })),
      strengths,
      growthAreas,
      workloadSignals: extra.signals,
    };
    const text = [
      `## Portfolio: ${extra.student.display_name}`,
      `Merit score **${extra.score.totalScore}/100** (${extra.score.version})`,
      ``,
      `| Dimension | Weight | Raw | Weighted |`,
      `|---|---|---|---|`,
      ...extra.score.breakdown.map((item) => `| ${item.dimension} | ${item.weight} | ${item.rawScore} | ${item.weightedScore} |`),
      ``,
      `### Achievements`,
      ...output.achievements.map((item) => `- [${item.evidenceKey}] ${item.title} — ${item.category}/${item.level ?? "unspecified"} (${item.verificationStatus})`),
      ``,
      `### Strengths`,
      ...strengths.map((item) => `- **${item.dimension}**: ${item.summary} [${item.evidenceKeys.join(", ")}]`),
      ``,
      `### Growth areas`,
      ...growthAreas.map((item) => `- **${item.dimension}**: ${item.summary}`),
      ...(extra.signals.length > 0 ? [``, `### Workload observations (human review required)`, ...extra.signals.map((signal) => `- ${signal.description}`)] : []),
    ].join("\n");
    return { findings, artifacts: [{ type: "portfolio", title: `Portfolio — ${extra.student.display_name}`, content: output as unknown as Record<string, unknown>, contentText: text }], output, confidence: overallConfidence(findings), limitations, modelCalls, promptVersion: this.promptVersion };
  }

  async persist(context: PersistContext<HandlerResult<StudentPortfolioOutput>, StudentPortfolioInput, Extra>): Promise<void> {
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    const activeModel = await context.deps.students.getActiveScoringModel(context.workspace.id);
    await context.deps.students.insertScore({ ...tenant, student_id: context.extra.student.id, analysis_id: context.analysis.id, scoring_model_id: activeModel?.id ?? null, scoring_model_version: context.extra.score.version, total_score: context.extra.score.totalScore, component_scores: { weights: context.extra.score.weights, breakdown: context.extra.score.breakdown } as unknown as Json, calculated_at: new Date().toISOString() });
    if (context.extra.signals.length > 0) {
      await context.deps.students.insertRiskSignals(context.extra.signals.map((signal) => ({ ...tenant, student_id: context.extra.student.id, analysis_id: context.analysis.id, signal_type: signal.signalType, severity: signal.severity, description: signal.description, evidence: signal.evidence as Json, requires_human_review: true, reviewed_at: null, reviewed_by: null })));
    }
  }
}
