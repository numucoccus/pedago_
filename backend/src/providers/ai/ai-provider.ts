import type { ModelMetadata } from "@pedago/shared";
import type { ZodType } from "zod";

export interface StructuredAIRequest<T> {
  promptId: string;
  promptVersion: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  /** Evidence keys the model may cite. Anything else is rejected before persistence. */
  allowedEvidenceKeys?: string[];
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  /** Privacy-safe trace metadata (ids, counts) — never raw student content. */
  trace?: Record<string, string | number | boolean | null>;
}

export interface StructuredAIResponse<T> {
  data: T;
  model: ModelMetadata;
}

export interface AudioInput {
  data: Buffer;
  mimeType: string;
  filename: string;
  language?: string;
  signal?: AbortSignal;
}

export interface TranscriptionSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string | null;
  model: ModelMetadata;
}

export interface ImageAnalysisRequest<T> {
  promptId: string;
  promptVersion: string;
  instruction: string;
  schema: ZodType<T>;
  image: { data: Buffer; mimeType: string };
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly name: string;
  generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>>;
  createEmbeddings(texts: string[]): Promise<number[][]>;
  transcribeAudio(input: AudioInput): Promise<TranscriptionResult>;
  analyzeImage<T>(input: ImageAnalysisRequest<T>): Promise<StructuredAIResponse<T>>;
}

export interface RawCompletion {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}
