# Pedago AI Frontend Build Prompt

You are a senior frontend engineer and product designer. Build the complete frontend for **Pedago AI - Faculty Intelligence & Decision Copilot**, a faculty-centered platform that turns academic documents and evidence into traceable recommendations.

This prompt is the frontend contract. Do not implement backend business logic in the frontend. Integrate only through the API contracts described below and Supabase Auth.

## 1. Product Goal

Pedago AI has five connected workspaces:

1. **Research Intelligence**
   - Research Gap Verification
   - Research Evolution Tracker
   - Research Question Stress Tester
   - Academic Trend Detector
   - Research Decision Copilot
2. **Teaching Intelligence**
   - PulseAI micro-feedback analysis
   - Office-hour query clustering and intent triage
   - Confusion and sentiment tracking
   - Teaching action plans
   - Warm-up quiz and broadcast generation
3. **Assessment Intelligence**
   - Post-exam misconception analysis
   - Question-level heatmaps
   - Root-cause hypotheses
   - Remedial lesson and diagnostic question generation
4. **Student Intelligence**
   - Co-curricular evidence extraction
   - Holistic student portfolios
   - Configurable merit scoring
   - Workload-risk signals
   - LOR evidence dossiers and editable drafts
5. **Curriculum Intelligence**
   - Syllabus-to-industry alignment
   - Missing, current, and outdated skill analysis
   - Course enhancement packs
   - Modern lab and project suggestions

The application assists faculty judgment. It must never present AI output as an automatic final academic decision.

## 2. Required Technology

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- Framer Motion
- Lucide React icons
- shadcn/ui and Radix UI primitives
- TanStack Query
- React Hook Form
- Zod
- Recharts
- Sonner
- next-themes
- react-dropzone
- TipTap for editable generated documents
- Supabase browser client for authentication and approved signed uploads only

Use `pnpm`. Do not add another UI framework or state library unless required.

## 3. Repository Location and Structure

Implement the application in `frontend/` using this structure:

```text
frontend/
|-- app/
|   |-- (marketing)/
|   |   |-- page.tsx
|   |   |-- features/page.tsx
|   |   `-- about/page.tsx
|   |-- (auth)/
|   |   |-- login/page.tsx
|   |   |-- signup/page.tsx
|   |   `-- callback/route.ts
|   |-- (dashboard)/
|   |   |-- layout.tsx
|   |   |-- dashboard/page.tsx
|   |   |-- research/
|   |   |   |-- page.tsx
|   |   |   |-- gap-verification/page.tsx
|   |   |   |-- evolution/page.tsx
|   |   |   |-- question-stress-test/page.tsx
|   |   |   `-- decisions/page.tsx
|   |   |-- teaching/
|   |   |   |-- page.tsx
|   |   |   |-- pulse/page.tsx
|   |   |   `-- query-clusters/page.tsx
|   |   |-- assessment/
|   |   |   |-- page.tsx
|   |   |   `-- misconception-diagnostics/page.tsx
|   |   |-- students/
|   |   |   |-- page.tsx
|   |   |   |-- portfolios/[studentId]/page.tsx
|   |   |   `-- lor/page.tsx
|   |   |-- curriculum/
|   |   |   |-- page.tsx
|   |   |   `-- alignment/page.tsx
|   |   |-- documents/page.tsx
|   |   |-- analyses/[analysisId]/page.tsx
|   |   `-- settings/page.tsx
|   |-- api/health/route.ts
|   |-- globals.css
|   |-- layout.tsx
|   `-- providers.tsx
|-- components/
|   |-- ui/
|   |-- layout/
|   |-- ambient/
|   |-- charts/
|   |-- evidence/
|   |-- forms/
|   `-- feedback/
|-- features/
|   |-- auth/
|   |-- dashboard/
|   |-- documents/
|   |-- research/
|   |-- teaching/
|   |-- assessment/
|   |-- students/
|   `-- curriculum/
|-- hooks/
|-- lib/
|   |-- api/
|   |-- auth/
|   |-- constants/
|   |-- supabase/
|   `-- utils/
|-- public/
|-- types/
|-- middleware.ts
|-- next.config.ts
|-- package.json
|-- tailwind.config.ts
`-- tsconfig.json
```

Feature-specific components, schemas, hooks, and query definitions belong under `features/<module>/`. Generic primitives belong under `components/`.

## 4. Shared Domain Contract

Import shared contracts from `@pedago/shared` rather than duplicating them.

Use these exact module keys:

```ts
type ModuleKey =
  | "research"
  | "teaching"
  | "assessment"
  | "student"
  | "curriculum";
```

Use these exact analysis types:

```ts
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
```

Use these exact job states:

```ts
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

All AI findings must expose:

```ts
interface EvidenceReference {
  id: string;
  documentId?: string;
  sourceUrl?: string;
  title: string;
  locator?: string;
  excerpt: string;
  publishedYear?: number;
}

interface Finding {
  id: string;
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  evidence: EvidenceReference[];
  limitations: string[];
  requiresHumanReview: boolean;
}
```

Never render a confidence score without evidence and limitations nearby.

## 5. Visual Design System

The visual direction is:

> Swiss editorial precision combined with a futuristic digital atmosphere.

### Foundation

- Swiss/International Typographic Style
- Strong responsive grid
- Mathematical alignment and predictable gutters
- Generous whitespace
- Clear typographic hierarchy
- Intentional asymmetry, never random placement
- Structured Bento layouts
- Minimal decorative elements
- Functional design first

### Light Theme

- Warm, bright neutral background rather than sterile white
- Clean typography and high readability
- Soft shadows
- Controlled aurora accents
- Subtle glass only on selected surfaces

### Dark Theme

- Use deep navy, graphite, charcoal, blue-gray, or muted purple
- Never use pure black as the primary background
- Clearly separate page, section, card, glass, and interactive layers
- Keep contrast WCAG AA compliant

### Color and Proportion

- Use an approximate 60/30/10 dominant/secondary/accent distribution
- Use the golden ratio as a loose composition and type-scale guide
- Define all colors as semantic CSS variables
- Use one controlled accent family with theme-aware aurora variants

### Typography

- Use a modern Swiss sans-serif through `next/font`
- Large, confident headings
- Small uppercase section labels used sparingly
- Numeric metadata for analytical cards
- No more than two font families

### Glass and Gradients

- Glassmorphism supports the design; it does not define every card
- Use it for navigation, overlays, important cards, and floating controls
- Aurora gradients must be blurred, slow, low-opacity, and atmospheric
- Avoid neon-heavy, generic AI landing-page styling

## 6. Ambient Interaction System

Implement one reusable `AmbientBackground` system only on:

- Landing page
- Login page
- Sign-up page

It combines:

- Slowly drifting floating spores
- Gentle cursor repulsion
- A subtle fading cursor trail
- A large, low-opacity cursor gradient glow
- Slow aurora background movement

Requirements:

- Use `requestAnimationFrame`
- Use GPU-friendly transforms or a lightweight canvas
- Clean up every listener and frame
- Cap particle counts based on viewport size
- Reduce particles and gradient complexity on mobile
- Disable cursor-dependent effects on touch devices
- Respect `prefers-reduced-motion`
- Never block pointer interactions
- Keep content more visually prominent than the effect

Do not use this system inside analytical dashboards.

## 7. Global Application Shell

Build:

- Responsive collapsible left sidebar
- Top bar with workspace selector, global search, notifications, theme toggle, and profile menu
- Mobile bottom navigation or drawer
- Breadcrumbs
- Command palette
- Consistent page header with section number, title, explanation, and primary action
- Analysis activity indicator
- Accessible skip link

Sidebar sections:

- Overview
- Research Intelligence
- Teaching Intelligence
- Assessment Intelligence
- Student Intelligence
- Curriculum Intelligence
- Documents
- Settings

Persist the selected workspace. Prevent content from one workspace appearing in another.

## 8. Shared Workflow Pattern

Every analysis feature must use the same understandable journey:

```text
Input and Context
  -> Review Input
  -> Processing Progress
  -> Evidence
  -> Findings
  -> Recommended Actions
  -> Faculty Review/Edit
  -> Export or Save
```

Create reusable components:

- `AnalysisWizard`
- `DocumentDropzone`
- `ContextSelector`
- `ProcessingTimeline`
- `EvidenceDrawer`
- `FindingCard`
- `ConfidenceBadge`
- `LimitationNotice`
- `HumanReviewBanner`
- `EditableArtifact`
- `ExportMenu`
- `EmptyState`
- `ErrorState`
- `SkeletonState`

Never fake a successful result. Errors must be actionable and retryable.

## 9. Required Pages and Behavior

### Landing Page

Present the faculty problem, one flagship teaching-improvement journey, five intelligence workspaces, evidence-first AI principles, and clear login/demo calls to action. Use a structured Bento composition and the ambient system.

### Authentication

Implement email/password authentication and optional magic-link login through Supabase. Include validation, loading states, error states, callback handling, protected routes, and logout.

### Dashboard

Show:

- Recent analyses
- Action items requiring faculty review
- Documents awaiting extraction
- Cross-module activity
- Teaching confusion trend
- Research activity
- Student and curriculum alerts

Do not show fabricated analytics. Use API results or explicit demo fixtures selected through a visible demo mode.

### Research Gap Verification

Input:

- Research topic
- Claimed gap
- Method, problem, population, and optional year range
- Uploaded papers or source selection

Output:

- Verdict: `supported`, `partially_supported`, `not_supported`, or `insufficient_evidence`
- Evidence matrix
- Closest prior work
- Search coverage
- Contradicting and supporting papers
- Limitations
- Suggested reformulation

Use careful language: “No matching work was found in searched sources,” never “Nobody has done this.”

### Research Evolution and Trend Detector

Render:

- Year timeline
- Method-frequency stacked chart
- Emerging and declining topic cards
- Paper count and citation context
- Filters by year, venue, method, and keyword
- Evidence list behind every narrative trend

### Research Question Stress Tester

Evaluate:

- Clarity
- Specificity
- Variables
- Population/context
- Measurability
- Feasibility
- Novelty evidence
- Hypothesis quality
- Scope

Show a rubric, issue list, improved alternatives, and side-by-side comparison. Faculty chooses whether to accept changes.

### Research Decision Copilot

Compare candidate research directions using a transparent decision matrix:

- Novelty evidence
- Feasibility
- Data availability
- Method fit
- Expected contribution
- Risk

Weights must be editable. Recommendations must cite evidence.

### PulseAI Teaching Feedback

Accept:

- Teacher text or audio note
- Anonymous exit slips
- Optional quiz summaries
- Course and syllabus context

Render:

- Sentiment/confusion trend
- Topic friction cards
- Direct feedback separately from inferred hypotheses
- Three-bullet next-class action plan
- Editable warm-up questions

Label information explicitly as:

- Direct student feedback
- Teacher observation
- Data-derived pattern
- AI-generated hypothesis

Never invent a student quote.

### Query Clustering

Accept CSV, TXT, or pasted messages. Show:

- Cluster sizes
- Representative anonymized examples
- Conceptual versus administrative intent
- Syllabus mapping
- Root-cause hypothesis
- Editable broadcast response
- Optional revision-slide outline

### Exam Misconception Diagnostics

Accept:

- Question paper
- Rubric/answer key
- Itemized marks or anonymized answers
- Relevant course documents

Render:

- Question-level heatmap
- Error clusters
- Syllabus-topic mapping
- Evidence and confidence
- 15-minute remedial lesson
- Alternative analogy or explanation
- Two or three follow-up questions

### Student Portfolio

Show:

- Academic summary
- Categorized verified/unverified achievements
- Configurable 360-degree radar chart
- Evidence timeline
- Workload-risk signals with neutral language
- Human-review state

Clearly distinguish `extracted`, `student_submitted`, `issuer_verified`, `faculty_verified`, and `unverified`.

### LOR Dossier

Accept a student, target program, and supporting course evidence. Render:

- Requirement-to-evidence matrix
- Strengths dossier
- Missing-evidence warnings
- Claim-level source references
- Editable outline
- TipTap LOR draft
- Faculty approval and export controls

Never make unsupported factual claims.

### Curriculum Alignment

Accept:

- Syllabus and learning outcomes
- Target industry sector
- Uploaded job-description dataset or configured source

Render:

- Alignment score with methodology tooltip
- Radar chart
- Current, legacy, and missing skill matrix
- Evidence counts and retrieval date
- Prioritized micro-updates
- Plug-and-play lab and project ideas

## 10. API Integration

Use `NEXT_PUBLIC_API_BASE_URL`. Create one typed API client with:

- Supabase access-token attachment
- JSON handling
- Request ID handling
- Abort signals
- Typed error parsing
- No swallowed failures

Required endpoints:

```text
GET    /api/v1/me
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/documents
POST   /api/v1/documents/upload-intent
POST   /api/v1/documents/:id/complete
DELETE /api/v1/documents/:id
GET    /api/v1/analyses
POST   /api/v1/analyses
GET    /api/v1/analyses/:id
POST   /api/v1/analyses/:id/cancel
POST   /api/v1/analyses/:id/retry
POST   /api/v1/analyses/:id/approve
PATCH  /api/v1/artifacts/:id
POST   /api/v1/artifacts/:id/export
GET    /api/v1/students
GET    /api/v1/students/:id
POST   /api/v1/students/:id/achievements
GET    /api/v1/research/sources
GET    /api/v1/industry/sources
```

Start an analysis with:

```json
{
  "workspaceId": "uuid",
  "type": "exam_misconception",
  "title": "CSE 2201 Midterm Analysis",
  "documentIds": ["uuid"],
  "input": {},
  "settings": {}
}
```

Use TanStack Query for caching and invalidation. Poll active analyses with an adaptive interval, or subscribe to Supabase Realtime if configured. Stop polling terminal states.

## 11. Authentication and Privacy

- Protect all dashboard routes
- Never place the Supabase service-role key in frontend code
- Never expose private storage paths as public URLs
- Use signed upload instructions from the backend
- Do not log student content or access tokens
- Redact personally identifiable information in UI analytics where not required
- Show privacy and consent indicators for student data

## 12. Accessibility and Responsiveness

- WCAG AA contrast
- Keyboard-operable navigation, dialogs, tabs, and charts
- Visible focus indicators
- Proper labels, landmarks, headings, and error descriptions
- Text alternatives and tabular summaries for charts
- Mobile layouts must be recomposed rather than scaled-down desktop layouts
- Touch targets at least 44px
- Honor reduced motion

## 13. Loading, Empty, Error, and Demo States

Every data surface must implement:

- Loading skeleton
- Genuine empty state with next action
- Permission error
- Validation error
- Network error
- AI-processing failure
- Retry behavior

Demo data must be isolated under an explicit `demo` mode and visibly labeled. It must never silently replace failed API data.

## 14. Testing and Quality

Add:

- Unit tests for schemas, formatting, scoring display, and utility functions
- React Testing Library tests for important workflows
- Playwright coverage for:
  - Login
  - Upload and launch analysis
  - View evidence-backed result
  - Edit and approve an artifact
  - Workspace isolation

Run existing lint, type-check, test, and build scripts. Resolve errors before completion.

## 15. Definition of Done

The frontend is complete when:

- All listed routes and workspaces exist
- The flagship teaching-improvement flow works end to end against the backend
- Research-gap verification works end to end
- Remaining modules have functional input, analysis progress, evidence, results, and review flows
- Light and dark themes are polished
- Landing/auth ambient effects meet performance and reduced-motion requirements
- Analytical dashboards remain restrained and readable
- AI evidence, limitations, and human-review states are always visible
- No mocked success paths are used outside explicit demo mode
- The app passes lint, type-check, tests, and production build

