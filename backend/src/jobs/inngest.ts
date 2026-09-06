import { Inngest, NonRetriableError } from "inngest";
import { serve } from "inngest/express";
import type { Env } from "../config/env.js";
import { isAppError } from "../utils/errors.js";
import type { AnalysisRunJob, DocumentProcessingJob, JobDispatcher, JobHandlers } from "./dispatcher.js";

export const DOCUMENT_PROCESS_EVENT = "document/process";
export const ANALYSIS_RUN_EVENT = "analysis/run";

export function createInngestClient(env: Pick<Env, "INNGEST_APP_ID" | "INNGEST_EVENT_KEY" | "INNGEST_SIGNING_KEY">): Inngest {
  return new Inngest({ id: env.INNGEST_APP_ID, eventKey: env.INNGEST_EVENT_KEY, signingKey: env.INNGEST_SIGNING_KEY });
}

/** Dispatches jobs as Inngest events. Event ids stop duplicate deliveries from double-running. */
export class InngestJobDispatcher implements JobDispatcher {
  constructor(private readonly client: Inngest) {}

  async enqueueDocumentProcessing(job: DocumentProcessingJob): Promise<void> {
    await this.client.send({ name: DOCUMENT_PROCESS_EVENT, data: job, id: `document-${job.documentId}-${job.reason}-${Date.now()}` });
  }

  async enqueueAnalysisRun(job: AnalysisRunJob): Promise<void> {
    await this.client.send({ name: ANALYSIS_RUN_EVENT, data: job, id: `analysis-${job.analysisId}-attempt-${job.attempt}` });
  }
}

export function createInngestFunctions(client: Inngest, handlers: JobHandlers) {
  const processDocument = client.createFunction(
    { id: "process-document", retries: 3, concurrency: { limit: 4, key: "event.data.workspaceId" }, triggers: [{ event: DOCUMENT_PROCESS_EVENT }] },
    async ({ event }) => {
      try {
        await handlers.processDocument(event.data as DocumentProcessingJob);
      } catch (error) {
        if (isAppError(error) && !error.retryable) throw new NonRetriableError(error.message, { cause: error });
        throw error;
      }
    },
  );
  const runAnalysis = client.createFunction(
    // The orchestrator owns retry semantics (it re-queues retryable failures itself), so Inngest only retries transport failures.
    { id: "run-analysis", retries: 1, concurrency: { limit: 2, key: "event.data.workspaceId" }, triggers: [{ event: ANALYSIS_RUN_EVENT }] },
    async ({ event }) => {
      await handlers.runAnalysis(event.data as AnalysisRunJob);
    },
  );
  return [processDocument, runAnalysis];
}

export function createInngestHandler(client: Inngest, handlers: JobHandlers) {
  return serve({ client, functions: createInngestFunctions(client, handlers) });
}
