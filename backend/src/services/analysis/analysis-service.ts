import {
  analysisModules,
  type AnalysisDetail,
  type AnalysisEvent,
  type AnalysisSummary,
  type ArtifactSummary,
  type CreateAnalysisInput,
  type EvidenceBackedResult,
  type EvidenceRecord,
  type FindingRecord,
  type Provenance,
} from "@pedago/shared";
import type { AnalysisRow, ArtifactRow, EvidenceItemRow, FindingRow, Json } from "@pedago/shared/database";
import type { JobDispatcher } from "../../jobs/dispatcher.js";
import type { AnalysisRepository } from "../../repositories/analysis-repository.js";
import type { DocumentRepository } from "../../repositories/document-repository.js";
import type { IdempotencyRepository } from "../../repositories/misc-repositories.js";
import { AppError } from "../../utils/errors.js";
import { hashObject } from "../../utils/ids.js";
import type { AuditContext, AuditService } from "../audit/audit-service.js";
import { CONTRIBUTOR_ROLES, type AccessService } from "../workspaces/workspace-service.js";
import { MAX_ANALYSIS_ATTEMPTS } from "./analysis-orchestrator.js";
import type { AnalysisRegistry } from "./registry.js";

type RequestAudit = Pick<AuditContext, "actorId" | "requestId">;

export class AnalysisService {
  constructor(
    private readonly analyses: AnalysisRepository,
    private readonly documents: DocumentRepository,
    private readonly idempotency: IdempotencyRepository,
    private readonly registry: AnalysisRegistry,
    private readonly access: AccessService,
    private readonly audit: AuditService,
    private readonly jobs: JobDispatcher,
  ) {}

  async create(userId: string, input: CreateAnalysisInput, idempotencyKey: string | null, audit: RequestAudit): Promise<{ analysis: AnalysisSummary; created: boolean }> {
    const { workspace } = await this.access.requireMembership(userId, input.workspaceId, CONTRIBUTOR_ROLES);
    const handler = this.registry.get(input.type);
    // Validate the handler-specific input up front so faculty get a 400 instead of a failed job.
    try {
      handler.validateInput(input.input);
    } catch (error) {
      throw AppError.validation(`Invalid input for ${input.type}`, error instanceof Error ? error.message : undefined);
    }

    if (idempotencyKey) {
      const existing = await this.analyses.findByIdempotencyKey(workspace.id, userId, idempotencyKey);
      if (existing) {
        const requestHash = hashObject({ ...input, workspaceId: workspace.id });
        const storedHash = (existing.settings as { __requestHash?: string } | null)?.__requestHash;
        if (storedHash && storedHash !== requestHash) {
          throw AppError.conflict("Idempotency key was already used with a different request body");
        }
        return { analysis: await this.toSummary(existing), created: false };
      }
    }

    const documents = await this.documents.getManyByIds(input.documentIds);
    if (documents.length !== input.documentIds.length) {
      throw AppError.validation("One or more documents were not found");
    }
    for (const document of documents) {
      if (document.workspace_id !== workspace.id || document.status === "deleted") {
        throw AppError.forbidden("Documents must belong to the analysis workspace");
      }
      if (document.status === "pending_upload") {
        throw AppError.validation(`Document ${document.id} has not finished uploading`);
      }
    }

    const settings = { ...input.settings, __requestHash: hashObject({ ...input, workspaceId: workspace.id }) };
    let analysis: AnalysisRow;
    try {
      analysis = await this.analyses.create({
        organization_id: workspace.organization_id,
        workspace_id: workspace.id,
        created_by: userId,
        type: input.type,
        module: analysisModules[input.type],
        title: input.title,
        status: "queued",
        input: input.input as Json,
        settings: settings as Json,
        progress: 0,
        current_step: "queued",
        attempt_count: 0,
        idempotency_key: idempotencyKey,
      });
    } catch (error) {
      if (error instanceof AppError && error.code === "CONFLICT" && idempotencyKey) {
        const existing = await this.analyses.findByIdempotencyKey(workspace.id, userId, idempotencyKey);
        if (existing) return { analysis: await this.toSummary(existing), created: false };
      }
      throw error;
    }
    await this.analyses.setDocuments(analysis.id, input.documentIds);
    await this.analyses.addEvent({
      organization_id: workspace.organization_id,
      workspace_id: workspace.id,
      analysis_id: analysis.id,
      status: "queued",
      progress: 0,
      message: "Analysis queued",
      metadata: { documentCount: input.documentIds.length } as Json,
    });
    await this.audit.record(
      { ...audit, organizationId: workspace.organization_id, workspaceId: workspace.id },
      "analysis.created",
      { type: "analysis", id: analysis.id },
      { type: input.type, documentCount: input.documentIds.length },
    );
    await this.jobs.enqueueAnalysisRun({ analysisId: analysis.id, workspaceId: workspace.id, requestId: audit.requestId, attempt: 1 });
    return { analysis: await this.toSummary(analysis), created: true };
  }

  async list(userId: string, workspaceId: string, options: { limit: number; offset: number; type?: string; status?: string }) {
    await this.access.requireMembership(userId, workspaceId);
    const [rows, total] = await Promise.all([this.analyses.list(workspaceId, options), this.analyses.count(workspaceId)]);
    const links = await this.analyses.listDocumentsForAnalyses(rows.map((row) => row.id));
    return {
      items: rows.map((row) => summarize(row, links.filter((link) => link.analysis_id === row.id).map((link) => link.document_id))),
      total,
    };
  }

  async get(userId: string, analysisId: string, audit: RequestAudit): Promise<AnalysisDetail> {
    const analysis = await this.load(userId, analysisId);
    const [summary, events] = await Promise.all([this.toSummary(analysis), this.analyses.listEvents(analysisId)]);
    const result = analysis.status === "completed" ? await this.buildResult(analysis) : null;
    await this.audit.record(
      { ...audit, organizationId: analysis.organization_id, workspaceId: analysis.workspace_id },
      "analysis.accessed",
      { type: "analysis", id: analysisId },
    );
    return { ...summary, result, events: events.map(toEvent) };
  }

  async cancel(userId: string, analysisId: string, audit: RequestAudit): Promise<AnalysisSummary> {
    const analysis = await this.load(userId, analysisId, CONTRIBUTOR_ROLES);
    if (analysis.status === "cancelled") return this.toSummary(analysis);
    if (analysis.status === "completed" || analysis.status === "failed") {
      throw AppError.conflict(`Analysis in status ${analysis.status} cannot be cancelled`);
    }
    const updated = await this.analyses.transition(analysisId, ["draft", "queued", "extracting", "indexing", "analyzing"], {
      status: "cancelled",
      current_step: "cancelled",
      completed_at: new Date().toISOString(),
    });
    if (!updated) throw AppError.conflict("Analysis changed state while cancelling");
    await this.analyses.addEvent({
      organization_id: analysis.organization_id,
      workspace_id: analysis.workspace_id,
      analysis_id: analysisId,
      status: "cancelled",
      progress: updated.progress,
      message: "Cancelled by faculty",
      metadata: {},
    });
    await this.audit.record(
      { ...audit, organizationId: analysis.organization_id, workspaceId: analysis.workspace_id },
      "analysis.cancelled",
      { type: "analysis", id: analysisId },
    );
    return this.toSummary(updated);
  }

  async retry(userId: string, analysisId: string, audit: RequestAudit): Promise<AnalysisSummary> {
    const analysis = await this.load(userId, analysisId, CONTRIBUTOR_ROLES);
    if (analysis.status !== "failed" && analysis.status !== "cancelled") {
      throw AppError.conflict(`Only failed or cancelled analyses can be retried (current: ${analysis.status})`);
    }
    if (analysis.attempt_count >= MAX_ANALYSIS_ATTEMPTS + 2) {
      throw AppError.conflict("Retry limit reached for this analysis");
    }
    const updated = await this.analyses.transition(analysisId, ["failed", "cancelled"], {
      status: "queued",
      current_step: "queued",
      progress: 0,
      failure_code: null,
      failure_message_safe: null,
      completed_at: null,
    });
    if (!updated) throw AppError.conflict("Analysis changed state while retrying");
    await this.analyses.addEvent({
      organization_id: analysis.organization_id,
      workspace_id: analysis.workspace_id,
      analysis_id: analysisId,
      status: "queued",
      progress: 0,
      message: "Retry requested by faculty",
      metadata: { previousAttempts: analysis.attempt_count } as Json,
    });
    await this.audit.record(
      { ...audit, organizationId: analysis.organization_id, workspaceId: analysis.workspace_id },
      "analysis.retried",
      { type: "analysis", id: analysisId },
      { previousAttempts: analysis.attempt_count },
    );
    await this.jobs.enqueueAnalysisRun({ analysisId, workspaceId: analysis.workspace_id, requestId: audit.requestId, attempt: analysis.attempt_count + 1 });
    return this.toSummary(updated);
  }

  async approve(userId: string, analysisId: string, note: string | undefined, audit: RequestAudit): Promise<AnalysisSummary> {
    const analysis = await this.load(userId, analysisId, CONTRIBUTOR_ROLES);
    if (analysis.status !== "completed") {
      throw AppError.conflict("Only completed analyses can be approved");
    }
    if (analysis.approved_at) return this.toSummary(analysis);
    const updated = await this.analyses.update(analysisId, { approved_at: new Date().toISOString(), approved_by: userId });
    const artifacts = await this.analyses.listArtifacts(analysisId);
    for (const artifact of artifacts) {
      if (artifact.status === "draft" || artifact.status === "faculty_edited") {
        await this.analyses.updateArtifact(artifact.id, { status: "approved", approved_at: new Date().toISOString(), approved_by: userId });
      }
    }
    await this.audit.record(
      { ...audit, organizationId: analysis.organization_id, workspaceId: analysis.workspace_id },
      "analysis.approved",
      { type: "analysis", id: analysisId },
      { artifacts: artifacts.length, hasNote: Boolean(note) },
    );
    return this.toSummary(updated ?? analysis);
  }

  async evidence(userId: string, analysisId: string): Promise<{ evidence: EvidenceRecord[]; findings: FindingRecord[] }> {
    await this.load(userId, analysisId);
    const [evidence, findings] = await Promise.all([this.analyses.listEvidence(analysisId), this.analyses.listFindings(analysisId)]);
    const links = await this.analyses.listFindingEvidence(findings.map((finding) => finding.id));
    return {
      evidence: evidence.map(toEvidenceRecord),
      findings: findings.map((finding) => toFindingRecord(finding, links.filter((link) => link.finding_id === finding.id))),
    };
  }

  async artifacts(userId: string, analysisId: string): Promise<ArtifactSummary[]> {
    await this.load(userId, analysisId);
    const artifacts = await this.analyses.listArtifacts(analysisId);
    return artifacts.map(toArtifactSummary);
  }

  async buildResult(analysis: AnalysisRow): Promise<EvidenceBackedResult> {
    const [findings, evidence] = await Promise.all([this.analyses.listFindings(analysis.id), this.analyses.listEvidence(analysis.id)]);
    const links = await this.analyses.listFindingEvidence(findings.map((finding) => finding.id));
    const stored = (analysis.result ?? {}) as { output?: Record<string, unknown>; confidence?: EvidenceBackedResult["confidence"]; limitations?: string[] };
    const provenance = (analysis.provenance ?? null) as Provenance | null;
    return {
      findings: findings.map((finding) => toFindingRecord(finding, links.filter((link) => link.finding_id === finding.id))),
      evidence: evidence.map(toEvidenceRecord),
      confidence: stored.confidence ?? "low",
      limitations: stored.limitations ?? [],
      provenance: provenance ?? {
        analysisId: analysis.id,
        analysisType: analysis.type,
        documentIds: [],
        evidenceIds: evidence.map((item) => item.id),
        generatedAt: analysis.completed_at ?? analysis.updated_at,
        modelCalls: [],
      },
      promptVersion: analysis.prompt_version ?? "unknown",
      model: provenance?.modelCalls[provenance.modelCalls.length - 1] ?? null,
      output: stored.output ?? {},
    };
  }

  private async load(userId: string, analysisId: string, roles?: Parameters<AccessService["requireMembership"]>[2]): Promise<AnalysisRow> {
    const analysis = await this.analyses.getById(analysisId);
    if (!analysis) throw AppError.notFound("Analysis");
    await this.access.requireMembership(userId, analysis.workspace_id, roles);
    return analysis;
  }

  private async toSummary(analysis: AnalysisRow): Promise<AnalysisSummary> {
    const links = await this.analyses.listDocuments(analysis.id);
    return summarize(analysis, links.map((link) => link.document_id));
  }
}

export function summarize(row: AnalysisRow, documentIds: string[]): AnalysisSummary {
  const settings = { ...((row.settings as Record<string, unknown>) ?? {}) };
  delete settings.__requestHash;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    module: row.module,
    title: row.title,
    status: row.status,
    progress: row.progress ?? 0,
    currentStep: row.current_step ?? null,
    attemptCount: row.attempt_count ?? 0,
    input: (row.input as Record<string, unknown>) ?? {},
    settings,
    promptVersion: row.prompt_version ?? null,
    modelProvider: row.model_provider ?? null,
    modelName: row.model_name ?? null,
    failureCode: row.failure_code ?? null,
    failureMessage: row.failure_message_safe ?? null,
    approvedAt: row.approved_at ?? null,
    approvedBy: row.approved_by ?? null,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documentIds,
  };
}

function toEvent(row: { id: string; analysis_id: string; status: AnalysisEvent["status"]; progress: number; message: string; metadata: Json; created_at: string }): AnalysisEvent {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    status: row.status,
    progress: row.progress ?? 0,
    message: row.message,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

export function toEvidenceRecord(row: EvidenceItemRow): EvidenceRecord {
  const metadata = (row.metadata as Record<string, unknown>) ?? {};
  return {
    id: row.id,
    sourceType: row.source_type,
    documentId: typeof metadata.documentId === "string" ? metadata.documentId : undefined,
    documentChunkId: row.document_chunk_id ?? undefined,
    researchWorkId: row.research_work_id ?? undefined,
    externalSourceUrl: row.external_source_url ?? undefined,
    title: row.title,
    locator: (row.locator as Record<string, unknown>) ?? {},
    excerpt: row.excerpt,
    publishedYear: row.published_year ?? undefined,
    metadata,
  };
}

export function toFindingRecord(row: FindingRow, links: { evidence_item_id: string; relation: "supports" | "contradicts" | "context" }[]): FindingRecord {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    confidence: row.confidence,
    limitations: row.limitations,
    requiresHumanReview: row.requires_human_review,
    category: row.category,
    metrics: (row.metrics as Record<string, unknown>) ?? {},
    evidence: links.map((link) => ({ evidenceId: link.evidence_item_id, relation: link.relation })),
  };
}

export function toArtifactSummary(row: ArtifactRow): ArtifactSummary {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    workspaceId: row.workspace_id,
    type: row.type,
    status: row.status,
    title: row.title,
    content: (row.content as Record<string, unknown>) ?? {},
    contentText: row.content_text,
    version: row.version,
    approvedAt: row.approved_at ?? null,
    approvedBy: row.approved_by ?? null,
    exportedAt: row.exported_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
