import type { Env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import type { AudioInput, RawCompletion, TranscriptionResult } from "./ai-provider.js";
import { BaseAIProvider, type BaseAIProviderOptions } from "./base-ai-provider.js";

interface ChatCompletionResponse {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface EmbeddingResponse {
  data?: { embedding: number[]; index: number }[];
}

interface TranscriptionResponse {
  text?: string;
  language?: string;
  segments?: { start: number; end: number; text: string }[];
}

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  embeddingModel: string;
  embeddingDimension: number;
  transcriptionModel: string;
}

/**
 * Works with OpenAI and any OpenAI-compatible endpoint (Azure OpenAI gateway, OpenRouter, Gemini's
 * compatibility layer, local servers). Structured output uses JSON-schema response formatting.
 */
export class OpenAICompatibleProvider extends BaseAIProvider {
  readonly name: string;

  constructor(
    private readonly config: OpenAICompatibleConfig,
    options: BaseAIProviderOptions,
  ) {
    super(options);
    this.name = `openai_compatible:${new URL(config.baseUrl).host}`;
  }

  static fromEnv(env: Env, options: Omit<BaseAIProviderOptions, "maxRetries" | "timeoutMs">): OpenAICompatibleProvider {
    if (!env.AI_API_KEY) {
      throw new Error("AI_API_KEY is required for the OpenAI-compatible provider");
    }
    return new OpenAICompatibleProvider(
      {
        baseUrl: env.AI_BASE_URL,
        apiKey: env.AI_API_KEY,
        model: env.AI_MODEL,
        visionModel: env.AI_VISION_MODEL,
        embeddingModel: env.AI_EMBEDDING_MODEL,
        embeddingDimension: env.AI_EMBEDDING_DIMENSION,
        transcriptionModel: env.AI_TRANSCRIPTION_MODEL,
      },
      {
        ...options,
        maxRetries: env.AI_MAX_RETRIES,
        timeoutMs: env.AI_TIMEOUT_MS,
        inputCostPer1k: env.AI_INPUT_COST_PER_1K_USD,
        outputCostPer1k: env.AI_OUTPUT_COST_PER_1K_USD,
      },
    );
  }

  private async post<T>(path: string, body: BodyInit, signal: AbortSignal, contentType?: string): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.config.apiKey}` };
    if (contentType) headers["Content-Type"] = contentType;
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}${path}`, { method: "POST", headers, body, signal });
    } catch (error) {
      throw AppError.providerUnavailable("AI provider request failed", error);
    }
    if (response.status === 429 || response.status >= 500) {
      throw AppError.providerUnavailable(`AI provider returned ${response.status}`);
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AppError("PROVIDER_UNAVAILABLE", `AI provider rejected the request (${response.status})`, {
        retryable: false,
        details: { status: response.status, body: text.slice(0, 500) },
      });
    }
    return (await response.json()) as T;
  }

  protected async completeJson(
    request: { system: string; user: string; jsonSchema: Record<string, unknown>; temperature?: number; maxOutputTokens?: number },
    signal: AbortSignal,
  ): Promise<RawCompletion> {
    const body = {
      model: this.config.model,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxOutputTokens ?? 4000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "structured_output", schema: request.jsonSchema, strict: false },
      },
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    };
    const data = await this.post<ChatCompletionResponse>("/chat/completions", JSON.stringify(body), signal, "application/json");
    return toRawCompletion(data, this.config.model);
  }

  protected async completeImageJson(
    request: { instruction: string; jsonSchema: Record<string, unknown>; image: { data: Buffer; mimeType: string } },
    signal: AbortSignal,
  ): Promise<RawCompletion> {
    const model = this.config.visionModel ?? this.config.model;
    const body = {
      model,
      temperature: 0,
      max_tokens: 4000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "structured_output", schema: request.jsonSchema, strict: false },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: request.instruction },
            { type: "image_url", image_url: { url: `data:${request.image.mimeType};base64,${request.image.data.toString("base64")}` } },
          ],
        },
      ],
    };
    const data = await this.post<ChatCompletionResponse>("/chat/completions", JSON.stringify(body), signal, "application/json");
    return toRawCompletion(data, model);
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const results: number[][] = [];
      for (let start = 0; start < texts.length; start += 64) {
        const batch = texts.slice(start, start + 64);
        const data = await this.post<EmbeddingResponse>(
          "/embeddings",
          JSON.stringify({ model: this.config.embeddingModel, input: batch, dimensions: this.config.embeddingDimension }),
          controller.signal,
          "application/json",
        );
        const ordered = [...(data.data ?? [])].sort((a, b) => a.index - b.index).map((item) => item.embedding);
        if (ordered.length !== batch.length) {
          throw AppError.providerUnavailable("Embedding provider returned an unexpected number of vectors");
        }
        for (const vector of ordered) {
          if (vector.length !== this.config.embeddingDimension) {
            throw AppError.providerUnavailable("Embedding dimension mismatch with configured vector column");
          }
        }
        results.push(...ordered);
      }
      return results;
    } finally {
      clearTimeout(timeout);
    }
  }

  async transcribeAudio(input: AudioInput): Promise<TranscriptionResult> {
    const started = Date.now();
    const form = new FormData();
    form.append("model", this.config.transcriptionModel);
    form.append("response_format", "verbose_json");
    if (input.language) form.append("language", input.language);
    form.append("file", new Blob([new Uint8Array(input.data)], { type: input.mimeType }), input.filename);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const data = await this.post<TranscriptionResponse>("/audio/transcriptions", form, controller.signal);
      if (typeof data.text !== "string") {
        throw AppError.providerUnavailable("Transcription provider returned no text");
      }
      return {
        text: data.text,
        language: data.language ?? null,
        segments: (data.segments ?? []).map((segment) => ({
          startSeconds: segment.start,
          endSeconds: segment.end,
          text: segment.text,
        })),
        model: {
          provider: this.name,
          model: this.config.transcriptionModel,
          promptId: "transcription",
          promptVersion: "n/a",
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - started,
          estimatedCostUsd: null,
          attempts: 1,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toRawCompletion(data: ChatCompletionResponse, fallbackModel: string): RawCompletion {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw AppError.aiOutputInvalid("Model returned an empty response");
  }
  return {
    text: content,
    model: data.model ?? fallbackModel,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}
