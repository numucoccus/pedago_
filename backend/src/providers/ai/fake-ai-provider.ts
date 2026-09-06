import { createHash } from "node:crypto";
import type { ZodType } from "zod";
import type {
  AudioInput,
  ImageAnalysisRequest,
  RawCompletion,
  StructuredAIRequest,
  StructuredAIResponse,
  TranscriptionResult,
} from "./ai-provider.js";
import { BaseAIProvider, type BaseAIProviderOptions } from "./base-ai-provider.js";

export interface FakeGenerationContext {
  promptId: string;
  allowedEvidenceKeys: string[];
  user: string;
}

export type FakeResponder = (context: FakeGenerationContext, request: { system: string; user: string }) => unknown;

interface ZodDef {
  type: string;
  shape?: Record<string, ZodType>;
  element?: ZodType;
  innerType?: ZodType;
  entries?: Record<string, string | number>;
  values?: unknown[];
  options?: ZodType[];
  valueType?: ZodType;
  keyType?: ZodType;
  items?: ZodType[];
  defaultValue?: unknown;
  checks?: { _zod: { def: { check: string; minimum?: number; maximum?: number; length?: number; value?: number; inclusive?: boolean; format?: string } } }[];
}

function defOf(schema: ZodType): ZodDef {
  return (schema as unknown as { _zod: { def: ZodDef } })._zod.def;
}

/**
 * Deterministic, offline AI provider used by tests and local development. It fabricates
 * schema-valid output using only the evidence keys supplied in the request, so it exercises the
 * same validation and citation allowlisting paths as a real model without any network access.
 */
export class FakeAIProvider extends BaseAIProvider {
  readonly name = "fake";
  private readonly responders = new Map<string, FakeResponder>();
  private pendingSchema: ZodType | null = null;
  private pendingEvidenceKeys: string[] = [];
  private pendingPromptId = "";
  public embeddingCalls = 0;
  public structuredCalls = 0;

  constructor(
    private readonly dimension: number,
    options?: Partial<BaseAIProviderOptions>,
  ) {
    super({ maxRetries: options?.maxRetries ?? 1, timeoutMs: options?.timeoutMs ?? 5000, logger: options?.logger });
  }

  /** Overrides generation for a prompt id (used to inject invalid or specific outputs in tests). */
  setResponder(promptId: string, responder: FakeResponder | null): void {
    if (responder) this.responders.set(promptId, responder);
    else this.responders.delete(promptId);
  }

  override async generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>> {
    this.pendingSchema = request.schema;
    this.pendingEvidenceKeys = request.allowedEvidenceKeys ?? [];
    this.pendingPromptId = request.promptId;
    this.structuredCalls += 1;
    return super.generateStructured(request);
  }

  override async analyzeImage<T>(input: ImageAnalysisRequest<T>): Promise<StructuredAIResponse<T>> {
    this.pendingSchema = input.schema;
    this.pendingEvidenceKeys = [];
    this.pendingPromptId = input.promptId;
    return super.analyzeImage(input);
  }

  protected async completeJson(request: { system: string; user: string }): Promise<RawCompletion> {
    const responder = this.responders.get(this.pendingPromptId);
    const value = responder
      ? responder({ promptId: this.pendingPromptId, allowedEvidenceKeys: this.pendingEvidenceKeys, user: request.user }, request)
      : generateFromSchema(this.pendingSchema!, { evidenceKeys: this.pendingEvidenceKeys, seed: this.pendingPromptId, path: [] });
    const text = JSON.stringify(value);
    return { text, model: "fake-model-1", inputTokens: Math.ceil((request.system.length + request.user.length) / 4), outputTokens: Math.ceil(text.length / 4) };
  }

  protected async completeImageJson(request: { instruction: string }): Promise<RawCompletion> {
    const responder = this.responders.get(this.pendingPromptId);
    const value = responder
      ? responder({ promptId: this.pendingPromptId, allowedEvidenceKeys: [], user: request.instruction }, { system: "", user: request.instruction })
      : generateFromSchema(this.pendingSchema!, { evidenceKeys: [], seed: this.pendingPromptId, path: [] });
    const text = JSON.stringify(value);
    return { text, model: "fake-vision-1", inputTokens: 500, outputTokens: Math.ceil(text.length / 4) };
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    this.embeddingCalls += 1;
    return texts.map((text) => hashedEmbedding(text, this.dimension));
  }

  async transcribeAudio(input: AudioInput): Promise<TranscriptionResult> {
    const words = input.data.byteLength;
    const text = `Transcribed audio note (${words} bytes, ${input.mimeType}). Students asked about the recursion base case twice.`;
    return {
      text,
      language: input.language ?? "en",
      segments: [
        { startSeconds: 0, endSeconds: 12, text: text.slice(0, Math.ceil(text.length / 2)) },
        { startSeconds: 12, endSeconds: 25, text: text.slice(Math.ceil(text.length / 2)) },
      ],
      model: {
        provider: this.name,
        model: "fake-whisper",
        promptId: "transcription",
        promptVersion: "n/a",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 1,
        estimatedCostUsd: 0,
        attempts: 1,
      },
    };
  }
}

/**
 * Bag-of-words hashed embedding. Semantically similar (word-overlapping) texts get similar vectors,
 * which is enough to exercise clustering and retrieval deterministically.
 */
export function hashedEmbedding(text: string, dimension: number): number[] {
  const vector = new Array<number>(dimension).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
  for (const token of tokens) {
    const digest = createHash("sha1").update(token).digest();
    const index = digest.readUInt32BE(0) % dimension;
    const sign = digest[4]! % 2 === 0 ? 1 : -1;
    vector[index]! += sign;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

interface GenContext {
  evidenceKeys: string[];
  seed: string;
  path: string[];
}

function seededInt(context: GenContext, max: number): number {
  const digest = createHash("sha1").update(`${context.seed}:${context.path.join(".")}`).digest();
  return digest.readUInt32BE(0) % Math.max(1, max);
}

function numberBounds(def: ZodDef): { min: number; max: number; integer: boolean } {
  let min = 0;
  let max = 10;
  let integer = false;
  for (const check of def.checks ?? []) {
    const c = check._zod.def;
    if (c.check === "greater_than" && c.value !== undefined) min = c.inclusive ? c.value : c.value + 1;
    if (c.check === "less_than" && c.value !== undefined) max = c.inclusive ? c.value : c.value - 1;
    if (c.check === "number_format" && c.format?.includes("int")) integer = true;
  }
  if (max < min) max = min;
  return { min, max, integer };
}

function lengthBounds(def: ZodDef, fallbackMin: number, fallbackMax: number): { min: number; max: number } {
  let min = fallbackMin;
  let max = fallbackMax;
  for (const check of def.checks ?? []) {
    const c = check._zod.def;
    if (c.check === "min_length" && c.minimum !== undefined) min = c.minimum;
    if (c.check === "max_length" && c.maximum !== undefined) max = c.maximum;
    if (c.check === "length_equals" && c.length !== undefined) {
      min = c.length;
      max = c.length;
    }
  }
  if (max < min) max = min;
  return { min, max };
}

/** Generates schema-valid, evidence-respecting fake data for any supported Zod schema. */
export function generateFromSchema(schema: ZodType, context: GenContext): unknown {
  const def = defOf(schema);
  const field = context.path[context.path.length - 1] ?? "";
  switch (def.type) {
    case "object": {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(def.shape ?? {})) {
        const value = generateFromSchema(child, { ...context, path: [...context.path, key] });
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    case "array": {
      const element = def.element!;
      const elementDef = defOf(element);
      const isEvidenceArray = field === "evidenceKeys";
      const { min, max } = lengthBounds(def, 1, 3);
      if (isEvidenceArray) {
        if (context.evidenceKeys.length === 0) return [];
        const count = Math.min(Math.max(min, 1), Math.min(max, context.evidenceKeys.length), 3);
        const start = seededInt(context, context.evidenceKeys.length);
        return Array.from({ length: count }, (_, i) => context.evidenceKeys[(start + i) % context.evidenceKeys.length]);
      }
      if (elementDef.type === "enum" && field.toLowerCase().includes("evidence")) {
        return Object.values(elementDef.entries ?? {}).slice(0, Math.max(min, 1));
      }
      const count = Math.min(Math.max(min, 2), max);
      return Array.from({ length: count }, (_, i) => generateFromSchema(element, { ...context, path: [...context.path, String(i)] }));
    }
    case "string": {
      if (field === "evidenceKey") return context.evidenceKeys[seededInt(context, context.evidenceKeys.length)] ?? "";
      const { min, max } = lengthBounds(def, 1, 200);
      const base = fakeSentence(field, context);
      let text = base;
      while (text.length < min) text = `${text} ${base}`;
      return text.length > max ? text.slice(0, max).trimEnd() : text;
    }
    case "number": {
      const { min, max, integer } = numberBounds(def);
      const span = max - min;
      const raw = min + (span === 0 ? 0 : (seededInt(context, 1000) / 1000) * span);
      return integer ? Math.round(raw) : Math.round(raw * 100) / 100;
    }
    case "boolean":
      return field === "requiresHumanReview" ? true : seededInt(context, 2) === 1;
    case "enum": {
      const values = Object.values(def.entries ?? {});
      if (field === "sourceKind" && values.includes("ai_hypothesis")) return "ai_hypothesis";
      if (field === "confidence" && values.includes("medium")) return "medium";
      return values[seededInt(context, values.length)];
    }
    case "literal":
      return def.values?.[0];
    case "optional":
      return generateFromSchema(def.innerType!, context);
    case "nullable":
      return generateFromSchema(def.innerType!, context);
    case "default":
      return generateFromSchema(def.innerType!, context);
    case "union":
      return generateFromSchema(def.options![0]!, context);
    case "record":
      return { [`${field || "key"}_1`]: generateFromSchema(def.valueType!, { ...context, path: [...context.path, "value"] }) };
    case "tuple":
      return (def.items ?? []).map((item, i) => generateFromSchema(item, { ...context, path: [...context.path, String(i)] }));
    case "null":
      return null;
    default:
      return fakeSentence(field, context);
  }
}

function fakeSentence(field: string, context: GenContext): string {
  const variant = seededInt(context, 3);
  const label = field.replace(/([A-Z])/g, " $1").toLowerCase().trim() || "value";
  const options = [
    `Fake ${label} generated for testing; grounded only in supplied evidence.`,
    `Synthetic ${label} (${context.seed}) — review before use.`,
    `Placeholder ${label} that references provided context only.`,
  ];
  return options[variant]!;
}
