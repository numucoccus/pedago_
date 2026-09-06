import type { AnalysisStatus, ModelMetadata, Provenance } from "@pedago/shared";
import type { AnalysisRow, DocumentRow, Json } from "@pedago/shared/database";
import type { AppLogger } from "../../config/logger.js";
import type { AnalysisRepository } from "../../repositories/analysis-repository.js";
import type { DocumentRepository } from "../../repositories/document-repository.js";
import type { WorkspaceRepository } from "../../repositories/workspace-repository.js";
import { AppError, isAppError, toAppError } from "../../utils/errors.js";
import type { AuditService } from "../audit/audit-service.js";
import type { DocumentProcessingService } from "../documents/document-processing-service.js";
import type { AnalysisRegistry } from "./registry.js";
import type { AnalysisContext, AnalysisSettings, CollectedContext, HandlerDeps, HandlerResult, PersistContext } from "./types.js";

export const MAX_ANALYSIS_ATTEMPTS = 3;

export type RunOutcome =
  | { outcome: "completed" }
  | { outcome: "failed"; code: string }
  | { outcome: "retry"; code: string; attempt: number }
  | { outcome: "skipped"; reason: string };

class CancelledError extends Error {
  constructor() {
    super("Analysis was cancelled");
    this.name = "CancelledError";
  }
}

/**
 * Runs one analysis attempt through the lifecycle
 * queued → extracting → indexing → analyzing → completed | failed | cancelled.
 * Every transition is conditional on the previous status so concurrent workers cannot double-run.
 */
export class AnalysisOrchestrator {
  constructor(
    private readonly registry: AnalysisRegistry,
    private readonly analyses: AnalysisRepository,
    private readonly documents: DocumentRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly processing: DocumentProcessingService,
    private readonly deps: HandlerDeps,
    private readonly audit: AuditService,
    private readonly logger: AppLogger,
  ) {}

  async run(analysisId: string, options: { requestId?: string | null } = {}): Promise<RunOutcome> {
    const initial = await this.analyses.getById(analysisId);
    if (!initial) return { outcome: "skipped", reason: "not_found" };
    if (initial.status !== "queued") {
      return { outcome: "skipped", reason: `status_${initial.status}` };
    }
    const attempt = initial.attempt_count + 1;
    const claimed = await this.analyses.transition(analysisId, ["queued"], {
      status: "extracting",
      attempt_count: attempt,
      started_at: initial.started_at ?? new Date().toISOString(),
      progress: 5,
      current_step: "extracting",
      failure_code: null,
      failure_message_safe: null,
    });
    if (!claimed) return { outcome: "skipped", reason: "claimed_elsewhere" };

    const log = this.logger.child({ analysisId, type: claimed.type, attempt });
    const auditContext = {
      actorId: null,
      requestId: options.requestId ?? null,
      organizationId: claimed.organization_id,
      workspaceId: claimed.workspace_id,
    };
    const abort = new AbortController();
    await this.event(claimed, "extracting", 5, `Attempt ${attempt} started`);

    try {
      const handler = this.registry.get(claimed.type);
      const workspace = await this.workspaces.getWorkspace(claimed.workspace_id);
      if (!workspace) throw AppError.analysisFailed("Workspace no longer exists");

      let input: unknown;
      try {
        input = handler.validateInput(claimed.input);
      } catch (error) {
        throw isAppError(error) ? error : AppError.validation("Analysis input is invalid", error instanceof Error ? error.message : undefined);
      }

      const documents = await this.ensureDocumentsReady(claimed, options.requestId ?? null, handler.requiresDocuments);
      await this.checkCancelled(analysisId);
      await this.transitionOrCancel(analysisId, "extracting", "indexing", 30, "Documents ready; collecting evidence");

      const context: AnalysisContext<unknown> = {
        analysis: claimed,
        input,
        workspace,
        documents,
        settings: (claimed.settings ?? {}) as AnalysisSettings,
        signal: abort.signal,
        deps: this.deps,
        reportProgress: async (step, progress, message) => {
          await this.analyses.update(analysisId, { current_step: step, progress: Math.min(99, Math.max(0, Math.round(progress))) });
          if (message) {
            const current = await this.analyses.getById(analysisId);
            if (current) await this.event(current, current.status, progress, message);
          }
        },
      };

      const collected: CollectedContext<unknown, unknown> = await handler.collectContext(context);
      await this.checkCancelled(analysisId);
      await this.transitionOrCancel(analysisId, "indexing", "analyzing", 55, `Analyzing with ${collected.evidence.length} evidence items`);

      const result: HandlerResult<unknown> = await handler.execute(collected);
      await this.checkCancelled(analysisId);

      const persisted = await this.persistCore(claimed, collected, result);
      const persistContext: PersistContext<HandlerResult<unknown>, unknown, unknown> = {
        ...collected,
        result,
        evidenceIdsByKey: persisted.evidenceIdsByKey,
        findingIds: persisted.findingIds,
        artifactIds: persisted.artifactIds,
      };
      await handler.persist(persistContext);

      const lastModel: ModelMetadata | null = result.modelCalls[result.modelCalls.length - 1] ?? null;
      const provenance: Provenance = {
        analysisId,
        analysisType: claimed.type,
        documentIds: documents.map((document) => document.id),
        evidenceIds: [...persisted.evidenceIdsByKey.values()],
        retrieval: collected.retrieval,
        externalSources: collected.externalSources,
        generatedAt: new Date().toISOString(),
        modelCalls: result.modelCalls,
      };
      const completed = await this.analyses.transition(analysisId, ["analyzing"], {
        status: "completed",
        progress: 100,
        current_step: "completed",
        completed_at: new Date().toISOString(),
        prompt_version: result.promptVersion,
        model_provider: lastModel?.provider ?? null,
        model_name: lastModel?.model ?? null,
        result: {
          output: result.output,
          confidence: result.confidence,
          limitations: [...new Set([...collected.limitations, ...result.limitations])],
        } as unknown as Json,
        provenance: provenance as unknown as Json,
      });
      if (!completed) throw new CancelledError();
      await this.event(completed, "completed", 100, "Analysis completed", {
        findings: persisted.findingIds.length,
        evidence: persisted.evidenceIdsByKey.size,
        artifacts: persisted.artifactIds.length,
      });
      await this.audit.record(auditContext, "analysis.completed", { type: "analysis", id: analysisId }, {
        findings: persisted.findingIds.length,
        promptVersion: result.promptVersion,
        attempt,
      });
      log.info({ findings: persisted.findingIds.length }, "Analysis completed");
      return { outcome: "completed" };
    } catch (error) {
      abort.abort();
      if (error instanceof CancelledError) {
        log.info("Analysis cancelled during run");
        return { outcome: "skipped", reason: "cancelled" };
      }
      const appError = toAppError(error);
      const code = appError.code;
      const retryable = appError.retryable && attempt < MAX_ANALYSIS_ATTEMPTS;
      const current = await this.analyses.getById(analysisId);
      if (!current || current.status === "cancelled") {
        return { outcome: "skipped", reason: "cancelled" };
      }
      const nextStatus: AnalysisStatus = retryable ? "queued" : "failed";
      const updated = await this.analyses.transition(analysisId, ["extracting", "indexing", "analyzing"], {
        status: nextStatus,
        failure_code: code,
        failure_message_safe: safeMessage(appError),
        current_step: retryable ? "retry_scheduled" : "failed",
        ...(retryable ? {} : { completed_at: new Date().toISOString() }),
      });
      if (updated) {
        await this.event(updated, nextStatus, updated.progress, retryable ? `Retry scheduled after ${code}` : `Failed with ${code}`, {
          code,
          retryable,
          attempt,
        });
      }
      await this.audit.record(auditContext, "analysis.failed", { type: "analysis", id: analysisId }, { code, retryable, attempt });
      log.warn({ code, retryable, err: appError.code === "INTERNAL_ERROR" ? appError : undefined }, "Analysis attempt failed");
      return retryable ? { outcome: "retry", code, attempt: attempt + 1 } : { outcome: "failed", code };
    }
  }

  private async ensureDocumentsReady(analysis: AnalysisRow, requestId: string | null, required: boolean): Promise<DocumentRow[]> {
    const links = await this.analyses.listDocuments(analysis.id);
    const documents = await this.documents.getManyByIds(links.map((link) => link.document_id));
    const ready: DocumentRow[] = [];
    for (const document of documents) {
      if (document.workspace_id !== analysis.workspace_id) {
        throw AppError.forbidden("Analysis references a document outside its workspace");
      }
      if (document.status === "ready") {
        ready.push(document);
        continue;
      }
      if (document.status === "pending_upload" || document.status === "deleted") {
        throw AppError.documentProcessing(`Document ${document.id} is ${document.status}`, { details: { documentId: document.id } });
      }
      if (document.status === "extracting") {
        throw AppError.providerUnavailable(`Document ${document.id} is still being processed`);
      }
      const outcome = await this.processing.process(document.id, { requestId });
      if (outcome.status !== "ready") {
        throw AppError.documentProcessing(`Document ${document.id} could not be processed (${outcome.errorCode ?? outcome.status})`, {
          details: { documentId: document.id, code: outcome.errorCode },
        });
      }
      const refreshed = await this.documents.getById(document.id);
      if (refreshed) ready.push(refreshed);
    }
    if (required && ready.length === 0 && links.length > 0) {
      throw AppError.documentProcessing("No analysable documents are available");
    }
    return ready;
  }

  private async persistCore(analysis: AnalysisRow, collected: CollectedContext<unknown, unknown>, result: HandlerResult<unknown>) {
    const evidenceKeys = new Set(collected.evidence.map((item) => item.key));
    for (const finding of result.findings) {
      for (const link of finding.evidence) {
        if (!evidenceKeys.has(link.key)) {
          throw AppError.aiOutputInvalid(`Finding cites unknown evidence key ${link.key}`, { key: link.key });
        }
      }
    }
    await this.analyses.clearDerivedResults(analysis.id);
    const tenant = { organization_id: analysis.organization_id, workspace_id: analysis.workspace_id, created_by: analysis.created_by };

    const evidenceRows = await this.analyses.insertEvidence(
      collected.evidence.map((item) => ({
        ...tenant,
        analysis_id: analysis.id,
        source_type: item.sourceType,
        document_chunk_id: item.documentChunkId ?? null,
        research_work_id: item.researchWorkId ?? null,
        external_source_url: item.externalSourceUrl ?? null,
        title: item.title,
        locator: item.locator as Json,
        excerpt: item.excerpt,
        published_year: item.publishedYear ?? null,
        metadata: { key: item.key, documentId: item.documentId ?? null, ...(item.metadata ?? {}) } as Json,
      })),
    );
    const evidenceIdsByKey = new Map<string, string>();
    evidenceRows.forEach((row, index) => evidenceIdsByKey.set(collected.evidence[index]!.key, row.id));

    const findingRows = await this.analyses.insertFindings(
      result.findings.map((finding, index) => ({
        ...tenant,
        analysis_id: analysis.id,
        title: finding.title,
        summary: finding.summary,
        confidence: finding.confidence,
        limitations: finding.limitations,
        requires_human_review: finding.requiresHumanReview,
        category: finding.category,
        metrics: finding.metrics as Json,
        sort_order: index,
      })),
    );
    const links = findingRows.flatMap((row, index) => {
      const seen = new Set<string>();
      return result.findings[index]!.evidence
        .filter((link) => {
          const id = evidenceIdsByKey.get(link.key)!;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((link) => ({ finding_id: row.id, evidence_item_id: evidenceIdsByKey.get(link.key)!, relation: link.relation }));
    });
    await this.analyses.insertFindingEvidence(links);

    const existingArtifacts = await this.analyses.listArtifacts(analysis.id);
    const preservedTypes = new Set(existingArtifacts.map((artifact) => artifact.type));
    const artifactRows = await this.analyses.insertArtifacts(
      result.artifacts
        .filter((artifact) => !preservedTypes.has(artifact.type))
        .map((artifact) => ({
          ...tenant,
          analysis_id: analysis.id,
          type: artifact.type,
          status: "draft" as const,
          title: artifact.title,
          content: artifact.content as Json,
          content_text: artifact.contentText,
          version: 1,
        })),
    );
    for (const row of artifactRows) {
      await this.analyses.addArtifactVersion({
        organization_id: analysis.organization_id,
        workspace_id: analysis.workspace_id,
        artifact_id: row.id,
        version: 1,
        content: row.content,
        content_text: row.content_text,
        edited_by: analysis.created_by,
      });
    }
    return { evidenceIdsByKey, findingIds: findingRows.map((row) => row.id), artifactIds: artifactRows.map((row) => row.id) };
  }

  private async transitionOrCancel(analysisId: string, from: AnalysisStatus, to: AnalysisStatus, progress: number, message: string): Promise<AnalysisRow> {
    const row = await this.analyses.transition(analysisId, [from], { status: to, progress, current_step: to });
    if (!row) {
      throw new CancelledError();
    }
    await this.event(row, to, progress, message);
    return row;
  }

  private async checkCancelled(analysisId: string): Promise<void> {
    const current = await this.analyses.getById(analysisId);
    if (!current || current.status === "cancelled") {
      throw new CancelledError();
    }
  }

  private async event(analysis: AnalysisRow, status: AnalysisStatus, progress: number, message: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.analyses.addEvent({
      organization_id: analysis.organization_id,
      workspace_id: analysis.workspace_id,
      analysis_id: analysis.id,
      status,
      progress: Math.min(100, Math.max(0, Math.round(progress))),
      message,
      metadata: metadata as Json,
    });
  }
}

function safeMessage(error: AppError): string {
  if (error.code === "INTERNAL_ERROR") return "The analysis failed unexpectedly. The team has been notified.";
  return error.message.slice(0, 300);
}
