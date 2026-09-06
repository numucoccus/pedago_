# Pedago AI Backend

Express + TypeScript API and AI orchestration layer for **Pedago AI – Faculty Intelligence & Decision Copilot**. It implements the contract in [`prompts/BACKEND_BUILD_PROMPT.md`](../prompts/BACKEND_BUILD_PROMPT.md): evidence-first analysis, asynchronous idempotent jobs, strict AI output validation, and faculty control over every consequential decision.

## Quick start

```bash
pnpm install
pnpm --filter @pedago/shared build
cp backend/.env.example backend/.env      # edit values
pnpm --filter @pedago/backend dev         # http://localhost:4000/api/v1
```

- Swagger UI: `GET /api/v1/docs` — OpenAPI JSON: `GET /api/v1/openapi.json`
- Health: `GET /api/v1/health`

For an offline demo without Supabase or paid AI calls set `DATA_STORE=memory`, `AI_PROVIDER=fake`, `JOB_DISPATCHER=inline`. Production refuses these values.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | `tsx watch src/server.ts` |
| `pnpm build` / `pnpm start` | Compile to `dist/` and run |
| `pnpm typecheck` | `tsc --noEmit` (strict) |
| `pnpm lint` | ESLint (typescript-eslint, `no-explicit-any` as error) |
| `pnpm test` | Vitest unit + Supertest integration suites (provider fakes only) |

## Architecture

```text
routes → middleware/controllers → services → repositories/providers → Supabase / external APIs
```

| Layer | Location | Notes |
|---|---|---|
| Config | `src/config` | Zod-validated env, Pino logger with secret/content redaction, service-role Supabase client |
| Middleware | `src/middleware` | request id, Supabase JWT verification (`jose`, HS256 secret or JWKS), workspace authorization, Zod validation, rate limits, centralized error envelope |
| Controllers / routes | `src/controllers`, `src/routes` | HTTP concerns only; every endpoint under `/api/v1` |
| Services | `src/services/*` | Workspaces + access control, documents, retrieval, analysis orchestration, artifacts, students, and one handler per module |
| Repositories | `src/repositories` | `DataStore` port with `SupabaseDataStore` (PostgREST + `match_document_chunks` RPC) and `MemoryDataStore` (tests/local) |
| Providers | `src/providers/*` | AI (OpenAI-compatible + deterministic fake), research (OpenAlex, Semantic Scholar, Crossref, arXiv, Unpaywall), industry datasets, document extraction (PDF, DOCX, TXT, CSV/XLSX, image OCR, audio transcription), storage, auth |
| Jobs | `src/jobs` | `JobDispatcher` port: Inngest functions (`/api/inngest`) or in-process inline runner |
| Prompts | `src/prompts` | Versioned prompt assets (`<module>.<task>.vN`) with a shared evidence/prompt-injection policy |
| Contracts | `packages/shared/src` | `ModuleKey`, `AnalysisType`, `AnalysisStatus`, API envelope, request schemas, `database.types.ts` |

### Analysis lifecycle

`draft → queued → extracting → indexing → analyzing → completed` with terminal `failed` / `cancelled`. Every transition is a conditional update (`WHERE status = previous`), so concurrent workers cannot double-run and cancellation is honoured between steps. Progress and status history are written to `analysis_events`.

Retries: only `retryable` failures (`PROVIDER_UNAVAILABLE`, `AI_OUTPUT_INVALID`) are re-queued, up to `MAX_ANALYSIS_ATTEMPTS = 3`. Before persisting, every derived row of the previous attempt (findings, evidence, draft artifacts, domain tables) is cleared, so retries never duplicate results. Approved artifacts carrying faculty edits are preserved.

### Handlers (one per `AnalysisType`)

| Type | Deterministic core | AI role |
|---|---|---|
| `research_gap` | transparent queries, multi-source retrieval, DOI/title dedup, semantic ranking, coverage record; `supported` is downgraded when any source failed | verdict rationale, supporting/contradicting findings, reformulated claim |
| `research_evolution` | yearly publication/citation counts, keyword & method frequency, slope classification | narrative labelling of measured series |
| `research_question` | novelty score capped without literature evidence | 9-dimension scoring, issue locations, revised alternatives |
| `research_decision` | weighted score (`Σ weight × normalized`, risk inverted), rank | strengths/risks reasoning |
| `teaching_pulse` | confusion heuristics, topic series, source-kind provenance enforcement | friction points, 3-bullet action plan, warm-up questions |
| `query_clustering` | anonymisation, embeddings, agglomerative clustering | cluster labels, intent, syllabus mapping, broadcast draft |
| `exam_misconception` | item difficulty & error rate, per-question clustering of incorrect responses | root-cause hypotheses (flagged), 15-minute remedial lesson, diagnostic questions |
| `student_portfolio` | verification-weighted merit score (weights must total 100, version `portfolio-score.v1`), non-diagnostic workload signals | strengths/growth narrative |
| `lor_dossier` | requirement→evidence matrix by keyword overlap | cited claims, missing-evidence warnings, outline, draft (approval required) |
| `curriculum_alignment` | demand/coverage measures from uploaded or configured datasets, `current`/`legacy`/`missing` | prioritised micro-updates, labs, projects |

Every completed analysis exposes an `EvidenceBackedResult`: findings, evidence, confidence, limitations, provenance (documents, evidence ids, retrieval, external coverage, model calls), prompt version, and model metadata.

### Evidence rules

- Retrieval happens before generation; the model sees evidence as `[E1] … [En]` blocks.
- Structured output is validated with Zod **and** every cited key must be in the allowlist supplied to the model. Anything else is `AI_OUTPUT_INVALID` (retried with feedback, then failed — never defaulted).
- AI hypotheses are capped at medium confidence and always `requiresHumanReview`.
- Document text is treated as untrusted; the prompt policy forbids following embedded instructions.
- Vector search is filtered by workspace before ranking (`match_document_chunks(p_workspace_id, …)`), fused with keyword hits for identifiers.

### Document pipeline

verify object → sniff/route by MIME → extract (PDF.js via `pdf-parse`, Mammoth, SheetJS, OCR, transcription) → normalise with locators (page/sheet/row/section/timestamp) → detect & redact identifiers → chunk on document-aware boundaries → embed → persist. A SHA-256 content hash makes re-processing idempotent (identical content reuses the completed extraction without re-embedding).

## Security

- Identity comes only from the verified JWT (`sub`, `aud=authenticated`); request bodies never carry user ids.
- `AccessService.requireMembership` checks workspace **and** organization membership plus role for every protected resource. Roles: `owner`, `admin` (manage members/settings), `faculty` (create/approve/verify), `reviewer` (read).
- Private buckets only; signed upload/download URLs are short-lived; storage paths are `<org>/<workspace>/<document>/<sanitized-filename>`.
- Idempotency keys on analysis creation and exports (`Idempotency-Key` header; conflicting bodies → `409`).
- Audit events for access, verification, approval, export, deletion, and job outcomes carry ids and codes only.
- Logs redact authorization headers, keys, tokens, and content fields.

## Database expectations

Repositories target the schema in [`prompts/DATABASE_BUILD_PROMPT.md`](../prompts/DATABASE_BUILD_PROMPT.md) as typed in `packages/shared/src/database.types.ts`. Two backend-owned additions are required by the migrations:

- `analyses.result jsonb` and `analyses.provenance jsonb` (handler output and provenance)
- `idempotency_keys (workspace_id, user_id, scope, key, request_hash, response)` with a unique constraint on the first four columns

Embedding dimension is 1536 (`AI_EMBEDDING_DIMENSION`); the fake provider uses the configured dimension so tests run with small vectors.

## Testing

`pnpm test` runs 56 tests covering JWT verification, workspace/role authorization and cross-workspace denial, upload validation, parser routing (text, CSV, XLSX, PNG→OCR, MP3→transcription, MIME mismatch), chunk idempotency and redaction, structured-output rejection and citation allowlisting, the full analysis state machine (idempotent replay, cancel, retry limits, approval gate, versioned edits, export idempotency), research-gap coverage handling, and every handler end to end with the deterministic fake AI provider. No paid AI or external HTTP calls are made.
