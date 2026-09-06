import { describe, expect, it } from "vitest";
import type { AchievementRow, StudentRow } from "@pedago/shared/database";
import { computeItemStatistics, difficultyBand } from "../../src/services/assessment/exam-misconception-handler.js";
import { measureAlignment } from "../../src/services/curriculum/curriculum-alignment-handler.js";
import { scoreDecisionOptions } from "../../src/services/research/research-decision-handler.js";
import { aggregateTrends, linearSlope } from "../../src/services/research/research-evolution-handler.js";
import { computePortfolioScore, detectWorkloadSignals, resolveWeights } from "../../src/services/students/portfolio-scoring.js";
import { buildTopicSeries, confusionScore } from "../../src/services/teaching/teaching-pulse-handler.js";
import { chunkSegments } from "../../src/utils/chunking.js";
import { redactIdentifiers } from "../../src/utils/redaction.js";
import { agglomerativeCluster } from "../../src/utils/vectors.js";
import { deduplicateWorks } from "../../src/providers/research/research-aggregator.js";
import { parseDatasetChunks } from "../../src/providers/industry/industry-demand-provider.js";
import { FIXTURE_WORKS } from "../helpers/harness.js";

const student = (cgpa: number | null): StudentRow => ({
  id: "s1", organization_id: "o", workspace_id: "w", created_by: "u", created_at: "", updated_at: "",
  external_student_id: "X1", display_name: "Demo Student", email: null, program: null, cohort: null, cgpa, consent_status: "granted", retention_until: null, deleted_at: null,
});
const achievement = (overrides: Partial<AchievementRow>): AchievementRow => ({
  id: Math.random().toString(36).slice(2), organization_id: "o", workspace_id: "w", created_by: "u", created_at: "", updated_at: "", student_id: "s1", document_id: null,
  title: "Award", issuer: null, achievement_date: null, category: "technical", level: "national", description: null, verification_status: "faculty_verified", verification_url: null, verified_at: null, verified_by: null, extracted_fields: {},
  ...overrides,
});

describe("deterministic scoring", () => {
  it("validates portfolio weights total 100 and rejects otherwise", () => {
    expect(() => resolveWeights({ academic: 50, technical: 20, leadership: 15, service: 15, sportsCultural: 10, consistency: 5 })).toThrow();
    expect(resolveWeights(undefined).academic).toBe(35);
  });

  it("computes portfolio scores transparently with verification-weighted credit", () => {
    const weights = resolveWeights(undefined);
    const verified = computePortfolioScore(student(3.8), [achievement({ verification_status: "faculty_verified" })], [], weights);
    const unverified = computePortfolioScore(student(3.8), [achievement({ verification_status: "unverified" })], [], weights);
    expect(verified.totalScore).toBeGreaterThan(unverified.totalScore);
    expect(verified.breakdown.reduce((sum, item) => sum + item.weightedScore, 0)).toBeCloseTo(verified.totalScore, 1);
    expect(verified.breakdown.find((item) => item.dimension === "academic")?.explanation).toContain("CGPA 3.8/4");
    expect(verified.version).toBe("portfolio-score.v1");
    const tenScale = computePortfolioScore(student(9.1), [], [], weights);
    expect(tenScale.breakdown.find((item) => item.dimension === "academic")?.explanation).toContain("/10");
  });

  it("flags workload observations only with non-diagnostic language", () => {
    const recent = new Date().toISOString().slice(0, 10);
    const signals = detectWorkloadSignals(Array.from({ length: 7 }, () => achievement({ achievement_date: recent })), []);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.description).not.toMatch(/burnout|depress|anxiety|diagnos/i);
    expect(detectWorkloadSignals([], [])).toHaveLength(0);
  });

  it("computes item difficulty and error rate from marks", () => {
    const stats = computeItemStatistics({
      examTitle: "Midterm",
      questions: [{ number: "1", prompt: "Explain recursion base case", maximumMarks: 10 }, { number: "2", prompt: "Loops", maximumMarks: 5 }],
      responses: [
        { questionNumber: "1", subjectKey: "a", awardedMarks: 2 },
        { questionNumber: "1", subjectKey: "b", awardedMarks: 9 },
        { questionNumber: "1", subjectKey: "c", awardedMarks: 4 },
        { questionNumber: "2", subjectKey: "a", awardedMarks: 5 },
      ],
      syllabusTopics: ["Recursion", "Loops"],
    });
    expect(stats[0]).toMatchObject({ questionNumber: "1", attempts: 3, meanScore: 5, difficultyIndex: 0.5, errorRate: 0.667, topic: "Recursion" });
    expect(stats[1]).toMatchObject({ attempts: 1, difficultyIndex: 1, errorRate: 0 });
    expect(difficultyBand(0.5)).toBe("moderate");
    expect(difficultyBand(0.2)).toBe("hard");
  });

  it("ranks research decision options deterministically with inverted risk", () => {
    const options = [
      { label: "A", description: "a", criteria: { noveltyEvidence: 8, feasibility: 6, dataAvailability: 7, methodFit: 7, expectedContribution: 8, risk: 3 } },
      { label: "B", description: "b", criteria: { noveltyEvidence: 5, feasibility: 9, dataAvailability: 9, methodFit: 6, expectedContribution: 5, risk: 8 } },
    ];
    const weights = { noveltyEvidence: 25, feasibility: 20, dataAvailability: 15, methodFit: 15, expectedContribution: 15, risk: 10 };
    const scored = scoreDecisionOptions(options, weights);
    expect(scored[0]?.weightedScore).toBeCloseTo(25 * 0.8 + 20 * 0.6 + 15 * 0.7 + 15 * 0.7 + 15 * 0.8 + 10 * 0.7, 2);
    expect(scored[0]?.rank).toBe(1);
    expect(scored[1]?.rank).toBe(2);
  });

  it("aggregates publication trends and classifies slopes", () => {
    const { output } = aggregateTrends(FIXTURE_WORKS, 2019, 2022, ["federated"], ["survey"]);
    expect(output.yearlySeries.map((point) => point.publications)).toEqual([1, 1, 2, 1]);
    expect(output.keywordSeries[0]?.keyword).toBe("federated");
    expect(linearSlope([0, 1, 2, 3])).toBe(1);
    expect(linearSlope([3, 3, 3])).toBe(0);
  });

  it("measures curriculum alignment deterministically", () => {
    const observations = parseDatasetChunks(
      [
        { id: "c1", content: "skill: Python | frequency: 40 | sector: data", locator: { row: 2 } },
        { id: "c2", content: "skill: Apache Spark | frequency: 20 | sector: data", locator: { row: 3 } },
        { id: "c3", content: "skill: COBOL | frequency: 1 | sector: data", locator: { row: 4 } },
        { id: "c4", content: "skill: Java | frequency: 5 | sector: finance", locator: { row: 5 } },
      ],
      "data",
    ).map((row) => ({ ...row, sourceKey: "uploaded_dataset", sourceName: "jobs", retrievedAt: "2026-01-01" }));
    expect(observations.map((row) => row.skill)).toEqual(["Python", "Apache Spark", "COBOL"]);
    const { measures, alignmentScore } = measureAlignment(observations, [{ text: "Python programming fundamentals", key: "E1" }, { text: "Data structures", key: "E2" }], ["cobol"], new Map());
    expect(measures.find((measure) => measure.skill === "Python")?.classification).toBe("current");
    expect(measures.find((measure) => measure.skill === "Apache Spark")?.classification).toBe("missing");
    expect(measures.find((measure) => measure.skill === "COBOL")?.classification).toBe("legacy");
    expect(alignmentScore).toBeGreaterThan(0);
    expect(alignmentScore).toBeLessThan(100);
  });

  it("scores confusion and builds topic series from feedback", () => {
    expect(confusionScore("I am confused and lost")).toBeGreaterThan(0.5);
    expect(confusionScore("Great lecture")).toBe(0);
    const series = buildTopicSeries(
      [{ key: "E1", sourceKind: "direct_student_feedback", content: "confused about recursion", confusionScore: 0.66, topic: "Recursion" }],
      ["Recursion", "Loops"],
      [{ topic: "Recursion", averageScore: 40, attempts: 20 }],
    );
    expect(series.find((point) => point.topic === "Recursion")).toMatchObject({ mentions: 1, confusionMentions: 1, averageQuizScore: 40 });
  });
});

describe("text utilities", () => {
  it("chunks deterministically while preserving locators", () => {
    const long = Array.from({ length: 60 }, (_, index) => `Sentence number ${index} talks about recursion and base cases in detail.`).join(" ");
    const segments = [{ text: "Short page.", locator: { page: 1 } }, { text: long, locator: { page: 2 } }];
    const first = chunkSegments(segments, { maxTokens: 120, overlapTokens: 20 });
    const second = chunkSegments(segments, { maxTokens: 120, overlapTokens: 20 });
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({ index: 0, content: "Short page.", locator: { page: 1 } });
    expect(first.length).toBeGreaterThan(2);
    expect(first.slice(1).every((chunk) => chunk.locator.page === 2 && chunk.tokenCount <= 130)).toBe(true);
  });

  it("redacts emails, phones, and student identifiers", () => {
    const result = redactIdentifiers("Contact rahim@uni.edu or +880 1711-123456; roll 2020-1-60-045; Name: Rahim Uddin");
    expect(result.text).toContain("[EMAIL]");
    expect(result.text).toContain("[STUDENT_ID]");
    expect(result.text).toContain("[NAME]");
    expect(result.text).not.toContain("rahim@uni.edu");
    expect(result.containsIdentifiers).toBe(true);
  });

  it("clusters vectors deterministically", () => {
    const vectors = [[1, 0, 0], [0.98, 0.1, 0], [0, 1, 0], [0, 0.97, 0.1], [0, 0, 1]];
    const result = agglomerativeCluster(vectors, { similarityThreshold: 0.8 });
    expect(result.clusters).toHaveLength(3);
    expect(result.assignments[0]).toBe(result.assignments[1]);
    expect(result.assignments[2]).toBe(result.assignments[3]);
    expect(agglomerativeCluster(vectors, { similarityThreshold: 0.8 })).toEqual(result);
    expect(agglomerativeCluster(vectors, { targetClusterCount: 2 }).clusters).toHaveLength(2);
  });

  it("deduplicates research works by DOI then normalized title and year", () => {
    const { works, removed } = deduplicateWorks(FIXTURE_WORKS);
    expect(removed).toBe(1);
    expect(works.filter((work) => work.doi === "10.1000/fl-imaging-2021")).toHaveLength(1);
    expect(works.find((work) => work.doi === "10.1000/fl-imaging-2021")?.citationCount).toBe(120);
  });
});
