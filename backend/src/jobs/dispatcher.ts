export interface DocumentProcessingJob {
  documentId: string;
  workspaceId: string;
  requestId: string | null;
  reason: "upload" | "reprocess";
}

export interface AnalysisRunJob {
  analysisId: string;
  workspaceId: string;
  requestId: string | null;
  attempt: number;
}

/** Job dispatch port. Inngest in production; inline (awaitable) execution in tests and local dev. */
export interface JobDispatcher {
  enqueueDocumentProcessing(job: DocumentProcessingJob): Promise<void>;
  enqueueAnalysisRun(job: AnalysisRunJob): Promise<void>;
}

export interface JobHandlers {
  processDocument(job: DocumentProcessingJob): Promise<void>;
  runAnalysis(job: AnalysisRunJob): Promise<void>;
}

/**
 * Runs jobs in-process. In `deferred` mode jobs are queued until `drain()` is called (tests); in
 * `background` mode they run on the next tick (local development without Inngest).
 */
export class InlineJobDispatcher implements JobDispatcher {
  private queue: (() => Promise<void>)[] = [];
  private handlers: JobHandlers | null = null;
  private running: Promise<void> | null = null;

  constructor(
    private readonly mode: "deferred" | "background",
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  bind(handlers: JobHandlers): void {
    this.handlers = handlers;
  }

  private push(task: () => Promise<void>): void {
    this.queue.push(task);
    if (this.mode === "background") {
      void this.drain();
    }
  }

  async enqueueDocumentProcessing(job: DocumentProcessingJob): Promise<void> {
    this.push(() => this.requireHandlers().processDocument(job));
  }

  async enqueueAnalysisRun(job: AnalysisRunJob): Promise<void> {
    this.push(() => this.requireHandlers().runAnalysis(job));
  }

  /** Executes every queued job (and jobs they enqueue) sequentially. */
  async drain(): Promise<void> {
    if (this.running) {
      await this.running;
      if (this.queue.length === 0) return;
    }
    this.running = (async () => {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        try {
          await task();
        } catch (error) {
          this.onError(error);
        }
      }
    })();
    try {
      await this.running;
    } finally {
      this.running = null;
    }
  }

  pendingCount(): number {
    return this.queue.length;
  }

  private requireHandlers(): JobHandlers {
    if (!this.handlers) throw new Error("Job handlers are not bound");
    return this.handlers;
  }
}
