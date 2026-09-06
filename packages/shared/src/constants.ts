export const moduleKeys = ["research", "teaching", "assessment", "student", "curriculum"] as const;
export type ModuleKey = (typeof moduleKeys)[number];

export const analysisTypes = [
  "research_gap",
  "research_evolution",
  "research_question",
  "research_decision",
  "teaching_pulse",
  "query_clustering",
  "exam_misconception",
  "student_portfolio",
  "lor_dossier",
  "curriculum_alignment",
] as const;
export type AnalysisType = (typeof analysisTypes)[number];

export const analysisStatuses = [
  "draft",
  "queued",
  "extracting",
  "indexing",
  "analyzing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type AnalysisStatus = (typeof analysisStatuses)[number];

export const workspaceRoles = ["owner", "admin", "faculty", "reviewer"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];

export const documentStatuses = [
  "pending_upload",
  "uploaded",
  "extracting",
  "ready",
  "failed",
  "deleted",
] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

export const documentKinds = [
  "syllabus",
  "lecture_slide",
  "research_paper",
  "teacher_note",
  "exit_slip",
  "query_export",
  "quiz_result",
  "question_paper",
  "rubric",
  "answer_script",
  "itemized_marks",
  "certificate",
  "transcript",
  "project_report",
  "gradebook",
  "job_dataset",
  "other",
] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const evidenceSourceTypes = [
  "document_chunk",
  "research_work",
  "external_dataset",
  "calculated_metric",
] as const;
export type EvidenceSourceType = (typeof evidenceSourceTypes)[number];

export const confidenceLevels = ["low", "medium", "high"] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const verificationStatuses = [
  "extracted",
  "student_submitted",
  "issuer_verified",
  "faculty_verified",
  "unverified",
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const artifactTypes = [
  "action_plan",
  "warmup_quiz",
  "broadcast",
  "remedial_lesson",
  "diagnostic_questions",
  "research_report",
  "portfolio",
  "lor_dossier",
  "lor_draft",
  "curriculum_pack",
] as const;
export type ArtifactType = (typeof artifactTypes)[number];

export const artifactStatuses = ["draft", "faculty_edited", "approved", "exported"] as const;
export type ArtifactStatus = (typeof artifactStatuses)[number];

export const insightSourceKinds = [
  "direct_student_feedback",
  "teacher_observation",
  "data_derived_pattern",
  "ai_hypothesis",
] as const;
export type InsightSourceKind = (typeof insightSourceKinds)[number];

export const gapVerdicts = [
  "supported",
  "partially_supported",
  "not_supported",
  "insufficient_evidence",
] as const;
export type GapVerdict = (typeof gapVerdicts)[number];

export const skillClassifications = ["current", "legacy", "missing"] as const;
export type SkillClassification = (typeof skillClassifications)[number];

export const analysisModules: Record<AnalysisType, ModuleKey> = {
  research_gap: "research",
  research_evolution: "research",
  research_question: "research",
  research_decision: "research",
  teaching_pulse: "teaching",
  query_clustering: "teaching",
  exam_misconception: "assessment",
  student_portfolio: "student",
  lor_dossier: "student",
  curriculum_alignment: "curriculum",
};

export const terminalAnalysisStatuses: readonly AnalysisStatus[] = ["completed", "failed", "cancelled"];

export const analysisStatusTransitions: Record<AnalysisStatus, readonly AnalysisStatus[]> = {
  draft: ["queued", "cancelled"],
  queued: ["extracting", "failed", "cancelled"],
  extracting: ["indexing", "failed", "cancelled"],
  indexing: ["analyzing", "failed", "cancelled"],
  analyzing: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

export const defaultPortfolioWeights = {
  academic: 35,
  technical: 20,
  leadership: 15,
  service: 15,
  sportsCultural: 10,
  consistency: 5,
} as const;

export const defaultResearchDecisionWeights = {
  noveltyEvidence: 25,
  feasibility: 20,
  dataAvailability: 15,
  methodFit: 15,
  expectedContribution: 15,
  risk: 10,
} as const;

export const storageBuckets = {
  academicDocuments: "academic-documents",
  studentEvidence: "student-evidence",
  audioNotes: "audio-notes",
  generatedExports: "generated-exports",
} as const;
export type StorageBucket = (typeof storageBuckets)[keyof typeof storageBuckets];

export const apiErrorCodes = [
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "UPLOAD_INVALID",
  "DOCUMENT_PROCESSING_FAILED",
  "PROVIDER_UNAVAILABLE",
  "AI_OUTPUT_INVALID",
  "ANALYSIS_FAILED",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;
export type ApiErrorCode = (typeof apiErrorCodes)[number];
