import type { Json } from "@pedago/shared/database";
import type { AppLogger } from "../../config/logger.js";
import type { AIProvider } from "../../providers/ai/ai-provider.js";
import type { ExtractorRouter } from "../../providers/document-processing/extractor-router.js";
import type { StorageProvider } from "../../providers/storage/storage-provider.js";
import type { DocumentRepository } from "../../repositories/document-repository.js";
import type { WorkspaceRepository } from "../../repositories/workspace-repository.js";
import { chunkSegments } from "../../utils/chunking.js";
import { AppError, isAppError, toAppError } from "../../utils/errors.js";
import { sha256 } from "../../utils/ids.js";
import { redactIdentifiers } from "../../utils/redaction.js";
import type { AuditService } from "../audit/audit-service.js";

export interface ProcessingOutcome {
  documentId: string;
  status: "ready" | "failed" | "skipped";
  chunkCount: number;
  reused: boolean;
  errorCode?: string;
}

const PIPELINE_VERSION = "doc-pipeline.v1";

/**
 * Document pipeline: verify object → sniff/route → extract → OCR/transcribe → normalize with
 * locators → redact identifiers → chunk → embed → persist. Content hashes make it idempotent.
 */
export class DocumentProcessingService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly storage: StorageProvider,
    private readonly router: ExtractorRouter,
    private readonly ai: AIProvider,
    private readonly audit: AuditService,
    private readonly logger: AppLogger,
  ) {}

  async process(documentId: string, options: { requestId?: string | null; signal?: AbortSignal } = {}): Promise<ProcessingOutcome> {
    const document = await this.documents.getById(documentId);
    if (!document || document.status === "deleted") {
      throw AppError.notFound("Document");
    }
    if (document.status === "pending_upload") {
      throw AppError.conflict("Document upload has not been completed");
    }
    const claimed = await this.documents.transitionStatus(documentId, ["uploaded", "ready", "failed"], {
      status: "extracting",
      extraction_error_code: null,
    });
    if (!claimed) {
      // Another worker owns this document right now; idempotent retry will pick it up later.
      return { documentId, status: "skipped", chunkCount: await this.documents.countChunks(documentId), reused: true };
    }
    const auditContext = {
      actorId: null,
      requestId: options.requestId ?? null,
      organizationId: document.organization_id,
      workspaceId: document.workspace_id,
    };
    const log = this.logger.child({ documentId, workspaceId: document.workspace_id });
    let extractionId: string | null = null;
    try {
      const object = await this.storage.head(document.storage_bucket, document.storage_path);
      if (!object) throw AppError.documentProcessing("Storage object is missing", { details: { code: "OBJECT_MISSING" } });
      const data = await this.storage.download(document.storage_bucket, document.storage_path);
      const contentHash = sha256(data);
      if (document.content_hash && document.content_hash !== contentHash) {
        throw AppError.documentProcessing("Uploaded content hash does not match the declared hash", {
          details: { code: "HASH_MISMATCH" },
        });
      }
      const routed = await this.router.route(data, document.mime_type);
      const existing = await this.documents.findCompletedExtraction(documentId, routed.extractor.key, routed.extractor.version, contentHash);
      const existingChunks = existing ? await this.documents.countChunks(documentId) : 0;
      if (existing && existingChunks > 0) {
        await this.documents.update(documentId, { status: "ready", content_hash: contentHash });
        log.info({ chunkCount: existingChunks }, "Reused existing extraction for identical content");
        return { documentId, status: "ready", chunkCount: existingChunks, reused: true };
      }

      const workspace = await this.workspaces.getWorkspace(document.workspace_id);
      const settings = (workspace?.settings ?? {}) as { redactIdentifiers?: boolean; chunkTokens?: number };
      const shouldRedact = settings.redactIdentifiers !== false && document.kind !== "certificate" && document.kind !== "transcript";

      const extraction = await this.documents.createExtraction({
        organization_id: document.organization_id,
        workspace_id: document.workspace_id,
        created_by: document.created_by,
        document_id: documentId,
        extractor: routed.extractor.key,
        extractor_version: routed.extractor.version,
        text_content: "",
        metadata: { contentHash, pipelineVersion: PIPELINE_VERSION } as Json,
        started_at: new Date().toISOString(),
        completed_at: null,
        error_code: null,
        error_message_safe: null,
      });
      extractionId = extraction.id;

      const extracted = await routed.extractor.extract({
        data,
        mimeType: document.mime_type,
        filename: document.original_filename,
        inputClass: routed.inputClass,
        language: document.language ?? undefined,
        signal: options.signal,
      });

      let redactionSummary: Record<string, number> = {};
      let containsIdentifiers = false;
      const segments = extracted.segments.map((segment) => {
        if (!shouldRedact) {
          const probe = redactIdentifiers(segment.text);
          containsIdentifiers = containsIdentifiers || probe.containsIdentifiers;
          return segment;
        }
        const result = redactIdentifiers(segment.text);
        containsIdentifiers = containsIdentifiers || result.containsIdentifiers;
        for (const item of result.redactions) redactionSummary[item.kind] = (redactionSummary[item.kind] ?? 0) + item.count;
        return { ...segment, text: result.text };
      });
      if (!shouldRedact) redactionSummary = {};

      const chunks = chunkSegments(segments, { maxTokens: settings.chunkTokens ?? 350 });
      if (chunks.length === 0) {
        throw AppError.documentProcessing("No text chunks were produced from the document", { details: { code: "EMPTY_CONTENT" } });
      }
      const embeddings = await this.ai.createEmbeddings(chunks.map((chunk) => chunk.content));
      if (embeddings.length !== chunks.length) {
        throw AppError.providerUnavailable("Embedding count did not match chunk count");
      }

      const storedChunks = await this.documents.replaceChunks(
        documentId,
        chunks.map((chunk, index) => ({
          organization_id: document.organization_id,
          workspace_id: document.workspace_id,
          created_by: document.created_by,
          document_id: documentId,
          extraction_id: extraction.id,
          chunk_index: chunk.index,
          content: chunk.content,
          token_count: chunk.tokenCount,
          locator: chunk.locator as Json,
          metadata: { inputClass: routed.inputClass } as Json,
          embedding: embeddings[index]!,
        })),
      );

      const normalizedText = shouldRedact ? segments.map((segment) => segment.text).join("\n\n") : extracted.text;
      await this.documents.updateExtraction(extraction.id, {
        text_content: normalizedText,
        completed_at: new Date().toISOString(),
        metadata: {
          ...extracted.metadata,
          contentHash,
          pipelineVersion: PIPELINE_VERSION,
          inputClass: routed.inputClass,
          sniffedMimeType: routed.sniffedMimeType ?? null,
          segmentCount: segments.length,
          chunkCount: storedChunks.length,
          redactions: redactionSummary,
          redactionEnabled: shouldRedact,
        } as Json,
      });
      await this.documents.update(documentId, {
        status: "ready",
        content_hash: contentHash,
        language: extracted.language ?? document.language,
        contains_personal_data: document.contains_personal_data || containsIdentifiers,
        extraction_error_code: null,
      });
      await this.audit.record(auditContext, "document.processed", { type: "document", id: documentId }, {
        chunkCount: storedChunks.length,
        extractor: routed.extractor.key,
        redacted: shouldRedact,
      });
      log.info({ chunkCount: storedChunks.length, extractor: routed.extractor.key }, "Document processed");
      return { documentId, status: "ready", chunkCount: storedChunks.length, reused: false };
    } catch (error) {
      const appError = isAppError(error) ? error : toAppError(error);
      const code = failureCode(appError);
      if (extractionId) {
        await this.documents
          .updateExtraction(extractionId, { completed_at: new Date().toISOString(), error_code: code, error_message_safe: appError.message.slice(0, 300) })
          .catch(() => undefined);
      }
      await this.documents.update(documentId, { status: "failed", extraction_error_code: code });
      await this.audit.record(auditContext, "document.processing_failed", { type: "document", id: documentId }, { code });
      log.warn({ code, retryable: appError.retryable }, "Document processing failed");
      if (appError.retryable) {
        throw appError;
      }
      return { documentId, status: "failed", chunkCount: 0, reused: false, errorCode: code };
    }
  }
}

function failureCode(error: AppError): string {
  const details = error.details as { code?: string } | undefined;
  if (details?.code) return `${error.code}:${details.code}`;
  return error.code;
}
