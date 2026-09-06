# Pedago AI Supabase Database Build Prompt — Part 2: Security, Implementation & Deployment

You are a senior PostgreSQL and Supabase architect. This part covers the security, implementation, testing, and deployment aspects of the **Pedago AI - Faculty Intelligence & Decision Copilot** database.

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
