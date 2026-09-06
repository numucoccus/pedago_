# Pedago AI Supabase Database Migrations

This directory contains all SQL migrations for the Pedago AI database, implementing the complete schema, Row-Level Security (RLS), storage, and audit infrastructure.

## Migration Files Overview

### Core Schema Migrations

1. **0001_extensions_and_types.sql**
   - Enables PostgreSQL extensions: `pgcrypto`, `vector`, `citext`
   - Creates all custom enum types for the application
   - Types: workspace_role, module_key, analysis_type, analysis_status, document_status, document_kind, evidence_source_type, confidence_level, verification_status, artifact_type, artifact_status, feedback_source_kind, evidence_relation, research_relationship, curriculum_classification

2. **0002_identity_and_workspaces.sql**
   - Creates identity and authorization tables: profiles, organizations, organization_members, workspaces, workspace_members
   - Implements helper functions: `is_organization_member()`, `is_workspace_member()`, `has_workspace_role()`
   - Sets up automatic profile creation on user signup
   - Adds `updated_at` triggers for maintaining timestamps
   - Creates membership lookup indexes

3. **0003_courses_and_documents.sql**
   - Creates course and topic hierarchy tables
   - Implements document management with multiple types (syllabus, lecture slides, research papers, etc.)
   - Sets up document extraction and chunking for vector search
   - Includes vector column for embeddings (default 1536 dimensions)
   - Creates IVFFLAT vector index for similarity search

4. **0004_analyses_and_evidence.sql**
   - Implements analysis workflow tables with status tracking
   - Creates findings, evidence items, and relationships
   - Implements artifact versioning for faculty edits
   - Includes progress tracking and realtime event logging
   - Adds analysis type-to-module constraint validation

5. **0005_research.sql**
   - Creates research work tables with global deduplication by DOI
   - Implements research query and trend tracking
   - Manages research decision options with weighted scoring

6. **0006_teaching_and_assessment.sql**
   - Implements teaching feedback collection from multiple sources
   - Creates student query clustering from discussion platforms
   - Manages exam structure and student responses
   - Tracks misconception analysis with error rates and hypotheses

7. **0007_students_and_lor.sql**
   - Implements student profiles with external ID tracking
   - Creates achievement/credential tracking with verification
   - Manages student scoring models and calculated scores
   - Implements risk signal detection and tracking
   - Manages Letter of Recommendation (LOR) workflow

8. **0008_curriculum.sql**
   - Tracks industry job market data sources
   - Maps curriculum to industry skill requirements
   - Implements curriculum alignment analysis
   - Creates curriculum improvement recommendations

9. **0009_storage_and_rls.sql**
   - Creates private Supabase Storage buckets: academic-documents, student-evidence, audio-notes, generated-exports
   - Implements comprehensive Row-Level Security policies for all tables
   - Storage policies enforce workspace boundaries via path parsing
   - Workspace membership gates all data access
   - Role-based access control for sensitive operations

10. **0010_functions_indexes_realtime.sql**
    - Implements `match_document_chunks()` for workspace-filtered vector similarity search
    - Creates `transition_analysis_status()` for safe state machine transitions
    - Implements `claim_analysis_job()` for idempotent job queuing
    - Adds scoring weight validation with check constraints
    - Enables Realtime for: analyses, analysis_events, artifacts
    - Creates comprehensive indexes on all foreign keys and query paths

11. **0011_retention_and_audit.sql**
    - Implements audit event logging for compliance
    - Creates consent record tracking (FERPA/GDPR compliance)
    - Manages retention and scheduled deletion jobs
    - Implements `audit_log()` function for event recording
    - Adds medical diagnosis validation for risk signals
    - Provides audit views for compliance reporting

### Seed Data

**seed.sql**
- Creates demo organization: "Demo University"
- Creates demo workspace: "Computer Science Demo"
- Inserts sample course with hierarchical topics
- Creates sample documents (syllabus, lecture slides)
- Creates anonymized student records
- Includes achievements, exams, student responses
- Sets up scoring models and student scores
- Includes consent records and feedback

## Usage Instructions

### Prerequisites

- Supabase CLI installed
- PostgreSQL 14+ (included with Supabase)
- Local Supabase project configured

### Running Migrations

```bash
# Start local Supabase
supabase start

# Apply all migrations to local database
supabase migration up

# After making changes, create a new migration
supabase migration new <description>

# Push migrations to production
supabase db push --dry-run    # Preview changes
supabase db push              # Apply to production
```

### Resetting Database

```bash
# Reset local database and apply all migrations
supabase db reset

# Load seed data
psql -d postgres://postgres:postgres@localhost:54321/postgres -f supabase/migrations/seed.sql
```

### Generating TypeScript Types

```bash
# Generate types from current schema
supabase gen types typescript --local > packages/shared/src/database.types.ts

# Generate types from remote schema
supabase gen types typescript --project-id <project-id> > packages/shared/src/database.types.ts
```

### Running SQL Tests

```bash
# Run RLS tests
psql -d postgres://postgres:postgres@localhost:54321/postgres -f supabase/tests/rls_workspace_isolation.sql

# Run storage access tests
psql -d postgres://postgres:postgres@localhost:54321/postgres -f supabase/tests/storage_access.sql

# Run scoring constraint tests
psql -d postgres://postgres:postgres@localhost:54321/postgres -f supabase/tests/scoring_constraints.sql

# Run analysis integrity tests
psql -d postgres://postgres:postgres@localhost:54321/postgres -f supabase/tests/analysis_integrity.sql
```

## Key Design Decisions

### Vector Search
- **Dimension**: 1536 (OpenAI embedding standard)
- **Index Type**: IVFFLAT with cosine similarity
- **Workspace Protection**: Vector search function requires workspace membership check before similarity filtering

### Row-Level Security
- All tenant-owned tables have RLS enabled
- Workspace membership gates all data access
- Service role bypasses RLS for background jobs (always audited)
- Storage bucket policies parse workspace IDs from object paths

### Audit and Compliance
- All user actions recorded in `audit_events`
- Audit events are immutable (no UPDATE/DELETE)
- Non-identifying records preserved after deletion for legal compliance
- Consent records track user permissions for data processing

### Soft Deletion
- Documents use `deleted_at` timestamp for reversible deletion
- Soft-deleted documents remain in audit trail
- Hard-deletion only used for compliance retention jobs

### Idempotency
- Analyses use `idempotency_key` (unique with workspace and creator) for replay protection
- Job claiming function ensures only one worker processes an analysis

### Constraint Validation
- Analysis type-to-module constraint ensures semantic correctness
- Student response requires either student_id OR anonymous_subject_key, never both
- Scoring model weights must sum to 100
- Document content hash uniqueness within workspace prevents duplicate processing

## Performance Considerations

### Indexes
- All foreign keys indexed for join performance
- Workspace membership lookups optimized for RLS evaluation
- Analysis status and created_at indexed for common queries
- Vector similarity bounded by document_id set (reduces search space)
- Retention dates indexed for scheduled jobs

### Realtime Limitations
- Only analysis-related tables enabled for Realtime (reduces server load)
- Document chunks and student responses explicitly excluded (sensitive data)
- Progress updates via `analysis_events` instead of modifying `analyses` table

### Query Examples

```sql
-- Vector similarity search with workspace filtering
SELECT * FROM public.match_document_chunks(
  p_workspace_id := 'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
  p_query_embedding := '[0.1, 0.2, ...]'::vector,
  p_match_count := 10
);

-- Faculty members in a workspace
SELECT wm.user_id, p.display_name, wm.role
FROM workspace_members wm
JOIN profiles p ON wm.user_id = p.id
WHERE wm.workspace_id = 'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid
  AND wm.role IN ('faculty', 'admin', 'owner');

-- Recent audit events for workspace
SELECT * FROM public.recent_workspace_activity
WHERE workspace_id = 'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid;

-- Pending retention tasks
SELECT * FROM public.pending_retention_tasks;

-- Check analysis status transition
UPDATE public.analyses
SET status = 'indexing'
WHERE public.transition_analysis_status(id, 'indexing'::analysis_status);
```

## Schema Documentation

### Tenant Isolation
Every row in tenant-owned tables includes:
- `organization_id`: Machine-level isolation
- `workspace_id`: Logical tenant isolation (frequently in RLS policies)
- `created_by`: Audit trail
- `created_at` / `updated_at`: Temporal tracking

### Status Machines

**Analysis Status Flow:**
```
draft → queued → extracting → indexing → analyzing → completed
  ↓                              ↓                        ↓
cancelled                      failed ←────────────────→ queued
```

**Document Status Flow:**
```
pending_upload → uploaded → extracting → ready
                              ↓
                            failed
```

**Artifact Status Flow:**
```
draft → faculty_edited → approved → exported
```

### Evidence Relationships
- `supports`: Evidence directly supports the finding
- `contradicts`: Evidence contradicts or qualifies the finding
- `context`: Evidence provides background information

## Troubleshooting

### RLS Policy Blocking Valid Access
- Verify workspace membership: `SELECT * FROM workspace_members WHERE workspace_id = '...' AND user_id = auth.uid();`
- Check service role bypassing: Use `-U postgres` for admin operations
- Review audit events for failed access attempts

### Vector Search Returning No Results
- Verify `document_chunks` has embeddings: `SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;`
- Check vector dimension: Should match your embedding model (default 1536)
- Ensure correct workspace: Vector search filters by workspace_id

### Duplicate Documents Despite Unique Constraint
- `(workspace_id, content_hash, kind)` uniqueness only applies to non-deleted documents
- Before creating new document: Check for soft-deleted versions with same hash
- Consider hard-deleting expired soft-deleted documents

## Migration Strategy for Production

1. **Backup Production Database** before running migrations
2. **Test in Staging Environment** with production data copy
3. **Review RLS Policies** to confirm isolation requirements
4. **Run Migrations with Downtime** or use blue-green deployment
5. **Verify Indexes** are built: `SELECT * FROM pg_stat_user_indexes;`
6. **Regenerate Types** for backend and frontend
7. **Run Smoke Tests** against actual application code

## Additional Resources

- [Supabase Migrations](https://supabase.com/docs/guides/cli/migrations)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Realtime Multiplayer Features](https://supabase.com/docs/guides/realtime)
