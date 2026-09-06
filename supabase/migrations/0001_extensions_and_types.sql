-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Workspace roles
CREATE TYPE workspace_role AS ENUM (
  'owner',
  'admin',
  'faculty',
  'reviewer'
);

-- Module keys
CREATE TYPE module_key AS ENUM (
  'research',
  'teaching',
  'assessment',
  'student',
  'curriculum'
);

-- Analysis types
CREATE TYPE analysis_type AS ENUM (
  'research_gap',
  'research_evolution',
  'research_question',
  'research_decision',
  'teaching_pulse',
  'query_clustering',
  'exam_misconception',
  'student_portfolio',
  'lor_dossier',
  'curriculum_alignment'
);

-- Analysis status
CREATE TYPE analysis_status AS ENUM (
  'draft',
  'queued',
  'extracting',
  'indexing',
  'analyzing',
  'completed',
  'failed',
  'cancelled'
);

-- Document status
CREATE TYPE document_status AS ENUM (
  'pending_upload',
  'uploaded',
  'extracting',
  'ready',
  'failed',
  'deleted'
);

-- Document kind
CREATE TYPE document_kind AS ENUM (
  'syllabus',
  'lecture_slide',
  'research_paper',
  'teacher_note',
  'exit_slip',
  'query_export',
  'quiz_result',
  'question_paper',
  'rubric',
  'answer_script',
  'itemized_marks',
  'certificate',
  'transcript',
  'project_report',
  'gradebook',
  'job_dataset',
  'other'
);

-- Evidence source type
CREATE TYPE evidence_source_type AS ENUM (
  'document_chunk',
  'research_work',
  'external_dataset',
  'calculated_metric'
);

-- Confidence level
CREATE TYPE confidence_level AS ENUM (
  'low',
  'medium',
  'high'
);

-- Verification status
CREATE TYPE verification_status AS ENUM (
  'extracted',
  'student_submitted',
  'issuer_verified',
  'faculty_verified',
  'unverified'
);

-- Artifact type
CREATE TYPE artifact_type AS ENUM (
  'action_plan',
  'warmup_quiz',
  'broadcast',
  'remedial_lesson',
  'diagnostic_questions',
  'research_report',
  'portfolio',
  'lor_dossier',
  'lor_draft',
  'curriculum_pack'
);

-- Artifact status
CREATE TYPE artifact_status AS ENUM (
  'draft',
  'faculty_edited',
  'approved',
  'exported'
);

-- Feedback source kind
CREATE TYPE feedback_source_kind AS ENUM (
  'direct_student_feedback',
  'teacher_observation',
  'data_derived_pattern',
  'ai_hypothesis'
);

-- Relationship types for evidence
CREATE TYPE evidence_relation AS ENUM (
  'supports',
  'contradicts',
  'context'
);

-- Research work relationships
CREATE TYPE research_relationship AS ENUM (
  'supporting',
  'contradicting',
  'closest',
  'context'
);

-- Curriculum classification
CREATE TYPE curriculum_classification AS ENUM (
  'current',
  'legacy',
  'missing'
);
