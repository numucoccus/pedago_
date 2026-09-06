import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../../utils/errors.js";
import type { AIProvider } from "../ai/ai-provider.js";
import type { DocumentExtractor, ExtractedDocument } from "./extractor.js";
import {
  AudioTranscriptionExtractor,
  DocxExtractor,
  ImageOcrExtractor,
  PdfExtractor,
  PlainTextExtractor,
  SpreadsheetExtractor,
} from "./extractors.js";
import { getMimeRule, sniffedTypeMatches, type InputClass } from "./mime.js";

export interface RoutedExtraction {
  inputClass: InputClass;
  extractor: DocumentExtractor;
  sniffedMimeType: string | undefined;
}

/** Validates content type (declared + sniffed) and routes to the right extractor. */
export class ExtractorRouter {
  private readonly extractors: DocumentExtractor[];

  constructor(ai: AIProvider, extra: DocumentExtractor[] = []) {
    this.extractors = [
      new PdfExtractor(),
      new DocxExtractor(),
      new PlainTextExtractor(),
      new SpreadsheetExtractor(),
      new ImageOcrExtractor(ai),
      new AudioTranscriptionExtractor(ai),
      ...extra,
    ];
  }

  async route(data: Buffer, declaredMimeType: string): Promise<RoutedExtraction> {
    const rule = getMimeRule(declaredMimeType);
    if (!rule) {
      throw AppError.documentProcessing(`Unsupported content type: ${declaredMimeType}`, { details: { code: "UNSUPPORTED_MIME" } });
    }
    const sniffed = rule.sniffable ? await fileTypeFromBuffer(data) : undefined;
    if (rule.sniffable && !sniffedTypeMatches(declaredMimeType, sniffed?.mime)) {
      throw AppError.documentProcessing("File content does not match its declared type", {
        details: { code: "MIME_MISMATCH", declared: declaredMimeType, detected: sniffed?.mime ?? "unknown" },
      });
    }
    if (!rule.sniffable) {
      const sniffedBinary = await fileTypeFromBuffer(data);
      if (sniffedBinary) {
        throw AppError.documentProcessing("File declared as text contains binary content", {
          details: { code: "MIME_MISMATCH", declared: declaredMimeType, detected: sniffedBinary.mime },
        });
      }
    }
    const extractor = this.extractors.find((candidate) => candidate.inputClasses.includes(rule.inputClass));
    if (!extractor) {
      throw AppError.documentProcessing(`No extractor registered for ${rule.inputClass}`);
    }
    return { inputClass: rule.inputClass, extractor, sniffedMimeType: sniffed?.mime };
  }

  async extract(
    data: Buffer,
    declaredMimeType: string,
    filename: string,
    options: { language?: string; signal?: AbortSignal } = {},
  ): Promise<ExtractedDocument & { inputClass: InputClass }> {
    const routed = await this.route(data, declaredMimeType);
    const extracted = await routed.extractor.extract({
      data,
      mimeType: declaredMimeType,
      filename,
      inputClass: routed.inputClass,
      language: options.language,
      signal: options.signal,
    });
    return { ...extracted, inputClass: routed.inputClass };
  }
}
