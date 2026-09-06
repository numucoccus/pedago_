import type { ModelMetadata } from "@pedago/shared";
import { z, type ZodType } from "zod";
import type { AppLogger } from "../../config/logger.js";
import { AppError, isAppError } from "../../utils/errors.js";
import type {
  AIProvider,
  AudioInput,
  ImageAnalysisRequest,
  RawCompletion,
  StructuredAIRequest,
  StructuredAIResponse,
  TranscriptionResult,
} from "./ai-provider.js";

export interface BaseAIProviderOptions {
  maxRetries: number;
  timeoutMs: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  logger?: AppLogger;
}

export interface AICallTrace {
  promptId: string;
  promptVersion: string;
  provider: string;
  model: string;
  attempts: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  outcome: "ok" | "invalid_output" | "provider_error";
  trace?: Record<string, string | number | boolean | null>;
}

export type AITraceSink = (trace: AICallTrace) => void;

/**
 * Shared behaviour for every AI provider: bounded retries for transient/provider failures and
 * schema violations, timeouts with abort support, strict Zod validation, and cost/latency metadata.
 * There is deliberately no catch-and-default path: an invalid output surfaces as AI_OUTPUT_INVALID.
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  private readonly traceSinks: AITraceSink[] = [];

  constructor(protected readonly options: BaseAIProviderOptions) {}

  onTrace(sink: AITraceSink): void {
    this.traceSinks.push(sink);
  }

  protected abstract completeJson(
    request: { system: string; user: string; jsonSchema: Record<string, unknown>; temperature?: number; maxOutputTokens?: number },
    signal: AbortSignal,
  ): Promise<RawCompletion>;

  protected abstract completeImageJson(
    request: { instruction: string; jsonSchema: Record<string, unknown>; image: { data: Buffer; mimeType: string } },
    signal: AbortSignal,
  ): Promise<RawCompletion>;

  abstract createEmbeddings(texts: string[]): Promise<number[][]>;
  abstract transcribeAudio(input: AudioInput): Promise<TranscriptionResult>;

  async generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>> {
    const jsonSchema = toJsonSchema(request.schema);
    return this.runWithRetries(request.promptId, request.promptVersion, request.signal, request.trace, (signal, feedback) =>
      this.completeJson(
        {
          system: request.system,
          user: feedback ? `${request.user}\n\nYour previous response was rejected: ${feedback}\nReturn corrected JSON only.` : request.user,
          jsonSchema,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
        },
        signal,
      ),
      request.schema,
      request.allowedEvidenceKeys,
    );
  }

  async analyzeImage<T>(input: ImageAnalysisRequest<T>): Promise<StructuredAIResponse<T>> {
    const jsonSchema = toJsonSchema(input.schema);
    return this.runWithRetries(input.promptId, input.promptVersion, input.signal, undefined, (signal, feedback) =>
      this.completeImageJson(
        {
          instruction: feedback ? `${input.instruction}\n\nPrevious response rejected: ${feedback}` : input.instruction,
          jsonSchema,
          image: input.image,
        },
        signal,
      ),
      input.schema,
    );
  }

  protected async runWithRetries<T>(
    promptId: string,
    promptVersion: string,
    outerSignal: AbortSignal | undefined,
    trace: Record<string, string | number | boolean | null> | undefined,
    call: (signal: AbortSignal, feedback: string | null) => Promise<RawCompletion>,
    schema: ZodType<T>,
    allowedEvidenceKeys?: string[],
  ): Promise<StructuredAIResponse<T>> {
    const started = Date.now();
    let attempts = 0;
    let feedback: string | null = null;
    let lastError: AppError | null = null;
    let totalIn = 0;
    let totalOut = 0;
    let modelName = "unknown";

    while (attempts <= this.options.maxRetries) {
      attempts += 1;
      outerSignal?.throwIfAborted();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error("AI request timed out")), this.options.timeoutMs);
      const onAbort = () => controller.abort(outerSignal?.reason);
      outerSignal?.addEventListener("abort", onAbort, { once: true });
      try {
        const raw = await call(controller.signal, feedback);
        totalIn += raw.inputTokens;
        totalOut += raw.outputTokens;
        modelName = raw.model;
        const data = validateStructuredOutput(raw.text, schema, allowedEvidenceKeys);
        const latencyMs = Date.now() - started;
        const metadata: ModelMetadata = {
          provider: this.name,
          model: modelName,
          promptId,
          promptVersion,
          inputTokens: totalIn,
          outputTokens: totalOut,
          latencyMs,
          estimatedCostUsd: this.estimateCost(totalIn, totalOut),
          attempts,
        };
        this.emit({ promptId, promptVersion, provider: this.name, model: modelName, attempts, latencyMs, inputTokens: totalIn, outputTokens: totalOut, outcome: "ok", trace });
        return { data, model: metadata };
      } catch (error) {
        const appError = normalizeProviderError(error, controller.signal);
        lastError = appError;
        if (!appError.retryable || outerSignal?.aborted) {
          break;
        }
        feedback = appError.code === "AI_OUTPUT_INVALID" ? String(appError.message) : null;
        this.options.logger?.warn({ promptId, attempt: attempts, code: appError.code }, "AI call failed; retrying");
      } finally {
        clearTimeout(timeout);
        outerSignal?.removeEventListener("abort", onAbort);
      }
    }
    const final = lastError ?? AppError.providerUnavailable("AI provider failed");
    this.emit({
      promptId,
      promptVersion,
      provider: this.name,
      model: modelName,
      attempts,
      latencyMs: Date.now() - started,
      inputTokens: totalIn,
      outputTokens: totalOut,
      outcome: final.code === "AI_OUTPUT_INVALID" ? "invalid_output" : "provider_error",
      trace,
    });
    throw final;
  }

  protected estimateCost(inputTokens: number, outputTokens: number): number | null {
    if (this.options.inputCostPer1k === undefined && this.options.outputCostPer1k === undefined) return null;
    return (
      (inputTokens / 1000) * (this.options.inputCostPer1k ?? 0) + (outputTokens / 1000) * (this.options.outputCostPer1k ?? 0)
    );
  }

  protected emit(trace: AICallTrace): void {
    for (const sink of this.traceSinks) {
      try {
        sink(trace);
      } catch {
        // tracing must never break generation
      }
    }
  }
}

export function toJsonSchema(schema: ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12", unrepresentable: "any" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Parses model text as JSON, validates against the schema, and enforces the evidence allowlist. */
export function validateStructuredOutput<T>(text: string, schema: ZodType<T>, allowedEvidenceKeys?: string[]): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw AppError.aiOutputInvalid("Model output was not valid JSON");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw AppError.aiOutputInvalid("Model output did not match the required schema", {
      issues: result.error.issues.slice(0, 20).map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  if (allowedEvidenceKeys) {
    const unknown = collectEvidenceKeys(result.data).filter((key) => !allowedEvidenceKeys.includes(key));
    if (unknown.length > 0) {
      throw AppError.aiOutputInvalid(`Model cited evidence outside the provided context: ${unknown.slice(0, 5).join(", ")}`, {
        unknownEvidenceKeys: unknown,
      });
    }
  }
  return result.data;
}

/** Collects every value under a key named `evidenceKeys` (or `evidenceKey`) anywhere in the output. */
export function collectEvidenceKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectEvidenceKeys(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "evidenceKeys" && Array.isArray(child)) {
        for (const item of child) if (typeof item === "string") found.push(item);
      } else if (key === "evidenceKey" && typeof child === "string") {
        found.push(child);
      } else {
        collectEvidenceKeys(child, found);
      }
    }
  }
  return found;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1]! : trimmed;
}

function normalizeProviderError(error: unknown, signal: AbortSignal): AppError {
  if (isAppError(error)) return error;
  if (signal.aborted || (error instanceof Error && error.name === "AbortError")) {
    return AppError.providerUnavailable("AI request timed out", error);
  }
  return AppError.providerUnavailable("AI provider request failed", error);
}
