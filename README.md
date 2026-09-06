# Pedago AI

**Faculty Intelligence & Decision Copilot**

Pedago AI is an evidence-first academic intelligence platform designed to make university faculty work faster, clearer, and more informed. It transforms research material, teaching feedback, assessment data, student evidence, and curriculum documents into traceable findings and practical recommendations.

The project is being designed for the **AUST CSE Carnival `<8.0/>` AI Build Hackathon** under the theme **AI for Academic Life**.

> Pedago AI supports faculty judgment; it does not replace it. Recommendations remain reviewable, editable, and tied to source evidence.

## The Problem

Faculty members perform much more than classroom teaching. They must evaluate research ideas, monitor student understanding, examine assessment quality, write recommendations, review co-curricular achievements, and keep courses relevant to industry.

These workflows are often:

- Spread across disconnected documents and systems
- Repetitive and time-consuming
- Difficult to evaluate consistently
- Performed with incomplete or unstructured evidence
- Reactive instead of helping faculty intervene early

Pedago AI brings these workflows into one modular faculty workspace.

## Product Workspaces

### 1. Research Intelligence

- **Research Gap Verification** checks a claimed gap against retrieved academic literature and reports whether it is supported, partially supported, contradicted, or still uncertain.
- **Research Evolution Tracker** compares papers across years to show how methods and focus areas have changed.
- **Research Question Stress Tester** evaluates clarity, scope, variables, measurability, feasibility, and hypothesis quality.
- **Academic Trend Detector** measures emerging and declining research topics.
- **Research Decision Copilot** compares possible research directions through an editable, evidence-backed decision matrix.

### 2. Teaching Intelligence

- **PulseAI** combines teacher observations, anonymous exit slips, optional quiz summaries, and course context.
- **Office-Hour Query Clustering** groups repetitive student questions and separates conceptual confusion from administrative requests.
- **Topic Friction Tracking** maps persistent confusion to syllabus topics.
- **Teaching Action Plans** recommend focused adjustments for the next class.
- **Warm-Up and Broadcast Generation** creates editable diagnostic questions and consolidated responses.

The system distinguishes direct student feedback, teacher observations, measured patterns, and AI-generated hypotheses. It must never invent student statements.

### 3. Assessment Intelligence

- Analyzes question papers, rubrics, itemized marks, and anonymized answers
- Measures question-level difficulty and error rates
- Clusters recurring incorrect reasoning
- Maps misconceptions to course topics and learning material
- Produces a misconception heatmap
- Generates an editable 15-minute remedial lesson
- Creates follow-up diagnostic questions

Measured performance and AI-generated root-cause hypotheses are presented separately.

### 4. Student Intelligence

- Extracts evidence from certificates, transcripts, activity records, and project summaries
- Builds a holistic student portfolio and 360-degree growth view
- Calculates transparent merit scores using faculty-configurable weights
- Distinguishes extracted, submitted, faculty-verified, issuer-verified, and unverified achievements
- Flags possible workload-risk patterns for human review without making medical diagnoses
- Builds evidence dossiers and editable Letters of Recommendation

The platform does not make autonomous scholarship, award, disciplinary, or recommendation decisions.

### 5. Curriculum Intelligence

- Maps a syllabus and course learning outcomes to industry skill requirements
- Classifies skills as current, legacy, or missing
- Produces an explainable alignment score
- Recommends realistic course-level micro-updates
- Generates modern lab exercises, module additions, and project ideas
- Preserves source counts and retrieval dates behind recommendations

## Flagship Hackathon Journey

The primary demonstration is a **Teaching Improvement Loop**:

1. A faculty member uploads a syllabus, lecture material, student queries, exit slips, and assessment results.
2. Pedago AI extracts and indexes the material.
3. The analysis engine discovers confusion clusters and recurring misconceptions.
4. Findings are mapped to syllabus topics and backed by source evidence.
5. The faculty member receives:
   - A misconception heatmap
   - A three-point next-class action plan
   - A 15-minute remedial lesson
   - Follow-up diagnostic questions
   - An editable broadcast response
6. The faculty member reviews, edits, approves, and exports the result.

The secondary demonstration is **Research Gap Verification**, showing research discovery, evidence comparison, novelty confidence, limitations, and improved research-question suggestions.

## Architecture

```text
Next.js Frontend
      |
      | HTTPS + Supabase access token
      v
Express REST API
      |
      |-- Layered domain services
      |-- Background analysis jobs
      |-- Document/OCR/transcription providers
      |-- AI and embedding providers
      |-- Research and industry source adapters
      v
Supabase
      |-- PostgreSQL
      |-- Auth
      |-- Private Storage
      |-- pgvector
      `-- Realtime
```

Long-running document extraction, embedding, clustering, and AI analysis use asynchronous jobs with an explicit lifecycle:

```text
draft -> queued -> extracting -> indexing -> analyzing -> completed
                                                    |-> failed
                                                    `-> cancelled
```

## Technology Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- shadcn/ui and Radix UI
- TanStack Query
- React Hook Form and Zod
- Recharts
- TipTap
- Supabase Auth client

### Backend

- Node.js and Express
- TypeScript
- Layered controllers, services, repositories, and providers
- Zod request and AI-output validation
- Pino structured logging
- OpenAPI documentation
- Inngest background jobs
- Vitest and Supertest

### Database and Infrastructure

- Supabase PostgreSQL
- Supabase Auth
- Private Supabase Storage
- Supabase Realtime
- pgvector semantic retrieval
- Row-Level Security
- SQL migrations and database tests

### AI and Data Integrations

- Provider-independent structured generation
- Embeddings and semantic retrieval
- OCR and multimodal document extraction
- Audio transcription
- OpenAlex, Semantic Scholar, Crossref, and arXiv research adapters
- Uploaded or approved industry datasets

## Visual Direction

The interface follows:

> Swiss editorial precision combined with a futuristic digital atmosphere.

The design system combines:

- Swiss grid and typographic hierarchy
- Minimalism and generous whitespace
- Structured Bento dashboards
- Selective glassmorphism
- Restrained Aurora gradients
- Full light and dark themes
- WCAG AA contrast and keyboard accessibility

Floating spores, cursor repulsion, cursor trail, cursor glow, and Aurora movement are limited to landing and authentication pages. Analytical dashboards remain calm and readable. Motion is reduced or disabled according to `prefers-reduced-motion` and device capabilities.

## Repository Structure

```text
pedago/
|-- frontend/                 # Next.js application
|   |-- app/
|   |-- components/
|   |-- features/
|   |-- hooks/
|   |-- lib/
|   `-- types/
|-- backend/                  # Express API and AI orchestration
|   |-- src/
|   |   |-- controllers/
|   |   |-- services/
|   |   |-- repositories/
|   |   |-- providers/
|   |   |-- middleware/
|   |   |-- jobs/
|   |   `-- schemas/
|   `-- tests/
|-- packages/
|   `-- shared/               # Shared API and database contracts
|-- supabase/
|   |-- migrations/
|   |-- functions/
|   `-- tests/
|-- prompts/                  # Detailed implementation specifications
|-- AI_Build_Hackathon_Problem_Statement.md
`-- README.md
```

## Build Specifications

The implementation is divided into three coordinated specifications:

- [Frontend build prompt](./prompts/FRONTEND_BUILD_PROMPT.md)
- [Backend build prompt](./prompts/BACKEND_BUILD_PROMPT.md)
- [Supabase database build prompt](./prompts/DATABASE_BUILD_PROMPT.md)

These files define shared feature names, analysis states, API behavior, evidence contracts, security requirements, test expectations, and definitions of done.

## Evidence-First AI Principles

Every important AI result should include:

- Findings
- Supporting or contradicting evidence
- Confidence level
- Known limitations
- Source provenance
- Model and prompt version
- A clear human-review requirement

Research-gap analysis reports only what was found in the searched sources. It must not claim universal novelty. Certificate extraction is not treated as certificate verification. Student workload signals are not diagnoses. AI-generated recommendations are not final academic decisions.

## Privacy and Security

- Supabase Row-Level Security isolates organizations and workspaces.
- Academic and student documents remain in private storage buckets.
- Signed URLs are short-lived.
- The service-role key is backend-only.
- Vector search is filtered by workspace before similarity ranking.
- Sensitive student content and access tokens are excluded from logs.
- Approval, verification, export, and deletion events are auditable.
- Consent, retention, anonymization, and deletion workflows are part of the data model.
- Uploaded documents are treated as untrusted input and cannot override system instructions.

## Development Status

The repository currently contains:

- The original hackathon problem statement
- Detailed frontend, backend, and database build specifications
- Initial monorepo directory scaffolding
- A root ignore policy for secrets, dependencies, build output, local Supabase state, tests, and generated artifacts

Application source code, dependency manifests, environment examples, migrations, and runtime setup are the next implementation phase. Commands such as `pnpm install`, database migration, development servers, tests, and production builds will be documented once their scripts and manifests are added.

## Planned Local Development Flow

Once implementation files are in place, the expected workflow is:

1. Install the current Node.js LTS release, pnpm, Docker, and the Supabase CLI.
2. Copy committed `.env.example` files to local `.env` files.
3. Start the local Supabase stack.
4. Apply migrations and load explicitly synthetic seed data.
5. Generate database types into `packages/shared`.
6. Install workspace dependencies.
7. Start the backend job handler and API.
8. Start the Next.js frontend.
9. Run lint, type checks, focused tests, and production builds.

Never commit `.env` files, provider keys, Supabase service-role keys, private certificates, real student data, local uploads, or generated private exports.

## Hackathon Success Criteria

Pedago AI is successful when judges can clearly see:

```text
Faculty input
  -> transparent AI processing
  -> evidence-backed result
  -> editable faculty decision
```

A polished, working core journey is prioritized over shallow automation. Every module follows the same product promise: **help faculty understand, compare, evaluate, and act - without taking judgment away from them.**