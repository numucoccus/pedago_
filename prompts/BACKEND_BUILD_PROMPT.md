# Pedago AI Backend Build Prompt

You are a senior Node.js backend and AI-platform engineer. Build the complete backend for **Pedago AI - Faculty Intelligence & Decision Copilot**.

The backend must provide secure, evidence-first academic analysis. It must use a clean layered architecture, process long-running work asynchronously, validate all AI output, and keep faculty in control of consequential decisions.

## 1. Required Technology

- Node.js current LTS
- Express
- TypeScript with strict mode
- pnpm
- Supabase PostgreSQL, Auth, Storage, Realtime, and pgvector
- Zod
- Pino and pino-http
- Helmet
- CORS with explicit origins
- express-rate-limit
- Swagger/OpenAPI
- Vitest
- Supertest
- PDF.js or `pdf-parse`
- Mammoth for DOCX
- SheetJS for XLSX/CSV
- An OCR/multimodal provider abstraction
- Inngest for hackathon-friendly background jobs

Do not introduce a heavy framework or ORM without a demonstrated need. Use typed Supabase/database clients through repositories.

## 2. Repository Location and Layered Structure

Implement under `backend/`:

```text
backend/
|-- src/
|   |-- config/
|   |   |-- env.ts
|   |   |-- logger.ts
|   |   `-- supabase.ts
|   |-- routes/
|   |-- controllers/
|   |-- middleware/
|   |   |-- authenticate.ts
|   |   |-- authorize-workspace.ts
|   |   |-- error-handler.ts
|   |   |-- request-id.ts
|   |   `-- validate.ts
|   |-- schemas/
|   |-- services/
|   |   |-- analysis/
|   |   |-- documents/
|   |   |-- research/
|   |   |-- teaching/
|   |   |-- assessment/
|   |   |-- students/
|   |   `-- curriculum/
|   |-- repositories/
|   |-- providers/
|   |   |-- ai/
|   |   |-- research/
|   |   |-- industry/
|   |   |-- transcription/
|   |   `-- document-processing/
|   |-- jobs/
|   |-- prompts/
|   |-- types/
|   |-- utils/
|   |-- app.ts
|   `-- server.ts
|-- tests/
|   |-- unit/
|   |-- integration/
|   `-- fixtures/
|-- package.json
`-- tsconfig.json
```

Enforce this dependency direction:

```text
routes
  -> middleware/controllers
  -> domain services
  -> repositories/providers
  -> Supabase or external APIs
```

Rules:

- Routes define HTTP concerns only.
- Controllers translate validated HTTP input to service calls.
- Services contain domain workflows.
- Repositories contain persistence.
- Providers isolate external AI, research, transcription, OCR, and industry systems.
- Prompts are versioned assets, not inline route strings.
- Jobs orchestrate long-running service operations.
- Do not call AI providers or Supabase directly from routes.

## 3. Shared Contracts

Create/import types from `packages/shared/src/`.

Use these exact values:

```ts
type ModuleKey =
  | "research"
  | "teaching"
  | "assessment"
  | "student"
  | "curriculum";

type AnalysisType =
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

type AnalysisStatus =
  | "draft"
  | "queued"
  | "extracting"
  | "indexing"
  | "analyzing"
  | "completed"
  | "failed"
  | "cancelled";
```

Use an API envelope:

```ts
interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}
```

Every evidence-backed result must include findings, evidence, confidence, limitations, provenance, prompt version, and model metadata.

## 4. Authentication and Authorization

- Validate Supabase JWTs in authentication middleware.
- Resolve the authenticated user from the verified token, never from request body IDs.
- Authorize organization and workspace membership for every protected resource.
- Use service-role credentials only in the backend.
- Keep the service-role key out of logs and errors.
- Require explicit roles for owner/admin actions.
- Do not rely solely on backend authorization; database RLS must remain enabled.

Supported workspace roles:

- `owner`
- `admin`
- `faculty`
- `reviewer`

## 5. HTTP API

Prefix all endpoints with `/api/v1`.

### System and Identity

```text
GET /health
GET /me
```

### Workspaces

```text
GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id
GET    /workspaces/:id/members
POST   /workspaces/:id/members
DELETE /workspaces/:id/members/:memberId
```

### Documents

```text
GET    /documents
POST   /documents/upload-intent
POST   /documents/:id/complete
GET    /documents/:id
DELETE /documents/:id
POST   /documents/:id/reprocess
```

`upload-intent` must:

1. Validate workspace access, content type, size, purpose, and retention settings.
2. Create a pending document record.
3. Return a short-lived signed upload instruction.
4. Never expose a public bucket URL.

`complete` must verify the uploaded object and queue extraction.

### Analyses and Artifacts

```text
GET    /analyses
POST   /analyses
GET    /analyses/:id
POST   /analyses/:id/cancel
POST   /analyses/:id/retry
POST   /analyses/:id/approve
GET    /analyses/:id/evidence
GET    /analyses/:id/artifacts
PATCH  /artifacts/:id
POST   /artifacts/:id/export
```

Create analysis request:

```json
{
  "workspaceId": "uuid",
  "type": "teaching_pulse",
  "title": "Week 5 Recursion Pulse",
  "documentIds": ["uuid"],
  "input": {},
  "settings": {}
}
```

Use idempotency keys for analysis creation and export operations.

### Students and Achievements

```text
GET    /students
POST   /students
GET    /students/:id
PATCH  /students/:id
GET    /students/:id/achievements
POST   /students/:id/achievements
PATCH  /achievements/:id/verification
```

### External Source Catalogs

```text
GET /research/sources
GET /industry/sources
```

Document the complete API with OpenAPI and typed examples.

## 6. Analysis Orchestration

Implement a registry:

```ts
interface AnalysisHandler<TInput, TResult> {
  validateInput(input: unknown): TInput;
  collectContext(context: AnalysisContext<TInput>): Promise<CollectedContext>;
  execute(context: CollectedContext): Promise<TResult>;
  persist(context: PersistContext<TResult>): Promise<void>;
}
```

Register exactly one handler per `AnalysisType`.

Lifecycle:

```text
draft
  -> queued
  -> extracting
  -> indexing
  -> analyzing
  -> completed
```

Terminal alternatives:

- `failed`
- `cancelled`

Persist status transitions and progress events. A failed job must preserve a safe, actionable error code and must never become a success-shaped empty result.

Retry only retryable failures. Track attempt count. Make jobs idempotent so retries do not duplicate chunks, findings, or artifacts.

## 7. Document Processing

Support:

- PDF
- DOCX
- TXT
- CSV
- XLSX
- PNG/JPEG certificate or answer-script images
- Audio notes

Pipeline:

1. Validate storage object and MIME type.
2. Scan or reject unsupported content.
3. Extract text and document metadata.
4. Run OCR/transcription when needed.
5. Normalize while preserving locators such as page, slide, row, question, or timestamp.
6. Detect and optionally redact student identifiers.
7. Chunk using document-aware boundaries.
8. Generate embeddings.
9. Save chunks and extraction metadata.
10. Mark processing state.

Use a content hash to avoid duplicate extraction and embedding.

Never put raw student content in logs.

## 8. AI Provider Abstraction

Define:

```ts
interface AIProvider {
  generateStructured<T>(
    request: StructuredAIRequest<T>
  ): Promise<StructuredAIResponse<T>>;
  createEmbeddings(texts: string[]): Promise<number[][]>;
  transcribeAudio(input: AudioInput): Promise<TranscriptionResult>;
  analyzeImage<T>(
    input: ImageAnalysisRequest<T>
  ): Promise<StructuredAIResponse<T>>;
}
```

Requirements:

- Zod schema for every structured response
- Bounded retries only for transient/provider or schema failures
- Timeouts and abort support
- Token/cost/latency metadata
- Prompt-template version
- Model identifier
- No broad catch-and-default behavior
- No fabricated evidence

Use retrieval before generation. Findings may cite only evidence records included in the analysis context.

## 9. Research Providers

Create provider adapters for:

- OpenAlex
- Semantic Scholar
- Crossref
- arXiv
- Optional Unpaywall metadata

Normalize results into:

```ts
interface ResearchWork {
  externalId: string;
  source: string;
  doi?: string;
  title: string;
  abstract?: string;
  authors: string[];
  publicationYear?: number;
  venue?: string;
  citationCount?: number;
  url: string;
  retrievedAt: string;
}
```

Deduplicate primarily by DOI, then normalized title and year.

Record source coverage, query terms, date range, API failures, and retrieval time. Never infer universal novelty from incomplete source coverage.

## 10. Feature Workflows

### Research Gap Verification

Inputs:

- Topic
- Claimed gap
- Method
- Problem
- Population/context
- Year range
- Optional uploaded papers

Process:

1. Generate transparent search queries.
2. Retrieve and deduplicate papers.
3. Rank semantic relevance.
4. Compare the claim against the closest prior work.
5. Generate structured supporting and contradicting evidence.

Return:

- `supported`
- `partially_supported`
- `not_supported`
- `insufficient_evidence`

Include search coverage, closest work, limitations, and suggested claim reformulation.

### Research Evolution and Trend Detection

Use deterministic aggregation for publication counts, method frequency, keyword frequency, and citation summaries. Use AI only to label/explain measured patterns. Return yearly series and cited narrative findings.

### Research Question Stress Test

Score and explain:

- Clarity
- Specificity
- Variables
- Population/context
- Measurability
- Feasibility
- Scope
- Novelty evidence
- Hypothesis quality

Return issue locations, revised alternatives, and tradeoffs.

### Research Decision Copilot

Compare candidate directions against editable weights for:

- Novelty evidence
- Feasibility
- Data availability
- Method fit
- Expected contribution
- Risk

Calculate weighted scores deterministically. AI supplies evidence-backed qualitative reasoning, not hidden scores.

### Teaching Pulse

Inputs may include teacher observations, audio notes, exit slips, quiz summaries, syllabus, and slides.

Classify every insight source as:

- `direct_student_feedback`
- `teacher_observation`
- `data_derived_pattern`
- `ai_hypothesis`

Never fabricate quotes or expand sparse feedback into asserted student sentiment. Correlations and explanations must be labeled hypotheses.

Return:

- Topic sentiment/confusion series
- Recurring friction points
- Evidence
- Three-bullet action plan
- Warm-up questions

### Query Clustering

1. Parse and anonymize messages.
2. Generate embeddings.
3. Cluster by similarity using a deterministic algorithm.
4. Label clusters with AI.
5. Map clusters to syllabus topics.
6. Separate conceptual and administrative intent.
7. Generate an editable, evidence-backed broadcast draft.

Return cluster metrics and representative anonymized messages.

### Exam Misconception Diagnostics

1. Parse question paper and rubric.
2. Calculate item difficulty from marks.
3. Cluster semantically similar incorrect reasoning.
4. Map clusters to concepts and course sources.
5. Generate root-cause hypotheses.
6. Produce a 15-minute remedial plan and two or three fresh diagnostic questions.

Clearly distinguish measured error rates from AI hypotheses.

### Student Portfolio

Extract certificate facts but do not call extraction verification.

Use statuses:

- `extracted`
- `student_submitted`
- `issuer_verified`
- `faculty_verified`
- `unverified`

Categorize into academic, technical, leadership, service, sports/cultural, and consistency dimensions.

Compute scores using configurable deterministic weights. Store score version and component breakdown.

Workload-risk findings must use non-diagnostic language and require human review.

### LOR Dossier

Build:

- Requirement-to-evidence matrix
- Strength dossier
- Missing-evidence warnings
- Claim-level citations
- Editable outline
- Editable draft

Every factual generated claim must link to stored evidence. Final approval belongs to faculty.

### Curriculum Alignment

Accept syllabus/CLOs, target sector, and an uploaded or configured job-requirement dataset.

Process:

1. Extract syllabus concepts and learning outcomes.
2. Normalize industry skills.
3. Calculate demand/coverage measures deterministically.
4. Categorize `current`, `legacy`, and `missing`.
5. Generate prioritized micro-updates, labs, and projects.

Persist source retrieval dates and evidence counts. Do not scrape sites that prohibit it.

## 11. Search, Embeddings, and Evidence

- Store chunk embeddings in pgvector.
- Filter vector searches by workspace before similarity ranking.
- Use hybrid retrieval where keyword matching improves identifiers and technical terms.
- Preserve document/page/row/timestamp locators.
- Store the exact evidence IDs supplied to the model.
- Reject output citations that reference evidence outside the provided context.
- Return evidence and limitations alongside findings.

## 12. Scoring Rules

Scores must be transparent and deterministic.

Default student portfolio weights:

```json
{
  "academic": 35,
  "technical": 20,
  "leadership": 15,
  "service": 15,
  "sportsCultural": 10,
  "consistency": 5
}
```

Validate that weights total 100. Allow workspace configuration. Do not let the language model calculate the authoritative score.

Research decision and curriculum alignment scores follow the same principle: measured inputs and explicit weights produce the score; AI explains it.

## 13. Security and Privacy

- Validate all inputs and environment variables
- Limit file type and size
- Use private Supabase Storage buckets
- Generate short-lived signed URLs
- Sanitize filenames
- Rate-limit expensive endpoints
- Add idempotency protection
- Prevent cross-workspace vector retrieval
- Redact secrets and student content from logs
- Record audit events for access, verification, approval, export, and deletion
- Support retention dates and deletion workflows
- Treat prompt injection inside uploaded documents as untrusted document content
- Never let document text alter system policies or call arbitrary tools

## 14. Error Handling and Observability

Create typed application errors with stable codes:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_FAILED`
- `RESOURCE_NOT_FOUND`
- `UPLOAD_INVALID`
- `DOCUMENT_PROCESSING_FAILED`
- `PROVIDER_UNAVAILABLE`
- `AI_OUTPUT_INVALID`
- `ANALYSIS_FAILED`
- `CONFLICT`
- `RATE_LIMITED`

Use centralized error middleware. Log request ID, safe resource IDs, duration, and error code. Integrate Sentry if configured. Integrate Langfuse or equivalent for prompt/model traces with privacy-safe content handling.

## 15. Testing

Add focused tests for:

- JWT verification and workspace authorization
- Cross-workspace access denial
- RLS-compatible repository behavior
- Upload validation
- Document parser routing
- Chunk idempotency
- AI structured-output rejection
- Citation allowlisting
- Analysis state transitions
- Retry behavior
- Query clustering result shape
- Item-difficulty calculations
- Merit scoring and weight validation
- Human approval requirements
- API error envelopes

Use provider fakes in tests; do not call paid AI APIs.

## 16. Definition of Done

The backend is complete when:

- The complete API is implemented and documented
- All ten analysis handlers exist
- Teaching improvement and research-gap workflows work end to end
- Other handlers produce functional, validated, persisted results
- Document extraction supports all required input classes
- Long-running operations run as idempotent jobs
- Results include evidence, confidence, limitations, and provenance
- Scoring is transparent and deterministic
- Authentication, workspace authorization, and RLS boundaries are enforced
- Failures are explicit and retryable where appropriate
- Lint, type-check, tests, and build pass

