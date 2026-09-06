import { lorDossierInputSchema, type LorDossierInput } from "@pedago/shared";
import type { AchievementRow, StudentRow } from "@pedago/shared/database";
import { z } from "zod";
import { lorDossierPrompt } from "../../prompts/index.js";
import { AppError } from "../../utils/errors.js";
import { keywordOverlap, truncate } from "../../utils/text.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, EvidenceCandidate, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";

const outputSchema = z.object({
  claims: z.array(z.object({ text: z.string().min(1).max(800), evidenceKeys: z.array(z.string()).min(1).max(6) })).min(1).max(20),
  missingEvidence: z.array(z.object({ requirement: z.string().min(1).max(300), whatWouldHelp: z.string().min(1).max(400) })).max(20),
  outline: z.array(z.object({ section: z.string().min(1).max(120), bullets: z.array(z.string().min(1).max(400)).min(1).max(6) })).min(2).max(8),
  draft: z.string().min(50).max(12000),
  ...aiFindingsBlock,
});

export interface RequirementMatch {
  requirement: string;
  evidenceKeys: string[];
  strength: "strong" | "partial" | "missing";
  bestOverlap: number;
}

export interface LorDossierOutput {
  student: { id: string; displayName: string };
  program: LorDossierInput["targetProgram"];
  matrix: RequirementMatch[];
  claims: z.infer<typeof outputSchema>["claims"];
  missingEvidence: z.infer<typeof outputSchema>["missingEvidence"];
  outline: z.infer<typeof outputSchema>["outline"];
  coveragePercent: number;
  approvalRequired: true;
}

interface Extra {
  student: StudentRow;
  achievements: AchievementRow[];
  matrix: RequirementMatch[];
}

/** Deterministic requirement→evidence matrix by keyword overlap; the model may only narrate it. */
export function buildRequirementMatrix(requirements: string[], evidence: EvidenceCandidate[]): RequirementMatch[] {
  return requirements.map((requirement) => {
    const scored = evidence
      .map((item) => ({ key: item.key, overlap: keywordOverlap(requirement, `${item.title} ${item.excerpt}`) }))
      .filter((entry) => entry.overlap >= 0.15)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 4);
    const best = scored[0]?.overlap ?? 0;
    return { requirement, evidenceKeys: scored.map((entry) => entry.key), strength: best >= 0.4 ? "strong" : best >= 0.15 ? "partial" : "missing", bestOverlap: Math.round(best * 1000) / 1000 };
  });
}

export class LorDossierHandler implements AnalysisHandler<LorDossierInput, HandlerResult<LorDossierOutput>, Extra> {
  readonly type = "lor_dossier" as const;
  readonly promptVersion = lorDossierPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): LorDossierInput {
    return lorDossierInputSchema.parse(input);
  }

  async collectContext(context: AnalysisContext<LorDossierInput>): Promise<CollectedContext<LorDossierInput, Extra>> {
    const student = await context.deps.students.getById(context.input.studentId);
    if (!student || student.workspace_id !== context.workspace.id) throw AppError.forbidden("Student does not belong to this workspace");
    const achievements = await context.deps.students.listAchievements(student.id);
    const scores = await context.deps.students.listScores(student.id);
    const evidence: EvidenceCandidate[] = achievements.map((achievement, index) => ({
      key: evidenceKey(index),
      sourceType: "calculated_metric",
      documentId: achievement.document_id ?? undefined,
      title: `${achievement.title} [${achievement.verification_status}]`,
      locator: { section: "achievement", achievementId: achievement.id },
      excerpt: truncate(`${achievement.title}${achievement.issuer ? ` — ${achievement.issuer}` : ""}${achievement.achievement_date ? ` (${achievement.achievement_date})` : ""}. ${achievement.category}, ${achievement.level ?? "unspecified"} level, ${achievement.verification_status}.${achievement.description ? ` ${achievement.description}` : ""}`, 600),
      metadata: { achievementId: achievement.id, verificationStatus: achievement.verification_status },
    }));
    if (student.cgpa !== null) evidence.push(metricEvidence(evidenceKey(evidence.length), "Academic record", `CGPA ${student.cgpa}${student.program ? `, ${student.program}` : ""}${student.cohort ? `, cohort ${student.cohort}` : ""}.`, { cgpa: student.cgpa }));
    if (scores[0]) evidence.push(metricEvidence(evidenceKey(evidence.length), "Latest merit score", `Merit score ${scores[0].total_score}/100 (${scores[0].scoring_model_version}) calculated ${scores[0].calculated_at.slice(0, 10)}.`, { analysisId: scores[0].analysis_id }));
    const documents = await collectDocumentEvidence(context, context.input.targetProgram.requirements.slice(0, 4), { limit: 10, startIndex: evidence.length });
    evidence.push(...documents.evidence);
    const matrix = buildRequirementMatrix(context.input.targetProgram.requirements, evidence);
    const limitations: string[] = [];
    const missing = matrix.filter((entry) => entry.strength === "missing");
    if (missing.length > 0) limitations.push(`${missing.length} of ${matrix.length} requirements have no matching evidence: ${missing.map((entry) => entry.requirement).join("; ")}.`);
    const unverified = achievements.filter((item) => item.verification_status !== "issuer_verified" && item.verification_status !== "faculty_verified").length;
    if (unverified > 0) limitations.push(`${unverified} achievements are not verified; the letter should not assert them as confirmed facts.`);
    if (student.consent_status !== "granted") limitations.push(`Student consent status is "${student.consent_status}".`);
    return { ...context, evidence, extra: { student, achievements, matrix }, limitations, retrieval: documents.retrieval, externalSources: {} };
  }

  async execute(context: CollectedContext<LorDossierInput, Extra>): Promise<HandlerResult<LorDossierOutput>> {
    const { extra, input } = context;
    const coveragePercent = Math.round((extra.matrix.filter((entry) => entry.strength !== "missing").length / Math.max(1, extra.matrix.length)) * 100);
    const matrixFindings = extra.matrix.map((entry) =>
      entry.strength === "missing"
        ? { title: `Missing evidence: ${entry.requirement}`, summary: "No stored evidence matches this requirement. Do not assert it in the letter without new evidence.", confidence: "high" as const, limitations: ["Keyword matching only; faculty may know of unrecorded evidence."], requiresHumanReview: true, category: "requirement_gap", metrics: { strength: entry.strength, sourceKind: "data_derived_pattern" }, evidence: [] }
        : measuredFinding(`Requirement ${entry.strength === "strong" ? "supported" : "partially supported"}: ${entry.requirement}`, `${entry.evidenceKeys.length} evidence items match (best overlap ${entry.bestOverlap}).`, entry.evidenceKeys, { category: "requirement_match", confidence: entry.strength === "strong" ? "high" : "medium", metrics: { strength: entry.strength, bestOverlap: entry.bestOverlap } }),
    );
    if (context.evidence.length === 0) {
      const output: LorDossierOutput = { student: { id: extra.student.id, displayName: extra.student.display_name }, program: input.targetProgram, matrix: extra.matrix, claims: [], missingEvidence: extra.matrix.map((entry) => ({ requirement: entry.requirement, whatWouldHelp: "Record verified achievements or upload supporting documents." })), outline: [], coveragePercent: 0, approvalRequired: true };
      return { findings: matrixFindings, artifacts: [], output, confidence: "low", limitations: ["No evidence available; a letter cannot be drafted responsibly."], modelCalls: [], promptVersion: this.promptVersion };
    }
    const response = await runPrompt(context, lorDossierPrompt, { programName: `${input.targetProgram.name}${input.targetProgram.institution ? ` — ${input.targetProgram.institution}` : ""}`, requirements: input.targetProgram.requirements, relationship: input.relationship, facultyNotes: input.facultyNotes, tone: input.tone, matrix: JSON.stringify(extra.matrix), evidence: context.evidence }, outputSchema);
    const data = response.data;
    const findings = [...matrixFindings, ...data.claims.map((claim) => measuredFinding(`Claim: ${truncate(claim.text, 80)}`, claim.text, claim.evidenceKeys, { category: "claim", confidence: "medium", limitations: ["Generated claim; verify wording against the cited evidence before approval."] })), ...data.findings.map((finding) => toFindingDraft(finding, "insight"))];
    const output: LorDossierOutput = { student: { id: extra.student.id, displayName: extra.student.display_name }, program: input.targetProgram, matrix: extra.matrix, claims: data.claims, missingEvidence: data.missingEvidence, outline: data.outline, coveragePercent, approvalRequired: true };
    const dossierText = [
      `## LOR evidence dossier — ${extra.student.display_name}`,
      `Target: ${input.targetProgram.name}. Requirement coverage: ${coveragePercent}%.`,
      ``,
      `| Requirement | Strength | Evidence |`,
      `|---|---|---|`,
      ...extra.matrix.map((entry) => `| ${entry.requirement.replace(/\|/g, "/")} | ${entry.strength} | ${entry.evidenceKeys.join(", ") || "—"} |`),
      ``,
      `### Claims`,
      ...data.claims.map((claim) => `- ${claim.text} [${claim.evidenceKeys.join(", ")}]`),
      ``,
      `### Missing evidence`,
      ...data.missingEvidence.map((item) => `- ${item.requirement}: ${item.whatWouldHelp}`),
      ``,
      `### Outline`,
      ...data.outline.flatMap((section) => [`**${section.section}**`, ...section.bullets.map((bullet) => `- ${bullet}`)]),
    ].join("\n");
    return {
      findings,
      artifacts: [
        { type: "lor_dossier", title: `LOR dossier — ${extra.student.display_name}`, content: output as unknown as Record<string, unknown>, contentText: dossierText },
        { type: "lor_draft", title: `LOR draft — ${extra.student.display_name} (${input.targetProgram.name})`, content: { tone: input.tone, claims: data.claims, approvalRequired: true }, contentText: `${data.draft}\n\n---\n_Draft generated with evidence citations [E#]. Faculty review and approval required before use._` },
      ],
      output,
      confidence: overallConfidence(findings),
      limitations: data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<LorDossierOutput>, LorDossierInput, Extra>): Promise<void> {
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    await context.deps.students.insertLorRequest({ ...tenant, student_id: context.extra.student.id, target_program_id: null, analysis_id: context.analysis.id, status: "draft", deadline: null, faculty_notes: context.input.facultyNotes ?? null });
  }
}
