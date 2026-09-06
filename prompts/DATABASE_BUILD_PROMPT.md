# Pedago AI Supabase Database Build Prompt

You are a senior PostgreSQL and Supabase architect. Build the complete persistence, authentication authorization, storage, vector-search, audit, and realtime foundation for **Pedago AI - Faculty Intelligence & Decision Copilot**.

Implement this contract under `supabase/` through ordered SQL migrations and repeatable seed data. Do not manually configure production-only behavior without a migration or documented environment step.

## 1. Required Platform

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- `pgvector`
- Supabase CLI migrations
- SQL-based tests for critical RLS behavior

Use UUID primary keys, `timestamptz`, foreign keys, check constraints, useful indexes, and Row-Level Security.

## 2. Repository Structure

```text
supabase/
|-- migrations/
|   |-- 0001_extensions_and_types.sql
|   |-- 0002_identity_and_workspaces.sql
|   |-- 0003_courses_and_documents.sql
|   |-- 0004_analyses_and_evidence.sql
|   |-- 0005_research.sql
|   |-- 0006_teaching_and_assessment.sql
|   |-- 0007_students_and_lor.sql
|   |-- 0008_curriculum.sql
|   |-- 0009_storage_and_rls.sql
|   |-- 0010_functions_indexes_realtime.sql
|   `-- 0011_retention_and_audit.sql
|-- tests/
|   |-- rls_workspace_isolation.sql
|   |-- storage_access.sql
|   |-- scoring_constraints.sql
|   `-- analysis_integrity.sql
|-- functions/
|-- seed.sql
`-- config.toml
```

Migrations must be forward-only and safe on a fresh database. Do not edit an already-applied migration; add another migration.

## 3. Extensions and Enums

Enable:

- `pgcrypto`
- `vector`
- `citext` if used for normalized email fields

Create enums or equivalent constrained text types for:

```text
workspace_role:
  owner, admin, faculty, reviewer

module_key:
  research, teaching, assessment, student, curriculum

analysis_type:
  research_gap
  research_evolution
  research_question
  research_decision
  teaching_pulse
  query_clustering
  exam_misconception
  student_portfolio
  lor_dossier
  curriculum_alignment

analysis_status:
  draft, queued, extracting, indexing, analyzing, completed, failed, cancelled

document_status:
  pending_upload, uploaded, extracting, ready, failed, deleted

document_kind:
  syllabus
  lecture_slide
  research_paper
  teacher_note
  exit_slip
  query_export
  quiz_result
  question_paper
  rubric
  answer_script
  itemized_marks
  certificate
  transcript
  project_report
  gradebook
  job_dataset
  other

evidence_source_type:
  document_chunk, research_work, external_dataset, calculated_metric

confidence_level:
  low, medium, high

verification_status:
  extracted, student_submitted, issuer_verified, faculty_verified, unverified

artifact_type:
  action_plan
  warmup_quiz
  broadcast
  remedial_lesson
  diagnostic_questions
  research_report
  portfolio
  lor_dossier
  lor_draft
  curriculum_pack

artifact_status:
  draft, faculty_edited, approved, exported
```

## 4. Shared Column Conventions

Most tenant-owned tables must include:

```sql
id uuid primary key default gen_random_uuid(),
organization_id uuid not null,
workspace_id uuid not null,
created_by uuid not null references auth.users(id),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Use `deleted_at timestamptz` only where soft deletion is required. Add an `updated_at` trigger to mutable tables.

Use explicit foreign-key deletion behavior. Avoid accidental cascade deletion of audit data or evidence needed for approved artifacts.

## 5. Identity, Organization, and Workspace Tables

### `profiles`

- `id` references `auth.users(id)` and is the primary key
- `display_name`
- `avatar_url`
- `institution`
- `department`
- `designation`
- timestamps

Create an Auth signup trigger to create a profile safely.

### `organizations`

- `id`
- `name`
- `slug` unique
- `created_by`
- timestamps

### `organization_members`

- `organization_id`
- `user_id`
- `role`
- timestamps
- composite unique key

### `workspaces`

- `id`
- `organization_id`
- `name`
- `slug`
- `description`
- `settings jsonb not null default '{}'`
- `created_by`
- timestamps
- unique `(organization_id, slug)`

### `workspace_members`

- `workspace_id`
- `user_id`
- `role`
- timestamps
- composite unique key

Create stable helper functions:

- `is_organization_member(organization_id uuid)`
- `is_workspace_member(workspace_id uuid)`
- `has_workspace_role(workspace_id uuid, roles workspace_role[])`

Functions used in RLS must be secure, schema-qualified, and protected from search-path attacks.

## 6. Course and Document Tables

### `courses`

- Tenant columns
- `code`
- `title`
- `term`
- `academic_year`
- `description`
- unique course identity within a workspace where appropriate

### `course_topics`

- Tenant columns
- `course_id`
- `parent_topic_id` nullable
- `title`
- `description`
- `sequence_number`
- `learning_outcomes text[]`

### `documents`

- Tenant columns
- `course_id` nullable
- `kind`
- `title`
- `original_filename`
- `mime_type`
- `byte_size`
- `storage_bucket`
- `storage_path`
- `status`
- `content_hash`
- `language`
- `extraction_error_code`
- `retention_until`
- `contains_personal_data boolean`
- `deleted_at`

Add uniqueness on active `(workspace_id, content_hash, kind)` where useful without preventing intentional reuse.

### `document_extractions`

- Tenant columns
- `document_id`
- `extractor`
- `extractor_version`
- `text_content`
- `metadata jsonb`
- `started_at`
- `completed_at`
- `error_code`
- `error_message_safe`

### `document_chunks`

- Tenant columns
- `document_id`
- `extraction_id`
- `chunk_index`
- `content`
- `token_count`
- `locator jsonb`
- `metadata jsonb`
- `embedding vector(<chosen_dimension>)`
- unique `(document_id, extraction_id, chunk_index)`

Choose one embedding dimension based on the configured embedding model and document it. Do not mix dimensions in one vector column.

Add an HNSW or IVFFlat index after evaluating the supported Supabase/Postgres version. All similarity functions must require `workspace_id` and filter before ranking.

## 7. Analysis, Finding, Evidence, and Artifact Tables

### `analyses`

- Tenant columns
- `type`
- `module`
- `title`
- `status`
- `input jsonb`
- `settings jsonb`
- `progress smallint` constrained from 0 to 100
- `current_step`
- `attempt_count`
- `idempotency_key`
- `prompt_version`
- `model_provider`
- `model_name`
- `started_at`
- `completed_at`
- `failure_code`
- `failure_message_safe`
- `approved_at`
- `approved_by`
- unique idempotency key scoped to workspace and creator

Add a constraint mapping each analysis type to the correct module.

### `analysis_documents`

- `analysis_id`
- `document_id`
- `purpose`
- composite primary key

### `analysis_events`

- `id`
- tenant identifiers
- `analysis_id`
- `status`
- `progress`
- `message`
- `metadata jsonb`
- `created_at`

Use this for progress history and Realtime updates. Do not include sensitive document text.

### `findings`

- Tenant columns
- `analysis_id`
- `title`
- `summary`
- `confidence`
- `limitations text[]`
- `requires_human_review`
- `category`
- `metrics jsonb`
- `sort_order`

### `evidence_items`

- Tenant columns
- `analysis_id`
- `source_type`
- `document_chunk_id` nullable
- `research_work_id` nullable
- `external_source_url` nullable
- `title`
- `locator jsonb`
- `excerpt`
- `published_year`
- `metadata jsonb`

Add a check constraint requiring a valid source locator for the selected source type.

### `finding_evidence`

- `finding_id`
- `evidence_item_id`
- `relation` such as `supports`, `contradicts`, or `context`
- composite primary key

### `artifacts`

- Tenant columns
- `analysis_id`
- `type`
- `status`
- `title`
- `content jsonb`
- `content_text`
- `version integer`
- `approved_at`
- `approved_by`
- `exported_at`

### `artifact_versions`

- `id`
- tenant identifiers
- `artifact_id`
- `version`
- `content jsonb`
- `content_text`
- `edited_by`
- `created_at`
- unique `(artifact_id, version)`

Faculty edits must create versions rather than destroy AI-generated originals.

## 8. Research Tables

### `research_queries`

- Tenant columns
- `analysis_id`
- `query_text`
- `source`
- `filters jsonb`
- `executed_at`
- `result_count`
- `error_code`

### `research_works`

- `id`
- normalized external identity
- `source`
- `external_id`
- `doi`
- `title`
- `abstract`
- `authors jsonb`
- `publication_year`
- `venue`
- `citation_count`
- `source_url`
- `retrieved_at`
- `metadata jsonb`

Use global deduplication where licensing and tenancy allow. Do not store copyrighted full text from external sources without permission.

### `analysis_research_works`

- `analysis_id`
- `research_work_id`
- `relevance_score`
- `relationship` such as supporting, contradicting, closest, or context
- composite primary key

### `research_trend_points`

- Tenant columns
- `analysis_id`
- `year`
- `dimension`
- `label`
- `value`
- `sample_size`
- `metadata jsonb`

### `research_decision_options`

- Tenant columns
- `analysis_id`
- `label`
- `description`
- `criteria_scores jsonb`
- `weighted_score`
- `rank`

Store the criterion weights in `analyses.settings`.

## 9. Teaching and Assessment Tables

### `feedback_entries`

- Tenant columns
- `course_id`
- `document_id` nullable
- `source_kind` constrained to:
  - `direct_student_feedback`
  - `teacher_observation`
  - `data_derived_pattern`
  - `ai_hypothesis`
- `content`
- `is_anonymized`
- `occurred_at`
- `topic_id` nullable
- `sentiment_label` nullable
- `confusion_score` nullable and constrained

Never copy an AI hypothesis into a direct-student-feedback row.

### `query_messages`

- Tenant columns
- `course_id`
- `document_id` nullable
- `external_message_id` nullable
- `anonymized_content`
- `intent_kind`
- `occurred_at`
- `embedding`

### `query_clusters`

- Tenant columns
- `analysis_id`
- `label`
- `description`
- `intent_kind`
- `message_count`
- `course_topic_id` nullable
- `centroid` nullable

### `query_cluster_members`

- `cluster_id`
- `query_message_id`
- `similarity`
- composite primary key

### `exams`

- Tenant columns
- `course_id`
- `title`
- `exam_date`
- `total_marks`

### `exam_questions`

- Tenant columns
- `exam_id`
- `question_number`
- `prompt`
- `maximum_marks`
- `course_topic_id` nullable
- `rubric jsonb`

### `student_responses`

- Tenant columns
- `exam_question_id`
- `student_id` nullable
- `anonymous_subject_key` nullable
- `response_text`
- `awarded_marks`
- `feedback`

Require either a student ID or anonymous subject key, but not both.

### `misconception_clusters`

- Tenant columns
- `analysis_id`
- `exam_question_id`
- `label`
- `description`
- `response_count`
- `error_rate`
- `root_cause_hypothesis`
- `confidence`
- `course_topic_id` nullable

Measured error rate and AI root-cause hypothesis must remain separate columns.

## 10. Student, Achievement, Merit, and LOR Tables

### `students`

- Tenant columns
- `external_student_id`
- `display_name`
- `email` nullable
- `program`
- `cohort`
- `cgpa` nullable
- `consent_status`
- `retention_until`
- unique external ID within a workspace

### `achievements`

- Tenant columns
- `student_id`
- `document_id` nullable
- `title`
- `issuer`
- `achievement_date`
- `category`
- `level`
- `description`
- `verification_status`
- `verification_url` nullable
- `verified_at` nullable
- `verified_by` nullable
- `extracted_fields jsonb`

OCR extraction must default to `extracted` or `unverified`, never `issuer_verified`.

### `student_activity_metrics`

- Tenant columns
- `student_id`
- `period_start`
- `period_end`
- `metric`
- `value`
- `source_document_id` nullable

### `scoring_models`

- Tenant columns
- `name`
- `version`
- `weights jsonb`
- `is_active`
- `created_by`

Validate that required weight values are numeric, non-negative, and total 100.

### `student_scores`

- Tenant columns
- `student_id`
- `analysis_id`
- `scoring_model_id`
- `total_score`
- `component_scores jsonb`
- `calculated_at`

### `student_risk_signals`

- Tenant columns
- `student_id`
- `analysis_id`
- `signal_type`
- `severity`
- `description`
- `evidence jsonb`
- `requires_human_review default true`
- `reviewed_at`
- `reviewed_by`

Do not store medical diagnoses.

### `target_programs`

- Tenant columns
- `name`
- `institution`
- `program_type`
- `requirements jsonb`
- `source_url`

### `lor_requests`

- Tenant columns
- `student_id`
- `target_program_id` nullable
- `analysis_id`
- `status`
- `deadline`
- `faculty_notes`

Claim evidence belongs in the generic findings/evidence relationship or a dedicated `artifact_claim_evidence` join table.

## 11. Curriculum Tables

### `industry_sources`

- Tenant columns where private; global where configured
- `name`
- `source_type`
- `source_url`
- `terms_url`
- `retrieved_at`
- `metadata jsonb`

### `industry_skill_observations`

- Tenant columns
- `source_id`
- `dataset_document_id` nullable
- `sector`
- `skill`
- `normalized_skill`
- `frequency`
- `sample_size`
- `observed_at`
- `metadata jsonb`

### `curriculum_skill_mappings`

- Tenant columns
- `analysis_id`
- `course_topic_id` nullable
- `skill`
- `classification` constrained to `current`, `legacy`, or `missing`
- `coverage_score`
- `demand_score`
- `evidence_count`
- `rationale`

### `curriculum_recommendations`

- Tenant columns
- `analysis_id`
- `priority`
- `title`
- `rationale`
- `estimated_hours`
- `placement`
- `recommendation_type`
- `content jsonb`

## 12. Audit, Consent, and Retention

### `audit_events`

- `id`
- `organization_id`
- `workspace_id`
- `actor_id`
- `action`
- `entity_type`
- `entity_id`
- `request_id`
- `metadata jsonb`
- `created_at`

Do not place raw student answers, feedback, tokens, or secrets in audit metadata.

### `consent_records`

- Tenant columns
- `student_id`
- `purpose`
- `status`
- `granted_at`
- `withdrawn_at`
- `metadata jsonb`

### `retention_jobs`

- `id`
- tenant identifiers
- `entity_type`
- `entity_id`
- `scheduled_for`
- `status`
- `completed_at`
- `failure_code`

Support deletion/anonymization while preserving legally required non-identifying audit records.

## 13. Row-Level Security

Enable RLS on every tenant-owned table.

Policies must enforce:

- Users see only organizations and workspaces where they are members.
- Faculty/reviewer roles can read workspace academic resources.
- Only owner/admin can manage membership and organization settings.
- Only permitted faculty roles can create analyses and artifacts.
- Student data requires workspace membership and an appropriate role.
- Approval and verification actions require faculty/admin/owner.
- Storage object access follows the same workspace boundary.
- Service-role background jobs remain auditable.

Do not use a generic policy that grants all authenticated users access.

Write tests proving:

1. User A cannot read User B's workspace.
2. User A cannot retrieve User B's vector chunks through a database function.
3. A reviewer cannot modify membership.
4. A faculty member can create and review an analysis in their workspace.
5. Signed storage paths cannot cross workspace boundaries.

## 14. Storage

Create private buckets:

- `academic-documents`
- `student-evidence`
- `audio-notes`
- `generated-exports`

Use paths:

```text
<organization_id>/<workspace_id>/<document_id>/<sanitized_filename>
```

Storage policies must parse and verify organization/workspace path segments. Uploads should use short-lived signed instructions. Exports must expire and remain private.

Do not create a public bucket for academic or student data.

## 15. Realtime

Enable Realtime only for tables needed by the UI:

- `analyses`
- `analysis_events`
- `artifacts`

Do not broadcast raw document chunks, student responses, or private feedback content.

## 16. Database Functions

Implement safe, typed functions for:

- Workspace-filtered vector similarity search
- Updating `updated_at`
- Creating a default profile after Auth signup
- Validating or calculating score-weight totals
- Claiming an idempotent analysis job if database coordination is needed
- Safe analysis status transitions

Vector search signature must require a workspace:

```sql
match_document_chunks(
  p_workspace_id uuid,
  p_query_embedding vector,
  p_match_count integer,
  p_document_ids uuid[] default null
)
```

The function must check membership for authenticated callers and filter by workspace before distance ordering.

## 17. Indexes and Constraints

Add indexes for:

- All foreign keys used in joins
- Membership lookup by user/workspace
- Documents by workspace/status/kind
- Analyses by workspace/status/type/created_at
- Analysis events by analysis/created_at
- Findings and artifacts by analysis
- Research DOI and normalized identity
- Feedback/query/exam/student records by workspace and parent
- Retention dates
- Audit events by workspace and created_at
- Vector indexes

Use check constraints for:

- Percentages and progress from 0 to 100
- Non-negative counts and scores
- Analysis module/type consistency
- Student response identity exclusivity
- Verification requirements
- Weight totals

## 18. Seed Data

Create repeatable demo seed data for one explicitly labeled demo organization and workspace:

- One faculty profile reference compatible with local Supabase setup
- One course with syllabus topics
- Example teaching feedback and queries
- One sample exam with itemized marks
- Two anonymized students and achievements
- A research analysis fixture
- A curriculum job dataset fixture
- Analyses in completed and in-progress states
- Findings, evidence, and editable artifacts

Seed data must not resemble real student personal data. Make demo status visible in workspace settings.

## 19. Migration and Type Generation Workflow

Provide scripts/documentation to:

1. Start local Supabase.
2. Reset and apply all migrations.
3. Load seed data.
4. Run database tests.
5. Generate TypeScript database types into `packages/shared/src/database.types.ts`.

Generated types must be consumed by backend repositories and may be used by safe frontend Supabase calls.

## 20. Definition of Done

The database layer is complete when:

- All required extensions, enums, tables, constraints, and indexes exist
- Every tenant-owned table has tested RLS
- Private storage buckets and policies are defined
- Vector search is workspace-safe
- Analysis progress supports Realtime without leaking source content
- Evidence and artifact version history are preserved
- Deterministic scoring models are validated
- Verification, consent, audit, and retention records exist
- Demo seed data is repeatable and explicitly synthetic
- Fresh migration, reset, type generation, and SQL tests succeed

