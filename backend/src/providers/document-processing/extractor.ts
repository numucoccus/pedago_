import type { TextSegment } from "../../utils/chunking.js";
import type { InputClass } from "./mime.js";

export interface ExtractedDocument {
  extractor: string;
  extractorVersion: string;
  text: string;
  segments: TextSegment[];
  language: string | null;
  metadata: Record<string, unknown>;
}

export interface ExtractionInput {
  data: Buffer;
  mimeType: string;
  filename: string;
  inputClass: InputClass;
  language?: string;
  signal?: AbortSignal;
}

export interface DocumentExtractor {
  readonly key: string;
  readonly version: string;
  readonly inputClasses: InputClass[];
  extract(input: ExtractionInput): Promise<ExtractedDocument>;
}
