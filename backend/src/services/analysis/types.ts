import type {
  AnalysisType,
  ArtifactType,
  ConfidenceLevel,
  EvidenceLocator,
  EvidenceSourceType,
  ModelMetadata,
} from "@pedago/shared";
import type { AnalysisRow, DocumentRow, WorkspaceRow } from "@pedago/shared/database";
import type { AppLogger } from "../../config/logger.js";
import type { AIProvider } from "../../providers/ai/ai-provider.js";
import type { IndustryDemandProvider } from "../../providers/industry/industry-demand-provider.js";
import type { ResearchAggregator } from "../../providers/research/research-aggregator.js";
import type { AnalysisRepository } from "../../repositories/analysis-repository.js";
import type { DocumentRepository } from "../../repositories/document-repository.js";
import type { IndustryRepository, ResearchRepository, TeachingRepository } from "../../repositories/misc-repositories.js";
import type { StudentRepository } from "../../repositories/student-repository.js";
import type { RetrievalService } from "../retrieval/retrieval-service.js";

export interface EvidenceCandidate {
  /** Short key used inside prompts (e.g. "E1"). Only these keys may be cited by the model. */
  key: string;
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

export interface FindingDraft {
  title: string;
  summary: string;
  confidence: ConfidenceLevel;
  limitations: string[];
  requiresHumanReview: boolean;
  category: string;
  metrics: Record<string, unknown>;
  evidence: { key: string; relation: "supports" | "contradicts" | "context" }[];
}

export interface ArtifactDraft {
  type: ArtifactType;
  title: string;
  content: Record<string, unknown>;
  contentText: string;
}

export interface AnalysisSettings {
  weights?: Record<string, number>;
  redactIdentifiers?: boolean;
  maxEvidence?: number;
  yearFrom?: number;
  yearTo?: number;
  [key: string]: unknown;
}

export interface HandlerDeps {
  ai: AIProvider;
  retrieval: RetrievalService;
  documents: DocumentRepository;
  analyses: AnalysisRepository;
  research: ResearchRepository;
  researchSources: ResearchAggregator;
  students: StudentRepository;
  teaching: TeachingRepository;
  industry: IndustryRepository;
  industryDemand: IndustryDemandProvider;
  logger: AppLogger;
}

export type ProgressReporter = (step: string, progress: number, message?: string) => Promise<void>;

export interface AnalysisContext<TInput> {
  analysis: AnalysisRow;
  input: TInput;
  workspace: WorkspaceRow;
  documents: DocumentRow[];
  settings: AnalysisSettings;
  signal: AbortSignal;
  deps: HandlerDeps;
  reportProgress: ProgressReporter;
}

export interface CollectedContext<TInput, TExtra = Record<string, unknown>> extends AnalysisContext<TInput> {
  evidence: EvidenceCandidate[];
  extra: TExtra;
  limitations: string[];
  retrieval: Record<string, unknown>;
  externalSources: Record<string, unknown>;
}

export interface HandlerResult<TOutput = Record<string, unknown>> {
  findings: FindingDraft[];
  artifacts: ArtifactDraft[];
  output: TOutput;
  confidence: ConfidenceLevel;
  limitations: string[];
  modelCalls: ModelMetadata[];
  promptVersion: string;
}

export interface PersistContext<TResult, TInput, TExtra = Record<string, unknown>> extends CollectedContext<TInput, TExtra> {
  result: TResult;
  evidenceIdsByKey: Map<string, string>;
  findingIds: string[];
  artifactIds: string[];
}

export interface AnalysisHandler<TInput, TResult extends HandlerResult<unknown>, TExtra = Record<string, unknown>> {
  readonly type: AnalysisType;
  readonly promptVersion: string;
  /** Whether document text must be extracted/indexed before running. */
  readonly requiresDocuments: boolean;
  validateInput(input: unknown): TInput;
  collectContext(context: AnalysisContext<TInput>): Promise<CollectedContext<TInput, TExtra>>;
  execute(context: CollectedContext<TInput, TExtra>): Promise<TResult>;
  persist(context: PersistContext<TResult, TInput, TExtra>): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAnalysisHandler = AnalysisHandler<any, HandlerResult<unknown>, any>;

export function evidenceKey(index: number): string {
  return `E${index + 1}`;
}

/** Aggregates finding confidences into an overall level (lowest supported by ≥ 1/3 of findings). */
export function overallConfidence(findings: { confidence: ConfidenceLevel }[], fallback: ConfidenceLevel = "low"): ConfidenceLevel {
  if (findings.length === 0) return fallback;
  const score = { low: 0, medium: 1, high: 2 };
  const average = findings.reduce((sum, finding) => sum + score[finding.confidence], 0) / findings.length;
  if (average >= 1.6) return "high";
  if (average >= 0.8) return "medium";
  return "low";
}
