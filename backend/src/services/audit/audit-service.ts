import type { Json } from "@pedago/shared/database";
import type { AppLogger } from "../../config/logger.js";
import type { AuditRepository } from "../../repositories/misc-repositories.js";

export type AuditAction =
  | "workspace.created"
  | "workspace.updated"
  | "workspace.member_added"
  | "workspace.member_removed"
  | "document.upload_intent"
  | "document.completed"
  | "document.accessed"
  | "document.deleted"
  | "document.reprocess_requested"
  | "document.processed"
  | "document.processing_failed"
  | "analysis.created"
  | "analysis.accessed"
  | "analysis.cancelled"
  | "analysis.retried"
  | "analysis.approved"
  | "analysis.completed"
  | "analysis.failed"
  | "artifact.updated"
  | "artifact.exported"
  | "student.created"
  | "student.updated"
  | "student.accessed"
  | "achievement.created"
  | "achievement.verification_updated";

export interface AuditContext {
  actorId: string | null;
  requestId: string | null;
  organizationId: string | null;
  workspaceId: string | null;
}

/** Records audit events with safe metadata only (ids, codes, counts — never document or student text). */
export class AuditService {
  constructor(
    private readonly repository: AuditRepository,
    private readonly logger: AppLogger,
  ) {}

  async record(
    context: AuditContext,
    action: AuditAction,
    entity: { type: string; id: string | null },
    metadata: Record<string, string | number | boolean | null | string[]> = {},
  ): Promise<void> {
    try {
      await this.repository.record({
        organization_id: context.organizationId,
        workspace_id: context.workspaceId,
        actor_id: context.actorId,
        action,
        entity_type: entity.type,
        entity_id: entity.id,
        request_id: context.requestId,
        metadata: metadata as Json,
      });
    } catch (error) {
      // Audit persistence failures are logged loudly but never mask the primary operation result.
      this.logger.error({ action, entityType: entity.type, entityId: entity.id, err: error }, "Failed to record audit event");
    }
  }
}
