# Pedago AI Database Setup Guide

This guide walks you through setting up the Pedago AI database from scratch, running tests, and deploying to production.

## Prerequisites

### Required Software
- **Supabase CLI** (v1.180+)
  ```bash
  # macOS/Linux
  brew install supabase/tap/supabase
  
  # Windows
  choco install supabase
  # OR download from: https://github.com/supabase/cli/releases
  ```

- **PostgreSQL Client Tools** (psql)
  ```bash
  # macOS
  brew install postgresql
  
  # Ubuntu/Debian
  sudo apt-get install postgresql-client
  
  # Windows
  choco install postgresql
  # OR include with PostgreSQL installation
  ```

- **Node.js** (v18+) - for type generation

### Environment Setup
```bash
# Login to Supabase
supabase login

# (Optional) Set project ID for remote deployment
export SUPABASE_PROJECT_ID="your-project-id"
# OR on Windows PowerShell:
$env:SUPABASE_PROJECT_ID = "your-project-id"
```

## Local Development Setup

### Step 1: Start Local Supabase
```bash
# macOS/Linux
chmod +x supabase/setup.sh
./supabase/setup.sh start

# Windows (PowerShell)
.\supabase\setup.ps1 -Command start
```

This starts:
- PostgreSQL database on `postgresql://postgres:postgres@localhost:54321/postgres`
- Supabase Studio at `http://localhost:54323`
- Other Supabase services (Auth, Storage, Realtime, etc.)

Verify services are running:
```bash
supabase status
```

### Step 2: Apply Database Migrations
```bash
# macOS/Linux
./supabase/setup.sh migrate

# Windows (PowerShell)
.\supabase\setup.ps1 -Command migrate
```

This:
- Creates extensions (pgvector, citext, pgcrypto)
- Creates all enum types
- Creates 40+ tables with proper indexes
- Enables Row-Level Security (RLS)
- Creates storage buckets and policies
- Creates database functions and triggers
- Enables Realtime for specific tables

**Output**: You should see all 11 migrations applied (0001 through 0011)

### Step 3: Load Demo Seed Data
```bash
# macOS/Linux
./supabase/setup.sh seed

# Windows (PowerShell)
.\supabase\setup.ps1 -Command seed
```

This creates:
- Demo organization: "Demo University"
- Demo workspace: "Computer Science Demo"
- Sample course with topics
- Sample documents and student records
- Example exam with questions
- Demo analyses, findings, and artifacts
- Consent records and audit trails

**Note**: Seed data is intentionally synthetic and labeled as demo. Never use in production.

### Step 4: Run Database Tests
```bash
# macOS/Linux
./supabase/setup.sh test

# Windows (PowerShell)
.\supabase\setup.ps1 -Command test
```

This runs 4 test suites:

#### Test 1: RLS Workspace Isolation (`rls_workspace_isolation.sql`)
Verifies:
- Users cannot read other users' workspaces
- Vector chunks are workspace-isolated
- Reviewers cannot modify membership
- Faculty can create/manage analyses
- Storage paths enforce boundaries

#### Test 2: Storage Access (`storage_access.sql`)
Verifies:
- All buckets are private (academic-documents, student-evidence, audio-notes, generated-exports)
- Path-based workspace isolation
- RLS policies enforce access control
- Service role operations are audited
- Signed URLs have workspace scope

#### Test 3: Scoring Constraints (`scoring_constraints.sql`)
Verifies:
- Scoring model weights sum to 100
- Score values are non-negative
- Progress fields bounded 0-100
- Confusion scores bounded 0-5
- Error rates bounded 0-100
- Analysis type-module consistency

#### Test 4: Analysis Integrity (`analysis_integrity.sql`)
Verifies:
- Analysis status workflows
- Progress events for Realtime updates
- Finding and evidence preservation
- Artifact versioning maintains edit history
- Idempotent job claiming prevents duplicates
- Approval audit trails maintained

### Step 5: Generate TypeScript Types
```bash
# macOS/Linux
./supabase/setup.sh generate-types

# Windows (PowerShell)
.\supabase\setup.ps1 -Command generate-types
```

This generates TypeScript definitions at `packages/shared/src/database.types.ts`:
```typescript
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

export interface Database {
  public: {
    Tables: {
      profiles: { ... }
      organizations: { ... }
      workspaces: { ... }
      // ... 40+ more tables
    }
    Functions: {
      is_organization_member: ...
      match_document_chunks: ...
      // ... more functions
    }
  }
}
```

Used by backend repositories and frontend Supabase client for type safety.

### Complete Setup (All in One)
```bash
# macOS/Linux
./supabase/setup.sh full

# Windows (PowerShell)
.\supabase\setup.ps1 -Command full
```

This runs all steps in sequence:
1. Start Supabase
2. Apply migrations
3. Load seed data
4. Run tests
5. Generate types

Takes approximately 2-3 minutes.

## Accessing the Database

### Supabase Studio (Web UI)
```
http://localhost:54323
```
- Email: `supabase`
- Password: `supabase`

### Command Line (psql)
```bash
# Get connection string
supabase status

# Connect
psql "postgresql://postgres:postgres@localhost:54321/postgres"

# Or via environment variable
PGPASSWORD=postgres psql -h localhost -p 54321 -U postgres postgres
```

### Via Backend Code
The backend uses Supabase server client:
```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("analyses")
  .select("*")
  .eq("workspace_id", workspaceId);
```

### Via Frontend Code
The frontend uses Supabase client with Row-Level Security:
```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Only returns data user has access to
const { data, error } = await supabase
  .from("courses")
  .select("*");
```

## Production Deployment

### Prerequisites
1. Create Supabase project at https://supabase.com
2. Get project ID and API keys
3. Set environment variables:
   ```bash
   export SUPABASE_PROJECT_ID="your-project-id"
   export SUPABASE_ACCESS_TOKEN="your-access-token"
   ```

### Deploy Migrations
```bash
# Dry run (preview changes)
supabase db push --dry-run --project-id $SUPABASE_PROJECT_ID

# Apply migrations
supabase db push --project-id $SUPABASE_PROJECT_ID

# Verify
supabase db list migrations --project-id $SUPABASE_PROJECT_ID
```

**Important**: Always review migration changes before deploying to production!

### Seed Production Data
```bash
# Do NOT run seed.sql in production!
# Instead, manually create your organizations and workspaces
# through the application UI or admin interface

supabase exec -f supabase/manual-seed-production.sql --project-id $SUPABASE_PROJECT_ID
```

### Generate Remote Types
```bash
supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > packages/shared/src/database.types.ts
```

### Environment Variables

**Backend (.env)**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@your-project.supabase.co:5432/postgres
```

**Frontend (.env.local)**
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key
```

## Database Schema Overview

### Core Tables (40+)
- **Identity**: profiles, organizations, organization_members, workspaces, workspace_members
- **Courses**: courses, course_topics, documents, document_extractions, document_chunks
- **Analysis**: analyses, analysis_documents, analysis_events, findings, evidence_items
- **Research**: research_queries, research_works, analysis_research_works, research_trend_points
- **Teaching**: feedback_entries, query_messages, query_clusters, misconception_clusters
- **Exams**: exams, exam_questions, student_responses
- **Students**: students, achievements, student_activity_metrics, student_scores, student_risk_signals
- **Curriculum**: industry_sources, industry_skill_observations, curriculum_skill_mappings
- **Artifacts**: artifacts, artifact_versions
- **Audit**: audit_events, consent_records, retention_jobs

### Key Features
- ✅ Row-Level Security (RLS) on all tenant-owned tables
- ✅ Vector embeddings (1536-dim) with IVFFLAT index
- ✅ Soft deletion with retention jobs
- ✅ Artifact versioning for faculty edits
- ✅ Audit logging for compliance
- ✅ Idempotent analysis job claiming
- ✅ Status machine workflow validation
- ✅ Constraint validation (weights, progress, scores)

## Troubleshooting

### Issue: `psql: command not found`
**Solution**: Install PostgreSQL client tools (see Prerequisites)

### Issue: `Cannot connect to local database`
**Solution**: 
```bash
# Check if Supabase is running
supabase status

# Restart if needed
supabase stop
supabase start
```

### Issue: `Migrations fail with permission error`
**Solution**: Ensure you're using service role (`supabase.service_role`) for admin operations

### Issue: RLS policies blocking valid access
**Solution**: 
1. Verify user is workspace member: `SELECT * FROM workspace_members WHERE workspace_id = '...' AND user_id = auth.uid();`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'analyses';`
3. Test with service role: `SET ROLE postgres;`

### Issue: Vector search returns no results
**Solution**:
1. Verify embeddings exist: `SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;`
2. Check vector dimension: Should be 1536 (default) or your configured dimension
3. Verify workspace filter: `SELECT * FROM match_document_chunks(...);`

### Issue: TypeScript types not generating
**Solution**:
1. Ensure migrations are applied: `supabase migration up`
2. Verify types file path exists: `mkdir -p packages/shared/src`
3. Try manual generation: `supabase gen types typescript --local > packages/shared/src/database.types.ts`

## Performance Optimization

### Query Optimization
```sql
-- Use workspace_id in WHERE clause (indexed)
SELECT * FROM analyses WHERE workspace_id = '...' AND status = 'completed';

-- Vector search includes workspace filter
SELECT * FROM match_document_chunks(workspace_id, embedding, 10);

-- Aggregate by partition
SELECT module, COUNT(*) as count
FROM analyses
WHERE workspace_id = '...'
GROUP BY module;
```

### Index Monitoring
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find missing indexes
SELECT schemaname, tablename, attname
FROM pg_attribute a
WHERE attnum > 0
  AND NOT a.attisdropped
  AND EXISTS (SELECT 1 FROM pg_class WHERE oid = a.attrelid AND relkind = 'r')
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i 
    WHERE i.indrelid = a.attrelid AND a.attnum = ANY(i.indkey)
  );
```

## Backup and Recovery

### Backup Local Database
```bash
# Backup schema and data
supabase db dump --project-id local > backup.sql

# Restore
supabase db reset --project-id local
supabase migration up --project-id local
psql -f backup.sql < <connection_string>
```

### Production Backup
```bash
# Scheduled backups (automated in Supabase dashboard)
# Manual backup via CLI
supabase db dump --project-id $SUPABASE_PROJECT_ID > backup-$(date +%Y%m%d-%H%M%S).sql
```

## Next Steps

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Supabase Studio: http://localhost:54323

4. **Create First User**:
   - Sign up via auth form
   - Profile created automatically
   - Create organization and workspace

5. **Upload Documents**:
   - Syllabus (PDF)
   - Lecture slides
   - Student responses

6. **Trigger Analyses**:
   - Teaching pulse
   - Research gap analysis
   - Student portfolio analysis

## Support & Documentation

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [pgVector Docs](https://github.com/pgvector/pgvector)
- [Pedago AI Architecture](../../README.md)

## Schema Maintenance

### Adding a New Table
1. Create migration: `supabase migration new add_new_table`
2. Write SQL to create table with RLS
3. Add indexes for common queries
4. Test locally: `supabase migration up`
5. Generate types: `./supabase/setup.sh generate-types`
6. Commit and push

### Modifying Existing Table
1. Create new migration (never modify applied migrations)
2. Use `ALTER TABLE` for schema changes
3. Add new indexes if adding frequently-queried columns
4. Test rollback capability
5. Always include rollback SQL in comments

### Monitoring in Production
```bash
# Check active connections
SELECT * FROM pg_stat_activity;

# Monitor slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**Created**: September 2026  
**Last Updated**: September 6, 2026  
**Version**: 1.0
