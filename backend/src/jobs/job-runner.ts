import type { AppLogger } from "../config/logger.js";
import type { AnalysisOrchestrator } from "../services/analysis/analysis-orchestrator.js";
import type { DocumentProcessingService } from "../services/documents/document-processing-service.js";
import { isAppError } from "../utils/errors.js";
import type { AnalysisRunJob, DocumentProcessingJob, JobDispatcher, JobHandlers } from "./dispatcher.js";

/**
 * Job bodies shared by every dispatcher. Both jobs are idempotent: document processing reuses
 * extractions by content hash, and analysis runs claim status transitions atomically.
 */
export class JobRunner implements JobHandlers {
  constructor(
    private readonly processing: DocumentProcessingService,
    private readonly orchestrator: AnalysisOrchestrator,
    private readonly dispatcher: () => JobDispatcher,
    private readonly logger: AppLogger,
  ) {}

  async processDocument(job: DocumentProcessingJob): Promise<void> {
    try {
      const outcome = await this.processing.process(job.documentId, { requestId: job.requestId });
      this.logger.info({ documentId: job.documentId, outcome: outcome.status, reused: outcome.reused }, "Document job finished");
    } catch (error) {
      // Retryable failures propagate so the queue can retry; the document is already marked failed.
      if (isAppError(error) && !error.retryable) {
        this.logger.warn({ documentId: job.documentId, code: error.code }, "Document job failed permanently");
        return;
      }
      throw error;
    }
  }

  async runAnalysis(job: AnalysisRunJob): Promise<void> {
    const outcome = await this.orchestrator.run(job.analysisId, { requestId: job.requestId });
    this.logger.info({ analysisId: job.analysisId, outcome: outcome.outcome }, "Analysis job finished");
    if (outcome.outcome === "retry") {
      await this.dispatcher().enqueueAnalysisRun({ ...job, attempt: outcome.attempt });
    }
  }
}
