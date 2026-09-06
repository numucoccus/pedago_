import { z } from "zod";
import { describe, expect, it } from "vitest";
import { collectEvidenceKeys, validateStructuredOutput } from "../../src/providers/ai/base-ai-provider.js";
import { FakeAIProvider, generateFromSchema } from "../../src/providers/ai/fake-ai-provider.js";
import { AppError } from "../../src/utils/errors.js";

const schema = z.object({
  findings: z.array(z.object({ title: z.string(), evidenceKeys: z.array(z.string()).min(1) })).min(1),
  limitations: z.array(z.string()).min(1),
});

describe("AI structured output validation", () => {
  it("rejects non-JSON output", () => {
    expect(() => validateStructuredOutput("not json at all", schema)).toThrowError(AppError);
    try {
      validateStructuredOutput("not json", schema);
    } catch (error) {
      expect((error as AppError).code).toBe("AI_OUTPUT_INVALID");
      expect((error as AppError).retryable).toBe(true);
    }
  });

  it("rejects schema violations with issue details", () => {
    try {
      validateStructuredOutput(JSON.stringify({ findings: [], limitations: [] }), schema);
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as AppError).code).toBe("AI_OUTPUT_INVALID");
      expect((error as AppError).details).toMatchObject({ issues: expect.any(Array) });
    }
  });

  it("rejects citations outside the provided evidence context", () => {
    const text = JSON.stringify({ findings: [{ title: "x", evidenceKeys: ["E1", "E99"] }], limitations: ["l"] });
    expect(() => validateStructuredOutput(text, schema, ["E1", "E2"])).toThrowError(/outside the provided context/);
    expect(validateStructuredOutput(text, schema, ["E1", "E99"]).findings[0]?.evidenceKeys).toEqual(["E1", "E99"]);
  });

  it("collects nested evidence keys and strips code fences", () => {
    expect(collectEvidenceKeys({ a: { evidenceKeys: ["E1"] }, b: [{ evidenceKey: "E2" }] })).toEqual(["E1", "E2"]);
    const fenced = "```json\n" + JSON.stringify({ findings: [{ title: "x", evidenceKeys: ["E1"] }], limitations: ["l"] }) + "\n```";
    expect(validateStructuredOutput(fenced, schema, ["E1"]).limitations).toEqual(["l"]);
  });
});

describe("FakeAIProvider retries and metadata", () => {
  it("retries once after an invalid output and succeeds with attempt metadata", async () => {
    const provider = new FakeAIProvider(16, { maxRetries: 2 });
    let calls = 0;
    provider.setResponder("test.prompt", () => {
      calls += 1;
      return calls === 1 ? { findings: [] } : { findings: [{ title: "ok", evidenceKeys: ["E1"] }], limitations: ["none"] };
    });
    const response = await provider.generateStructured({ promptId: "test.prompt", promptVersion: "v1", system: "s", user: "u", schema, allowedEvidenceKeys: ["E1"] });
    expect(response.data.findings[0]?.title).toBe("ok");
    expect(response.model.attempts).toBe(2);
    expect(response.model.promptVersion).toBe("v1");
    expect(response.model.provider).toBe("fake");
  });

  it("fails with AI_OUTPUT_INVALID after exhausting retries instead of defaulting", async () => {
    const provider = new FakeAIProvider(16, { maxRetries: 1 });
    provider.setResponder("bad.prompt", () => ({ findings: [{ title: "x", evidenceKeys: ["E404"] }], limitations: ["l"] }));
    await expect(provider.generateStructured({ promptId: "bad.prompt", promptVersion: "v1", system: "s", user: "u", schema, allowedEvidenceKeys: ["E1"] })).rejects.toMatchObject({ code: "AI_OUTPUT_INVALID" });
  });

  it("honours abort signals", async () => {
    const provider = new FakeAIProvider(16, { maxRetries: 0 });
    const controller = new AbortController();
    controller.abort();
    await expect(provider.generateStructured({ promptId: "x", promptVersion: "v1", system: "s", user: "u", schema, signal: controller.signal })).rejects.toBeTruthy();
  });

  it("generates schema-valid output for nested schemas using only allowed evidence keys", () => {
    const complex = z.object({
      verdict: z.enum(["supported", "not_supported"]),
      score: z.number().int().min(0).max(10),
      items: z.array(z.object({ label: z.string().min(3).max(20), evidenceKeys: z.array(z.string()).min(1).max(3), confidence: z.enum(["low", "medium", "high"]), requiresHumanReview: z.boolean() })).min(2).max(4),
      optional: z.string().optional(),
      nullable: z.number().nullable(),
    });
    const generated = generateFromSchema(complex, { evidenceKeys: ["E1", "E2"], seed: "seed", path: [] });
    const parsed = complex.parse(generated);
    for (const item of parsed.items) for (const key of item.evidenceKeys) expect(["E1", "E2"]).toContain(key);
    expect(generateFromSchema(complex, { evidenceKeys: ["E1", "E2"], seed: "seed", path: [] })).toEqual(generated);
  });

  it("produces deterministic embeddings of the configured dimension", async () => {
    const provider = new FakeAIProvider(32);
    const [a, b, c] = await provider.createEmbeddings(["recursion base case", "recursion base case", "deadline extension"]);
    expect(a).toHaveLength(32);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
