import {
  storageBuckets,
  type CompleteUploadInput,
  type DocumentSummary,
  type UploadIntent,
  type UploadIntentInput,
} from "@pedago/shared";
import type { DocumentRow } from "@pedago/shared/database";
import sanitizeFilename from "sanitize-filename";
import type { Env } from "../../config/env.js";
import type { JobDispatcher } from "../../jobs/dispatcher.js";
import { extensionOf, getMimeRule, PURPOSE_INPUT_CLASSES } from "../../providers/document-processing/mime.js";
import type { StorageProvider } from "../../providers/storage/storage-provider.js";
import type { DocumentRepository } from "../../repositories/document-repository.js";
import { AppError } from "../../utils/errors.js";
import { addDays, newId } from "../../utils/ids.js";
import type { AuditContext, AuditService } from "../audit/audit-service.js";
import { CONTRIBUTOR_ROLES, type AccessService } from "../workspaces/workspace-service.js";

type RequestAudit = Pick<AuditContext, "actorId" | "requestId">;

export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly storage: StorageProvider,
    private readonly access: AccessService,
    private readonly audit: AuditService,
    private readonly jobs: JobDispatcher,
    private readonly env: Pick<Env, "MAX_UPLOAD_BYTES" | "SIGNED_URL_TTL_SECONDS" | "DEFAULT_RETENTION_DAYS">,
  ) {}

  async list(userId: string, workspaceId: string, options: { limit: number; offset: number; kind?: string; status?: string; courseId?: string }) {
    await this.access.requireMembership(userId, workspaceId);
    const [rows, total] = await Promise.all([this.documents.list(workspaceId, options), this.documents.count(workspaceId)]);
    return { items: rows.map(toDocumentSummary), total };
  }

  async createUploadIntent(userId: string, input: UploadIntentInput, audit: RequestAudit): Promise<UploadIntent> {
    const { workspace } = await this.access.requireMembership(userId, input.workspaceId, CONTRIBUTOR_ROLES);
    const rule = getMimeRule(input.mimeType);
    if (!rule) {
      throw AppError.uploadInvalid(`Unsupported content type: ${input.mimeType}`);
    }
    if (!PURPOSE_INPUT_CLASSES[input.purpose].includes(rule.inputClass)) {
      throw AppError.uploadInvalid(`Content type ${input.mimeType} is not allowed for purpose ${input.purpose}`);
    }
    const maxBytes = Math.min(rule.maxBytes, this.env.MAX_UPLOAD_BYTES);
    if (input.byteSize > maxBytes) {
      throw AppError.uploadInvalid(`File exceeds the maximum size of ${maxBytes} bytes`, { maxBytes });
    }
    const extension = extensionOf(input.filename);
    if (extension && !rule.extensions.includes(extension)) {
      throw AppError.uploadInvalid(`File extension .${extension} does not match content type ${input.mimeType}`);
    }
    const safeName = sanitizeFilename(input.filename).replace(/\s+/g, "_").slice(0, 120) || `upload.${rule.extensions[0]}`;
    const retentionDays = input.retentionDays ?? this.env.DEFAULT_RETENTION_DAYS;
    const bucket = bucketForPurpose(input.purpose);
    const documentId = newId();
    const storagePath = `${workspace.organization_id}/${workspace.id}/${documentId}/${safeName}`;

    const document = await this.documents.create({
      id: documentId,
      organization_id: workspace.organization_id,
      workspace_id: workspace.id,
      created_by: userId,
      course_id: input.courseId ?? null,
      kind: input.kind,
      title: input.title,
      original_filename: safeName,
      mime_type: input.mimeType,
      byte_size: input.byteSize,
      storage_bucket: bucket,
      storage_path: storagePath,
      status: "pending_upload",
      language: input.language ?? null,
      contains_personal_data: input.containsPersonalData || input.purpose === "student_evidence",
      retention_until: addDays(new Date(), retentionDays).toISOString(),
    });
    const signed = await this.storage.createSignedUpload(bucket, storagePath, {
      expiresInSeconds: this.env.SIGNED_URL_TTL_SECONDS,
      contentType: input.mimeType,
    });
    await this.audit.record(
      { ...audit, organizationId: workspace.organization_id, workspaceId: workspace.id },
      "document.upload_intent",
      { type: "document", id: document.id },
      { kind: input.kind, mimeType: input.mimeType, byteSize: input.byteSize, purpose: input.purpose },
    );
    return {
      document: toDocumentSummary(document),
      upload: {
        method: "PUT",
        url: signed.url,
        token: signed.token,
        headers: { "Content-Type": input.mimeType, "x-upsert": "false" },
        expiresAt: signed.expiresAt,
        maxBytes,
      },
    };
  }

  async completeUpload(userId: string, documentId: string, input: CompleteUploadInput, audit: RequestAudit): Promise<DocumentSummary> {
    const document = await this.loadForUser(userId, documentId, CONTRIBUTOR_ROLES);
    if (document.status !== "pending_upload" && document.status !== "uploaded") {
      if (document.status === "ready" || document.status === "extracting") return toDocumentSummary(document);
      throw AppError.conflict(`Document is in status ${document.status} and cannot be completed`);
    }
    const object = await this.storage.head(document.storage_bucket, document.storage_path);
    if (!object) {
      throw AppError.uploadInvalid("Uploaded object was not found in storage");
    }
    if (object.size <= 0 || object.size > Math.max(document.byte_size * 1.05, document.byte_size + 1024)) {
      throw AppError.uploadInvalid("Uploaded object size does not match the declared size", {
        declared: document.byte_size,
        actual: object.size,
      });
    }
    if (object.contentType && object.contentType.split(";")[0]!.trim() !== document.mime_type) {
      throw AppError.uploadInvalid("Uploaded object content type does not match the declared type");
    }
    const updated =
      (await this.documents.transitionStatus(documentId, ["pending_upload"], {
        status: "uploaded",
        byte_size: object.size,
        content_hash: input.contentHash ?? null,
        extraction_error_code: null,
      })) ?? document;
    await this.audit.record(
      { ...audit, organizationId: document.organization_id, workspaceId: document.workspace_id },
      "document.completed",
      { type: "document", id: documentId },
      { byteSize: object.size },
    );
    await this.jobs.enqueueDocumentProcessing({ documentId, workspaceId: document.workspace_id, requestId: audit.requestId, reason: "upload" });
    return toDocumentSummary(updated);
  }

  async get(userId: string, documentId: string, audit: RequestAudit): Promise<DocumentSummary & { chunkCount: number; extraction: Record<string, unknown> | null }> {
    const document = await this.loadForUser(userId, documentId);
    const [chunkCount, extraction] = await Promise.all([
      this.documents.countChunks(documentId),
      this.documents.getLatestExtraction(documentId),
    ]);
    await this.audit.record(
      { ...audit, organizationId: document.organization_id, workspaceId: document.workspace_id },
      "document.accessed",
      { type: "document", id: documentId },
    );
    return {
      ...toDocumentSummary(document),
      chunkCount,
      extraction: extraction
        ? {
            extractor: extraction.extractor,
            extractorVersion: extraction.extractor_version,
            completedAt: extraction.completed_at,
            errorCode: extraction.error_code,
            metadata: safeExtractionMetadata(extraction.metadata),
          }
        : null,
    };
  }

  async delete(userId: string, documentId: string, audit: RequestAudit): Promise<void> {
    const document = await this.loadForUser(userId, documentId, CONTRIBUTOR_ROLES);
    if (document.status === "deleted") return;
    await this.storage.remove(document.storage_bucket, document.storage_path).catch(() => undefined);
    await this.documents.deleteChunks(documentId);
    await this.documents.update(documentId, { status: "deleted", deleted_at: new Date().toISOString() });
    await this.audit.record(
      { ...audit, organizationId: document.organization_id, workspaceId: document.workspace_id },
      "document.deleted",
      { type: "document", id: documentId },
    );
  }

  async reprocess(userId: string, documentId: string, audit: RequestAudit): Promise<DocumentSummary> {
    const document = await this.loadForUser(userId, documentId, CONTRIBUTOR_ROLES);
    if (!["uploaded", "ready", "failed"].includes(document.status)) {
      throw AppError.conflict(`Document in status ${document.status} cannot be reprocessed`);
    }
    const updated = (await this.documents.update(documentId, { status: "uploaded", extraction_error_code: null })) ?? document;
    await this.audit.record(
      { ...audit, organizationId: document.organization_id, workspaceId: document.workspace_id },
      "document.reprocess_requested",
      { type: "document", id: documentId },
    );
    await this.jobs.enqueueDocumentProcessing({ documentId, workspaceId: document.workspace_id, requestId: audit.requestId, reason: "reprocess" });
    return toDocumentSummary(updated);
  }

  private async loadForUser(userId: string, documentId: string, roles = undefined as Parameters<AccessService["requireMembership"]>[2]): Promise<DocumentRow> {
    const document = await this.documents.getById(documentId);
    if (!document || document.status === "deleted") throw AppError.notFound("Document");
    await this.access.requireMembership(userId, document.workspace_id, roles);
    return document;
  }
}

export function bucketForPurpose(purpose: UploadIntentInput["purpose"]): string {
  switch (purpose) {
    case "student_evidence":
      return storageBuckets.studentEvidence;
    case "audio_note":
      return storageBuckets.audioNotes;
    default:
      return storageBuckets.academicDocuments;
  }
}

export function toDocumentSummary(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    courseId: row.course_id,
    kind: row.kind,
    title: row.title,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    status: row.status,
    contentHash: row.content_hash,
    language: row.language,
    extractionErrorCode: row.extraction_error_code,
    retentionUntil: row.retention_until,
    containsPersonalData: row.contains_personal_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeExtractionMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null;
  // Row-level tables and OCR field values may contain personal data; expose only summary metadata.
  const rest = { ...(metadata as Record<string, unknown>) };
  delete rest.tables;
  delete rest.fields;
  return rest;
}
