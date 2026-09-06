import { storageBuckets, type ArtifactExport, type ArtifactSummary, type ExportArtifactInput, type UpdateArtifactInput } from "@pedago/shared";
import type { ArtifactRow, Json } from "@pedago/shared/database";
import type { Env } from "../../config/env.js";
import type { StorageProvider } from "../../providers/storage/storage-provider.js";
import type { AnalysisRepository } from "../../repositories/analysis-repository.js";
import type { IdempotencyRepository } from "../../repositories/misc-repositories.js";
import { AppError } from "../../utils/errors.js";
import { hashObject } from "../../utils/ids.js";
import { toArtifactSummary } from "../analysis/analysis-service.js";
import type { AuditContext, AuditService } from "../audit/audit-service.js";
import { CONTRIBUTOR_ROLES, type AccessService } from "../workspaces/workspace-service.js";

type RequestAudit = Pick<AuditContext, "actorId" | "requestId">;

export class ArtifactService {
  constructor(
    private readonly analyses: AnalysisRepository,
    private readonly idempotency: IdempotencyRepository,
    private readonly storage: StorageProvider,
    private readonly access: AccessService,
    private readonly audit: AuditService,
    private readonly env: Pick<Env, "EXPORT_URL_TTL_SECONDS">,
  ) {}

  async update(userId: string, artifactId: string, input: UpdateArtifactInput, audit: RequestAudit): Promise<ArtifactSummary> {
    const artifact = await this.load(userId, artifactId);
    if (artifact.status === "exported" && input.status !== undefined && input.status !== "exported") {
      throw AppError.conflict("Exported artifacts cannot change status; create a new export after editing");
    }
    if (input.status === "approved" || input.status === "exported") {
      // Approval is a deliberate faculty action recorded with an approver; export happens via /export.
      if (input.status === "exported") throw AppError.validation("Use the export endpoint to mark an artifact as exported");
    }
    const contentChanged = input.content !== undefined || input.contentText !== undefined;
    const nextVersion = contentChanged ? artifact.version + 1 : artifact.version;
    const nextStatus = input.status ?? (contentChanged ? "faculty_edited" : artifact.status);
    const updated = await this.analyses.updateArtifact(artifactId, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content as Json } : {}),
      ...(input.contentText !== undefined ? { content_text: input.contentText } : {}),
      version: nextVersion,
      status: nextStatus,
      ...(nextStatus === "approved" ? { approved_at: new Date().toISOString(), approved_by: userId } : {}),
    });
    if (!updated) throw AppError.notFound("Artifact");
    if (contentChanged) {
      await this.analyses.addArtifactVersion({
        organization_id: artifact.organization_id,
        workspace_id: artifact.workspace_id,
        artifact_id: artifactId,
        version: nextVersion,
        content: updated.content,
        content_text: updated.content_text,
        edited_by: userId,
      });
    }
    await this.audit.record(
      { ...audit, organizationId: artifact.organization_id, workspaceId: artifact.workspace_id },
      "artifact.updated",
      { type: "artifact", id: artifactId },
      { version: nextVersion, status: nextStatus, contentChanged },
    );
    return toArtifactSummary(updated);
  }

  async export(userId: string, artifactId: string, input: ExportArtifactInput, idempotencyKey: string | null, audit: RequestAudit): Promise<{ export: ArtifactExport; created: boolean }> {
    const artifact = await this.load(userId, artifactId);
    if (artifact.status !== "approved" && artifact.status !== "exported") {
      throw AppError.conflict("Artifacts must be approved by faculty before export");
    }
    const scope = `artifact_export:${artifactId}`;
    const requestHash = hashObject({ artifactId, version: artifact.version, format: input.format });
    if (idempotencyKey) {
      const existing = await this.idempotency.find(artifact.workspace_id, userId, scope, idempotencyKey);
      if (existing) {
        if (existing.request_hash !== requestHash) {
          throw AppError.conflict("Idempotency key was already used with a different export request");
        }
        return { export: existing.response as unknown as ArtifactExport, created: false };
      }
    }
    const body = input.format === "json" ? JSON.stringify({ title: artifact.title, type: artifact.type, version: artifact.version, content: artifact.content }, null, 2) : renderMarkdown(artifact);
    const path = `${artifact.organization_id}/${artifact.workspace_id}/${artifact.analysis_id}/${artifact.id}-v${artifact.version}.${input.format === "json" ? "json" : "md"}`;
    await this.storage.upload(storageBuckets.generatedExports, path, Buffer.from(body, "utf8"), input.format === "json" ? "application/json" : "text/markdown");
    const signed = await this.storage.createSignedDownload(storageBuckets.generatedExports, path, this.env.EXPORT_URL_TTL_SECONDS);
    const result: ArtifactExport = {
      artifactId,
      version: artifact.version,
      format: input.format,
      bucket: storageBuckets.generatedExports,
      path,
      downloadUrl: signed.url,
      expiresAt: signed.expiresAt,
    };
    await this.analyses.updateArtifact(artifactId, { status: "exported", exported_at: new Date().toISOString() });
    if (idempotencyKey) {
      try {
        await this.idempotency.save({
          workspace_id: artifact.workspace_id,
          user_id: userId,
          scope,
          key: idempotencyKey,
          request_hash: requestHash,
          response: result as unknown as Json,
        });
      } catch (error) {
        if (!(error instanceof AppError && error.code === "CONFLICT")) throw error;
      }
    }
    await this.audit.record(
      { ...audit, organizationId: artifact.organization_id, workspaceId: artifact.workspace_id },
      "artifact.exported",
      { type: "artifact", id: artifactId },
      { format: input.format, version: artifact.version },
    );
    return { export: result, created: true };
  }

  private async load(userId: string, artifactId: string): Promise<ArtifactRow> {
    const artifact = await this.analyses.getArtifact(artifactId);
    if (!artifact) throw AppError.notFound("Artifact");
    await this.access.requireMembership(userId, artifact.workspace_id, CONTRIBUTOR_ROLES);
    return artifact;
  }
}

function renderMarkdown(artifact: ArtifactRow): string {
  const header = `# ${artifact.title}\n\n_Type: ${artifact.type} · Version ${artifact.version} · Status: ${artifact.status}_\n\n`;
  return `${header}${artifact.content_text}\n`;
}
