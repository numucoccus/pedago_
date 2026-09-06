import { describe, expect, it } from "vitest";
import {
  analysisModules,
  analysisTypes,
  createAnalysisSchema,
  portfolioWeightsSchema,
  weightsSchema,
} from "../src/index.js";

describe("shared contracts", () => {
  it("maps every analysis type to a module", () => {
    for (const type of analysisTypes) {
      expect(analysisModules[type]).toBeDefined();
    }
  });

  it("rejects weights that do not total 100", () => {
    expect(weightsSchema.safeParse({ a: 50, b: 40 }).success).toBe(false);
    expect(weightsSchema.safeParse({ a: 50, b: 50 }).success).toBe(true);
    expect(
      portfolioWeightsSchema.safeParse({
        academic: 35,
        technical: 20,
        leadership: 15,
        service: 15,
        sportsCultural: 10,
        consistency: 5,
      }).success,
    ).toBe(true);
  });

  it("applies defaults to analysis creation", () => {
    const parsed = createAnalysisSchema.parse({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      type: "teaching_pulse",
      title: "Week 5",
    });
    expect(parsed.documentIds).toEqual([]);
    expect(parsed.input).toEqual({});
  });
});
