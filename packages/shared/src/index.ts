// Pedago AI Shared Domain Contracts

export type ModuleKey =
  | "research"
  | "teaching"
  | "assessment"
  | "student"
  | "curriculum";

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

export type WorkspaceRole = "owner" | "admin" | "faculty" | "reviewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: WorkspaceRole;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  institution?: string;
  department?: string;
  avatarUrl?: string;
}

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  title: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: "uploaded" | "extracting" | "indexed" | "failed";
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceReference {
  id: string;
  documentId?: string;
  sourceUrl?: string;
  title: string;
  locator?: string;
  excerpt: string;
  publishedYear?: number;
}

export interface Finding {
  id: string;
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  evidence: EvidenceReference[];
  limitations: string[];
  requiresHumanReview: boolean;
}

export interface AnalysisRecord {
  id: string;
  workspaceId: string;
  type: AnalysisType;
  title: string;
  status: AnalysisStatus;
  progressPercent: number;
  currentStep?: string;
  documentIds: string[];
  input: Record<string, unknown>;
  settings?: Record<string, unknown>;
  findings?: Finding[];
  resultData?: Record<string, unknown>;
  limitations?: string[];
  humanReviewApproved?: boolean;
  humanReviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// API Envelopes
export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

// Research Gap Verification Contracts
export type GapVerdict =
  | "supported"
  | "partially_supported"
  | "not_supported"
  | "insufficient_evidence";

export interface ResearchGapInput {
  topic: string;
  claimedGap: string;
  methodology?: string;
  population?: string;
  yearRange?: [number, number];
  documentIds?: string[];
}

export interface PriorWorkItem {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue?: string;
  similarityScore: number;
  keyDifference: string;
  isContradicting: boolean;
  citationUrl?: string;
}

export interface ResearchGapResult {
  verdict: GapVerdict;
  verdictRationale: string;
  searchCoverage: {
    queriesRun: string[];
    sourcesSearched: string[];
    totalPapersIndexed: number;
    matchCount: number;
  };
  closestPriorWork: PriorWorkItem[];
  suggestedReformulations: string[];
  findings: Finding[];
  limitations: string[];
}

// Research Evolution Contracts
export interface TrendYearPoint {
  year: number;
  paperCount: number;
  methods: Record<string, number>;
}

export interface TopicTrendItem {
  topic: string;
  status: "emerging" | "stable" | "declining";
  growthRate: number;
  evidence: EvidenceReference[];
}

export interface ResearchEvolutionResult {
  timeline: TrendYearPoint[];
  topics: TopicTrendItem[];
  findings: Finding[];
  limitations: string[];
}

// Research Question Stress Tester Contracts
export interface StressRubricDimension {
  key: string;
  name: string;
  score: number; // 0 to 10
  status: "pass" | "warning" | "critique";
  assessment: string;
  recommendation?: string;
}

export interface QuestionAlternative {
  id: string;
  text: string;
  rationale: string;
  improvedDimensions: string[];
}

export interface ResearchQuestionResult {
  originalQuestion: string;
  rubric: StressRubricDimension[];
  overallScore: number;
  identifiedIssues: string[];
  alternatives: QuestionAlternative[];
  findings: Finding[];
  limitations: string[];
}

// Research Decision Matrix Contracts
export interface DecisionCriterion {
  id: string;
  name: string;
  weight: number; // 0 to 1
  description: string;
}

export interface CandidateDirection {
  id: string;
  title: string;
  description: string;
  scores: Record<string, number>; // criterionId -> score (1-10)
  totalWeightedScore: number;
  evidenceCitations: EvidenceReference[];
  risks: string[];
}

export interface ResearchDecisionResult {
  criteria: DecisionCriterion[];
  candidates: CandidateDirection[];
  recommendedCandidateId?: string;
  recommendationRationale: string;
  findings: Finding[];
  limitations: string[];
}

// Teaching PulseAI Contracts
export interface PulseMetricPoint {
  date: string;
  topic: string;
  confusionRate: number; // 0 - 100
  sentimentScore: number; // 0 - 100
  sampleCount: number;
}

export interface TopicFriction {
  id: string;
  topic: string;
  frictionLevel: "high" | "moderate" | "low";
  studentFeedbackDirect: string[];
  teacherObservations: string[];
  dataDerivedPattern: string;
  aiHypothesis: string;
}

export interface TeachingPulseResult {
  courseName: string;
  sessionDate: string;
  timeline: PulseMetricPoint[];
  frictions: TopicFriction[];
  actionPlan: [string, string, string]; // Exactly 3-bullet next-class action plan
  warmUpQuestions: Array<{
    id: string;
    question: string;
    options?: string[];
    correctAnswer?: string;
    explanation: string;
  }>;
  findings: Finding[];
  limitations: string[];
}

// Query Clustering Contracts
export interface QueryCluster {
  id: string;
  label: string;
  intentType: "conceptual" | "administrative";
  count: number;
  syllabusTopicMap: string;
  rootCauseHypothesis: string;
  representativeQuotes: string[];
  suggestedBroadcast: string;
  revisionSlideOutline?: string[];
}

export interface QueryClusteringResult {
  totalQueriesProcessed: number;
  clusters: QueryCluster[];
  findings: Finding[];
  limitations: string[];
}

// Exam Misconception Diagnostics Contracts
export interface QuestionDiagnosticItem {
  questionNumber: string;
  topic: string;
  averageScorePercent: number;
  difficultyLevel: "high" | "medium" | "low";
  primaryMisconception: string;
  commonDistractorOrError: string;
  rootCause: string;
  remedialConcept: string;
}

export interface ExamMisconceptionResult {
  examTitle: string;
  totalStudents: number;
  overallAverage: number;
  questionDiagnostics: QuestionDiagnosticItem[];
  remedialLessonPlan: {
    durationMinutes: 15;
    title: string;
    steps: string[];
    alternativeAnalogy: string;
  };
  followUpDiagnosticQuestions: Array<{
    id: string;
    question: string;
    focusMisconception: string;
    explanation: string;
  }>;
  findings: Finding[];
  limitations: string[];
}

// Student Portfolio & LOR Contracts
export interface StudentAchievement {
  id: string;
  category: "research" | "leadership" | "academic" | "co_curricular" | "technical";
  title: string;
  description: string;
  date: string;
  verificationStatus:
    | "extracted"
    | "student_submitted"
    | "issuer_verified"
    | "faculty_verified"
    | "unverified";
  evidenceLocator?: string;
}

export interface StudentPortfolioData {
  id: string;
  studentName: string;
  studentIdNumber: string;
  department: string;
  gpa: number;
  radarScores: Record<string, number>; // e.g. Academic, Research, Leadership, Teamwork, Technical
  achievements: StudentAchievement[];
  workloadSignals: {
    signal: string;
    category: "credit_load" | "deadline_clustering" | "co_curricular_commitments";
    neutralObservation: string;
  }[];
  reviewStatus: "pending" | "reviewed" | "verified";
  findings: Finding[];
  limitations: string[];
}

export interface LorRequirementItem {
  requirement: string;
  strengthEvidence: string;
  hasDirectEvidence: boolean;
  citationReference?: string;
}

export interface LorDossierResult {
  studentName: string;
  targetProgram: string;
  requirementsMatrix: LorRequirementItem[];
  strengthsDossier: string[];
  missingEvidenceWarnings: string[];
  lorOutline: string[];
  initialDraftHtml: string;
  facultyApprovalStatus: "draft" | "approved";
  findings: Finding[];
  limitations: string[];
}

// Curriculum Alignment Contracts
export interface SkillAlignmentItem {
  skillName: string;
  status: "current" | "legacy" | "missing";
  industryDemandIndex: number; // 0 - 100
  syllabusCoverage: "absent" | "introductory" | "comprehensive";
  evidenceJobCount: number;
}

export interface CurriculumAlignmentResult {
  courseTitle: string;
  targetIndustrySector: string;
  alignmentScorePercent: number;
  methodologyDescription: string;
  radarDimensions: Array<{ dimension: string; syllabusScore: number; industryNeed: number }>;
  skillsMatrix: SkillAlignmentItem[];
  prioritizedMicroUpdates: Array<{
    priority: "high" | "medium" | "low";
    recommendation: string;
    targetModule: string;
    rationale: string;
  }>;
  plugAndPlayLabs: Array<{
    title: string;
    estimatedHours: number;
    modernTools: string[];
    description: string;
  }>;
  retrievalDate: string;
  findings: Finding[];
  limitations: string[];
}
