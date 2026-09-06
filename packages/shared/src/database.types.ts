/**
 * Database contract for Pedago AI.
 *
 * This file mirrors the schema defined in supabase/migrations/ and prompts/DATABASE_BUILD_PROMPT.md.
 * Embedding dimension: 1536 (text-embedding-3-small compatible).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "system_admin" | "faculty" | "student" | "reviewer";
export type WorkspaceRole = "owner" | "admin" | "faculty" | "reviewer";
export type ModuleKey = "research" | "teaching" | "assessment" | "student" | "curriculum";
export type AnalysisType =
  | "research_gap"
  | "research_evolution"
  | "research_question"
  | "research_decision"
  | "teaching_pulse"
  | "query_clustering"
  | "exam_misconception"
  | "student_portfolio"
  | "lor_dossier"
  | "curriculum_alignment";
export type AnalysisStatus =
  | "draft"
  | "queued"
  | "extracting"
  | "indexing"
  | "analyzing"
  | "completed"
  | "failed"
  | "cancelled";
export type DocumentStatus = "pending_upload" | "uploaded" | "extracting" | "ready" | "failed" | "deleted";
export type DocumentProcessingStatus = "pending" | "extracting" | "indexed" | "failed" | "ready";
export type DocumentKind =
  | "syllabus"
  | "lecture_slide"
  | "research_paper"
  | "teacher_note"
  | "exit_slip"
  | "query_export"
  | "quiz_result"
  | "question_paper"
  | "rubric"
  | "answer_script"
  | "itemized_marks"
  | "certificate"
  | "transcript"
  | "project_report"
  | "gradebook"
  | "job_dataset"
  | "other";
export type EvidenceSourceType = "document_chunk" | "research_work" | "external_dataset" | "calculated_metric";
export type ConfidenceLevel = "low" | "medium" | "high";
export type FindingConfidence = ConfidenceLevel;
export type VerificationStatus =
  | "extracted"
  | "student_submitted"
  | "issuer_verified"
  | "faculty_verified"
  | "unverified";
export type VerdictType = "supported" | "partially_supported" | "not_supported" | "insufficient_evidence";
export type ArtifactType =
  | "action_plan"
  | "warmup_quiz"
  | "broadcast"
  | "remedial_lesson"
  | "diagnostic_questions"
  | "research_report"
  | "portfolio"
  | "lor_dossier"
  | "lor_draft"
  | "curriculum_pack";
export type ArtifactStatus = "draft" | "faculty_edited" | "approved" | "exported";
export type InsightSourceKind =
  | "direct_student_feedback"
  | "teacher_observation"
  | "data_derived_pattern"
  | "ai_hypothesis";

export interface TenantColumns {
  id: string;
  organization_id: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

type DefaultKeys = "id" | "created_at" | "updated_at";
type Insertable<Row, Optional extends keyof Row = never> = Omit<Row, DefaultKeys | Optional> &
  Partial<Pick<Row, Extract<DefaultKeys | Optional, keyof Row>>>;
type Updatable<Row> = Partial<Row>;

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  department: string | null;
  designation: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberRow {
  id?: string;
  organization_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at?: string;
}

export interface WorkspaceRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  settings: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMemberRow {
  id?: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at?: string;
}

export interface CourseRow extends TenantColumns {
  code: string;
  title: string;
  term: string | null;
  academic_year: string | null;
  description: string | null;
}

export interface CourseTopicRow extends TenantColumns {
  course_id: string;
  parent_topic_id: string | null;
  title: string;
  description: string | null;
  sequence_number: number;
  learning_outcomes: string[];
}

export interface DocumentRow extends TenantColumns {
  course_id: string | null;
  kind: DocumentKind;
  title: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  storage_bucket: string;
  storage_path: string;
  status: DocumentStatus;
  content_hash: string | null;
  language: string | null;
  extraction_error_code: string | null;
  retention_until: string | null;
  contains_personal_data: boolean;
  deleted_at: string | null;
}

export interface DocumentExtractionRow extends TenantColumns {
  document_id: string;
  extractor: string;
  extractor_version: string;
  text_content: string;
  metadata: Json;
  started_at: string;
  completed_at: string | null;
  error_code: string | null;
  error_message_safe: string | null;
}

export interface DocumentChunkRow extends TenantColumns {
  document_id: string;
  extraction_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  locator: Json;
  metadata: Json;
  embedding: number[] | null;
}

export interface AnalysisRow extends TenantColumns {
  type: AnalysisType;
  module: ModuleKey;
  title: string;
  status: AnalysisStatus;
  input: Json;
  settings: Json;
  progress: number;
  current_step: string | null;
  attempt_count: number;
  idempotency_key: string | null;
  prompt_version: string | null;
  model_provider: string | null;
  model_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  failure_code: string | null;
  failure_message_safe: string | null;
  approved_at: string | null;
  approved_by: string | null;
  result: Json | null;
  provenance: Json | null;
}

export interface AnalysisDocumentRow {
  analysis_id: string;
  document_id: string;
  purpose: string;
}

export interface AnalysisEventRow {
  id: string;
  organization_id: string;
  workspace_id: string;
  analysis_id: string;
  status: AnalysisStatus;
  progress: number;
  message: string;
  metadata: Json;
  created_at: string;
}

export interface FindingRow extends TenantColumns {
  analysis_id: string;
  title: string;
  summary: string;
  confidence: ConfidenceLevel;
  limitations: string[];
  requires_human_review: boolean;
  category: string;
  metrics: Json;
  sort_order: number;
}

export interface EvidenceItemRow extends TenantColumns {
  analysis_id: string;
  source_type: EvidenceSourceType;
  document_chunk_id: string | null;
  research_work_id: string | null;
  external_source_url: string | null;
  title: string;
  locator: Json;
  excerpt: string;
  published_year: number | null;
  metadata: Json;
}

export interface FindingEvidenceRow {
  finding_id: string;
  evidence_item_id: string;
  relation: "supports" | "contradicts" | "context";
}

export interface ArtifactRow extends TenantColumns {
  analysis_id: string;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  content: Json;
  content_text: string;
  version: number;
  approved_at: string | null;
  approved_by: string | null;
  exported_at: string | null;
}

export interface ArtifactVersionRow {
  id: string;
  organization_id: string;
  workspace_id: string;
  artifact_id: string;
  version: number;
  content: Json;
  content_text: string;
  edited_by: string;
  created_at: string;
}

export interface ResearchQueryRow extends TenantColumns {
  analysis_id: string;
  query_text: string;
  source: string;
  filters: Json;
  executed_at: string;
  result_count: number;
  error_code: string | null;
}

export interface ResearchWorkRow {
  id: string;
  normalized_key: string;
  source: string;
  external_id: string;
  doi: string | null;
  title: string;
  abstract: string | null;
  authors: Json;
  publication_year: number | null;
  venue: string | null;
  citation_count: number | null;
  source_url: string;
  retrieved_at: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResearchWorkRow {
  analysis_id: string;
  research_work_id: string;
  relevance_score: number;
  relationship: "supporting" | "contradicting" | "closest" | "context";
}

export interface ResearchTrendPointRow extends TenantColumns {
  analysis_id: string;
  year: number;
  dimension: string;
  label: string;
  value: number;
  sample_size: number;
  metadata: Json;
}

export interface ResearchDecisionOptionRow extends TenantColumns {
  analysis_id: string;
  label: string;
  description: string;
  criteria_scores: Json;
  weighted_score: number;
  rank: number;
}

export interface FeedbackEntryRow extends TenantColumns {
  course_id: string | null;
  document_id: string | null;
  analysis_id: string | null;
  source_kind: InsightSourceKind;
  content: string;
  is_anonymized: boolean;
  occurred_at: string | null;
  topic_id: string | null;
  sentiment_label: string | null;
  confusion_score: number | null;
}

export interface QueryMessageRow extends TenantColumns {
  course_id: string | null;
  document_id: string | null;
  analysis_id: string | null;
  external_message_id: string | null;
  anonymized_content: string;
  intent_kind: string;
  occurred_at: string | null;
  embedding: number[] | null;
}

export interface QueryClusterRow extends TenantColumns {
  analysis_id: string;
  label: string;
  description: string;
  intent_kind: string;
  message_count: number;
  course_topic_id: string | null;
  centroid: number[] | null;
}

export interface QueryClusterMemberRow {
  cluster_id: string;
  query_message_id: string;
  similarity: number;
}

export interface ExamRow extends TenantColumns {
  course_id: string | null;
  analysis_id: string | null;
  title: string;
  exam_date: string | null;
  total_marks: number | null;
}

export interface ExamQuestionRow extends TenantColumns {
  exam_id: string;
  question_number: string;
  prompt: string;
  maximum_marks: number;
  course_topic_id: string | null;
  rubric: Json;
}

export interface StudentResponseRow extends TenantColumns {
  exam_question_id: string;
  student_id: string | null;
  anonymous_subject_key: string | null;
  response_text: string | null;
  awarded_marks: number;
  feedback: string | null;
}

export interface MisconceptionClusterRow extends TenantColumns {
  analysis_id: string;
  exam_question_id: string;
  label: string;
  description: string;
  response_count: number;
  error_rate: number;
  root_cause_hypothesis: string | null;
  confidence: ConfidenceLevel;
  course_topic_id: string | null;
}

export interface StudentRow extends TenantColumns {
  external_student_id: string;
  display_name: string;
  email: string | null;
  program: string | null;
  cohort: string | null;
  cgpa: number | null;
  consent_status: string;
  retention_until: string | null;
  deleted_at: string | null;
}

export interface AchievementRow extends TenantColumns {
  student_id: string;
  document_id: string | null;
  title: string;
  issuer: string | null;
  achievement_date: string | null;
  category: string;
  level: string | null;
  description: string | null;
  verification_status: VerificationStatus;
  verification_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  extracted_fields: Json;
}

export interface StudentActivityMetricRow extends TenantColumns {
  student_id: string;
  period_start: string;
  period_end: string;
  metric: string;
  value: number;
  source_document_id: string | null;
}

export interface ScoringModelRow extends TenantColumns {
  name: string;
  version: number;
  weights: Json;
  is_active: boolean;
}

export interface StudentScoreRow extends TenantColumns {
  student_id: string;
  analysis_id: string;
  scoring_model_id: string | null;
  scoring_model_version: string;
  total_score: number;
  component_scores: Json;
  calculated_at: string;
}

export interface StudentRiskSignalRow extends TenantColumns {
  student_id: string;
  analysis_id: string;
  signal_type: string;
  severity: "low" | "medium" | "high";
  description: string;
  evidence: Json;
  requires_human_review: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface TargetProgramRow extends TenantColumns {
  name: string;
  institution: string | null;
  program_type: string | null;
  requirements: Json;
  source_url: string | null;
}

export interface LorRequestRow extends TenantColumns {
  student_id: string;
  target_program_id: string | null;
  analysis_id: string;
  status: string;
  deadline: string | null;
  faculty_notes: string | null;
}

export interface IndustrySourceRow {
  id: string;
  organization_id: string | null;
  workspace_id: string | null;
  key: string;
  name: string;
  source_type: string;
  source_url: string | null;
  terms_url: string | null;
  retrieved_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface IndustrySkillObservationRow extends TenantColumns {
  source_id: string;
  dataset_document_id: string | null;
  sector: string;
  skill: string;
  normalized_skill: string;
  frequency: number;
  sample_size: number;
  observed_at: string;
  metadata: Json;
}

export interface CurriculumSkillMappingRow extends TenantColumns {
  analysis_id: string;
  course_topic_id: string | null;
  skill: string;
  classification: "current" | "legacy" | "missing";
  coverage_score: number;
  demand_score: number;
  evidence_count: number;
  rationale: string;
}

export interface CurriculumRecommendationRow extends TenantColumns {
  analysis_id: string;
  priority: number;
  title: string;
  rationale: string;
  estimated_hours: number | null;
  placement: string | null;
  recommendation_type: string;
  content: Json;
}

export interface AuditEventRow {
  id: string;
  organization_id: string | null;
  workspace_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  request_id: string | null;
  metadata: Json;
  created_at: string;
}

export interface ConsentRecordRow extends TenantColumns {
  student_id: string;
  purpose: string;
  status: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  metadata: Json;
}

export interface RetentionJobRow {
  id: string;
  organization_id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  scheduled_for: string;
  status: string;
  completed_at: string | null;
  failure_code: string | null;
  created_at: string;
}

/** Backend-owned table used to make analysis creation and export operations idempotent. */
export interface IdempotencyKeyRow {
  id: string;
  workspace_id: string;
  user_id: string;
  scope: string;
  key: string;
  request_hash: string;
  response: Json;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Insertable<ProfileRow, never>; Update: Updatable<ProfileRow> };
      organizations: { Row: OrganizationRow; Insert: Insertable<OrganizationRow>; Update: Updatable<OrganizationRow> };
      organization_members: { Row: OrganizationMemberRow; Insert: Insertable<OrganizationMemberRow>; Update: Updatable<OrganizationMemberRow> };
      workspaces: { Row: WorkspaceRow; Insert: Insertable<WorkspaceRow, "description" | "settings">; Update: Updatable<WorkspaceRow> };
      workspace_members: { Row: WorkspaceMemberRow; Insert: Insertable<WorkspaceMemberRow>; Update: Updatable<WorkspaceMemberRow> };
      courses: { Row: CourseRow; Insert: Insertable<CourseRow, "term" | "academic_year" | "description">; Update: Updatable<CourseRow> };
      course_topics: {
        Row: CourseTopicRow;
        Insert: Insertable<CourseTopicRow, "parent_topic_id" | "description" | "learning_outcomes">;
        Update: Updatable<CourseTopicRow>;
      };
      documents: {
        Row: DocumentRow;
        Insert: Insertable<
          DocumentRow,
          | "course_id"
          | "content_hash"
          | "language"
          | "extraction_error_code"
          | "retention_until"
          | "contains_personal_data"
          | "deleted_at"
        >;
        Update: Updatable<DocumentRow>;
      };
      document_extractions: {
        Row: DocumentExtractionRow;
        Insert: Insertable<DocumentExtractionRow, "completed_at" | "error_code" | "error_message_safe" | "metadata">;
        Update: Updatable<DocumentExtractionRow>;
      };
      document_chunks: { Row: DocumentChunkRow; Insert: Insertable<DocumentChunkRow, "metadata" | "embedding">; Update: Updatable<DocumentChunkRow> };
      analyses: {
        Row: AnalysisRow;
        Insert: Insertable<
          AnalysisRow,
          | "progress"
          | "current_step"
          | "attempt_count"
          | "idempotency_key"
          | "prompt_version"
          | "model_provider"
          | "model_name"
          | "started_at"
          | "completed_at"
          | "failure_code"
          | "failure_message_safe"
          | "approved_at"
          | "approved_by"
          | "result"
          | "provenance"
        >;
        Update: Updatable<AnalysisRow>;
      };
      analysis_documents: { Row: AnalysisDocumentRow; Insert: AnalysisDocumentRow; Update: Updatable<AnalysisDocumentRow> };
      analysis_events: { Row: AnalysisEventRow; Insert: Insertable<AnalysisEventRow, "metadata">; Update: Updatable<AnalysisEventRow> };
      findings: { Row: FindingRow; Insert: Insertable<FindingRow, "metrics" | "sort_order">; Update: Updatable<FindingRow> };
      evidence_items: {
        Row: EvidenceItemRow;
        Insert: Insertable<
          EvidenceItemRow,
          "document_chunk_id" | "research_work_id" | "external_source_url" | "published_year" | "metadata"
        >;
        Update: Updatable<EvidenceItemRow>;
      };
      finding_evidence: { Row: FindingEvidenceRow; Insert: FindingEvidenceRow; Update: Updatable<FindingEvidenceRow> };
      artifacts: {
        Row: ArtifactRow;
        Insert: Insertable<ArtifactRow, "version" | "approved_at" | "approved_by" | "exported_at">;
        Update: Updatable<ArtifactRow>;
      };
      artifact_versions: { Row: ArtifactVersionRow; Insert: Insertable<ArtifactVersionRow>; Update: Updatable<ArtifactVersionRow> };
      research_queries: { Row: ResearchQueryRow; Insert: Insertable<ResearchQueryRow, "error_code" | "filters">; Update: Updatable<ResearchQueryRow> };
      research_works: {
        Row: ResearchWorkRow;
        Insert: Insertable<
          ResearchWorkRow,
          "doi" | "abstract" | "publication_year" | "venue" | "citation_count" | "metadata"
        >;
        Update: Updatable<ResearchWorkRow>;
      };
      analysis_research_works: { Row: AnalysisResearchWorkRow; Insert: AnalysisResearchWorkRow; Update: Updatable<AnalysisResearchWorkRow> };
      research_trend_points: { Row: ResearchTrendPointRow; Insert: Insertable<ResearchTrendPointRow, "metadata">; Update: Updatable<ResearchTrendPointRow> };
      research_decision_options: { Row: ResearchDecisionOptionRow; Insert: Insertable<ResearchDecisionOptionRow>; Update: Updatable<ResearchDecisionOptionRow> };
      feedback_entries: {
        Row: FeedbackEntryRow;
        Insert: Insertable<
          FeedbackEntryRow,
          | "course_id"
          | "document_id"
          | "analysis_id"
          | "occurred_at"
          | "topic_id"
          | "sentiment_label"
          | "confusion_score"
          | "is_anonymized"
        >;
        Update: Updatable<FeedbackEntryRow>;
      };
      query_messages: {
        Row: QueryMessageRow;
        Insert: Insertable<
          QueryMessageRow,
          "course_id" | "document_id" | "analysis_id" | "external_message_id" | "occurred_at" | "embedding"
        >;
        Update: Updatable<QueryMessageRow>;
      };
      query_clusters: {
        Row: QueryClusterRow;
        Insert: Insertable<QueryClusterRow, "course_topic_id" | "centroid">;
        Update: Updatable<QueryClusterRow>;
      };
      query_cluster_members: { Row: QueryClusterMemberRow; Insert: QueryClusterMemberRow; Update: Updatable<QueryClusterMemberRow> };
      exams: { Row: ExamRow; Insert: Insertable<ExamRow, "course_id" | "analysis_id" | "exam_date" | "total_marks">; Update: Updatable<ExamRow> };
      exam_questions: { Row: ExamQuestionRow; Insert: Insertable<ExamQuestionRow, "course_topic_id" | "rubric">; Update: Updatable<ExamQuestionRow> };
      student_responses: {
        Row: StudentResponseRow;
        Insert: Insertable<StudentResponseRow, "student_id" | "anonymous_subject_key" | "response_text" | "feedback">;
        Update: Updatable<StudentResponseRow>;
      };
      misconception_clusters: {
        Row: MisconceptionClusterRow;
        Insert: Insertable<MisconceptionClusterRow, "root_cause_hypothesis" | "course_topic_id">;
        Update: Updatable<MisconceptionClusterRow>;
      };
      students: {
        Row: StudentRow;
        Insert: Insertable<
          StudentRow,
          "email" | "program" | "cohort" | "cgpa" | "consent_status" | "retention_until" | "deleted_at"
        >;
        Update: Updatable<StudentRow>;
      };
      achievements: {
        Row: AchievementRow;
        Insert: Insertable<
          AchievementRow,
          | "document_id"
          | "issuer"
          | "achievement_date"
          | "level"
          | "description"
          | "verification_url"
          | "verified_at"
          | "verified_by"
          | "extracted_fields"
        >;
        Update: Updatable<AchievementRow>;
      };
      student_activity_metrics: {
        Row: StudentActivityMetricRow;
        Insert: Insertable<StudentActivityMetricRow, "source_document_id">;
        Update: Updatable<StudentActivityMetricRow>;
      };
      scoring_models: { Row: ScoringModelRow; Insert: Insertable<ScoringModelRow, "is_active">; Update: Updatable<ScoringModelRow> };
      student_scores: { Row: StudentScoreRow; Insert: Insertable<StudentScoreRow, "scoring_model_id">; Update: Updatable<StudentScoreRow> };
      student_risk_signals: {
        Row: StudentRiskSignalRow;
        Insert: Insertable<StudentRiskSignalRow, "requires_human_review" | "reviewed_at" | "reviewed_by">;
        Update: Updatable<StudentRiskSignalRow>;
      };
      target_programs: {
        Row: TargetProgramRow;
        Insert: Insertable<TargetProgramRow, "institution" | "program_type" | "source_url">;
        Update: Updatable<TargetProgramRow>;
      };
      lor_requests: {
        Row: LorRequestRow;
        Insert: Insertable<LorRequestRow, "target_program_id" | "deadline" | "faculty_notes">;
        Update: Updatable<LorRequestRow>;
      };
      industry_sources: {
        Row: IndustrySourceRow;
        Insert: Insertable<
          IndustrySourceRow,
          "organization_id" | "workspace_id" | "source_url" | "terms_url" | "retrieved_at" | "metadata"
        >;
        Update: Updatable<IndustrySourceRow>;
      };
      industry_skill_observations: {
        Row: IndustrySkillObservationRow;
        Insert: Insertable<IndustrySkillObservationRow, "dataset_document_id" | "metadata">;
        Update: Updatable<IndustrySkillObservationRow>;
      };
      curriculum_skill_mappings: {
        Row: CurriculumSkillMappingRow;
        Insert: Insertable<CurriculumSkillMappingRow, "course_topic_id">;
        Update: Updatable<CurriculumSkillMappingRow>;
      };
      curriculum_recommendations: {
        Row: CurriculumRecommendationRow;
        Insert: Insertable<CurriculumRecommendationRow, "estimated_hours" | "placement">;
        Update: Updatable<CurriculumRecommendationRow>;
      };
      audit_events: {
        Row: AuditEventRow;
        Insert: Insertable<
          AuditEventRow,
          "organization_id" | "workspace_id" | "actor_id" | "entity_id" | "request_id" | "metadata"
        >;
        Update: Updatable<AuditEventRow>;
      };
      consent_records: {
        Row: ConsentRecordRow;
        Insert: Insertable<ConsentRecordRow, "granted_at" | "withdrawn_at" | "metadata">;
        Update: Updatable<ConsentRecordRow>;
      };
      retention_jobs: {
        Row: RetentionJobRow;
        Insert: Insertable<RetentionJobRow, "completed_at" | "failure_code" | "status">;
        Update: Updatable<RetentionJobRow>;
      };
      idempotency_keys: { Row: IdempotencyKeyRow; Insert: Insertable<IdempotencyKeyRow>; Update: Updatable<IdempotencyKeyRow> };
    };
    Functions: {
      is_organization_member: {
        Args: { org_id: string; user_id: string };
        Returns: boolean;
      };
      is_workspace_member: {
        Args: { ws_id: string; user_id: string };
        Returns: boolean;
      };
      match_document_chunks: {
        Args: {
          p_workspace_id: string;
          p_query_embedding: number[];
          p_match_count: number;
          p_document_ids?: string[] | null;
        };
        Returns: Array<DocumentChunkRow & { similarity: number }>;
      };
    };
    Enums: {
      user_role: UserRole;
      workspace_role: WorkspaceRole;
      module_key: ModuleKey;
      analysis_type: AnalysisType;
      analysis_status: AnalysisStatus;
      finding_confidence: FindingConfidence;
      verification_status: VerificationStatus;
      document_processing_status: DocumentProcessingStatus;
      verdict_type: VerdictType;
    };
  };
}

export type TableName = keyof Database["public"]["Tables"];
export type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends TableName> = Database["public"]["Tables"][T]["Update"];

export const EMBEDDING_DIMENSION = 1536;
