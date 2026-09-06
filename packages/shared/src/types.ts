import type {
  AnalysisStatus,
  AnalysisType,
  ApiErrorCode,
  ArtifactStatus,
  ArtifactType,
  ConfidenceLevel,
  DocumentKind,
  DocumentStatus,
  EvidenceSourceType,
  ModuleKey,
  VerificationStatus,
  WorkspaceRole,
} from "./constants.js";

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface EvidenceLocator {
  page?: number;
  slide?: number;
  row?: number;
  sheet?: string;
  question?: string;
  timestampSeconds?: number;
  line?: number;
  section?: string;
  url?: string;
  [key: string]: unknown;
}

export interface EvidenceRecord {
  id: string;
  sourceType: EvidenceSourceType;
  documentId?: string;
  documentChunkId?: string;
  researchWorkId?: string;
  externalSourceUrl?: string;
  title: string;
  locator: EvidenceLocator;
  excerpt: string;
  publishedYear?: number;
  metadata?: Record<string, unknown>;
}

export interface FindingEvidenceLink {
  evidenceId: string;
  relation: "supports" | "contradicts" | "context";
}

export interface FindingRecord {
  id: string;
  title: string;
  summary: string;
  confidence: ConfidenceLevel;
  limitations: string[];
  requiresHumanReview: boolean;
  category: string;
  metrics: Record<string, unknown>;
  evidence: FindingEvidenceLink[];
}

export interface ModelMetadata {
  provider: string;
  model: string;
  promptId: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCostUsd: number | null;
  attempts: number;
}

export interface Provenance {
  analysisId: string;
  analysisType: AnalysisType;
  documentIds: string[];
  evidenceIds: string[];
  retrieval?: Record<string, unknown>;
  externalSources?: Record<string, unknown>;
  generatedAt: string;
  modelCalls: ModelMetadata[];
}

/** Every evidence-backed result returned by the API follows this shape. */
export interface EvidenceBackedResult<TOutput = Record<string, unknown>> {
  findings: FindingRecord[];
  evidence: EvidenceRecord[];
  confidence: ConfidenceLevel;
  limitations: string[];
  provenance: Provenance;
  promptVersion: string;
  model: ModelMetadata | null;
  output: TOutput;
}

export interface WorkspaceSummary {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  settings: Record<string, unknown>;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberSummary {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  workspaceId: string;
  courseId: string | null;
  kind: DocumentKind;
  title: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  status: DocumentStatus;
  contentHash: string | null;
  language: string | null;
  extractionErrorCode: string | null;
  retentionUntil: string | null;
  containsPersonalData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadIntent {
  document: DocumentSummary;
  upload: {
    method: "PUT";
    url: string;
    token: string | null;
    headers: Record<string, string>;
    expiresAt: string;
    maxBytes: number;
  };
}

export interface AnalysisSummary {
  id: string;
  workspaceId: string;
  type: AnalysisType;
  module: ModuleKey;
  title: string;
  status: AnalysisStatus;
  progress: number;
  currentStep: string | null;
  attemptCount: number;
  input: Record<string, unknown>;
  settings: Record<string, unknown>;
  promptVersion: string | null;
  modelProvider: string | null;
  modelName: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  documentIds: string[];
}

export interface AnalysisDetail extends AnalysisSummary {
  result: EvidenceBackedResult | null;
  events: AnalysisEvent[];
}

export interface AnalysisEvent {
  id: string;
  analysisId: string;
  status: AnalysisStatus;
  progress: number;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ArtifactSummary {
  id: string;
  analysisId: string;
  workspaceId: string;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  content: Record<string, unknown>;
  contentText: string;
  version: number;
  approvedAt: string | null;
  approvedBy: string | null;
  exportedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactExport {
  artifactId: string;
  version: number;
  format: "markdown" | "json";
  bucket: string;
  path: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface StudentSummary {
  id: string;
  workspaceId: string;
  externalStudentId: string;
  displayName: string;
  email: string | null;
  program: string | null;
  cohort: string | null;
  cgpa: number | null;
  consentStatus: string;
  retentionUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementSummary {
  id: string;
  studentId: string;
  workspaceId: string;
  documentId: string | null;
  title: string;
  issuer: string | null;
  achievementDate: string | null;
  category: string;
  level: string | null;
  description: string | null;
  verificationStatus: VerificationStatus;
  verificationUrl: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  extractedFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchWork {
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

export interface ResearchSourceCatalogEntry {
  key: string;
  name: string;
  description: string;
  baseUrl: string;
  requiresApiKey: boolean;
  enabled: boolean;
}

export interface IndustrySourceCatalogEntry {
  key: string;
  name: string;
  sourceType: "uploaded_dataset" | "configured_dataset";
  description: string;
  termsUrl: string | null;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string | null;
  institution: string | null;
  department: string | null;
  designation: string | null;
  workspaces: WorkspaceSummary[];
}
