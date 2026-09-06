// Pedago AI Shared Domain Contracts & Database Types

export * from "./constants.js";
export * from "./schemas.js";
export * from "./types.js";
export * from "./database.types.js";

// Re-export common contract aliases and intelligence contracts for frontend & backend
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: import("./constants.js").WorkspaceRole;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  institution?: string;
  department?: string;
  avatarUrl?: string;
}

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  title: string;
  fileName?: string;
  filename?: string;
  filePath?: string;
  mimeType: string;
  sizeBytes?: number;
  fileSize?: number;
  pageCount?: number;
  status: import("./database.types.js").DocumentProcessingStatus | import("./constants.js").DocumentStatus;
  purpose?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceReference {
  id: string;
  title: string;
  locator: string;
  excerpt: string;
  sourceType?: import("./constants.js").EvidenceSourceType;
  sourceUrl?: string;
  documentId?: string;
  chunkId?: string;
  publishedYear?: number;
  confidence?: import("./constants.js").ConfidenceLevel;
}


export interface Finding {
  id: string;
  title: string;
  summary: string;
  category?: string;
  confidence: import("./constants.js").ConfidenceLevel;
  evidence: EvidenceReference[];
  limitations: string[];
  requiresHumanReview: boolean;
}

export interface AnalysisCreateInput {
  workspaceId: string;
  type: import("./constants.js").AnalysisType;
  title: string;
  documentIds?: string[];
  input?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface AnalysisRecord {
  id: string;
  workspaceId: string;
  type: import("./constants.js").AnalysisType;
  title: string;
  status: import("./constants.js").AnalysisStatus;
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

// Research Gap Verification Contracts
export type GapVerdict =
  | "supported"
  | "partially_supported"
  | "not_supported"
  | "insufficient_evidence";

export interface ResearchGapInput {
  topic: string;
  claimedGap: string;
  method?: string;
  methodology?: string;
  problem?: string;
  populationContext?: string;
  population?: string;
  yearFrom?: number;
  yearTo?: number;
  yearRange?: [number, number];
  sources?: ("openalex" | "semantic_scholar" | "crossref" | "arxiv")[];
  maxResultsPerSource?: number;
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
