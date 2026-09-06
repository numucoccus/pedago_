import * as XLSX from "xlsx";
import { beforeAll, describe, expect, it } from "vitest";
import { FakeResearchAdapter } from "../../src/providers/research/research-aggregator.js";
import { AppError } from "../../src/utils/errors.js";
import { createTestHarness, FIXTURE_WORKS, uploadDocument, USERS, type TestHarness } from "../helpers/harness.js";

async function runAnalysis(harness: TestHarness, token: string, body: Record<string, unknown>) {
  const created = await harness.api().post("/api/v1/analyses").set("Authorization", `Bearer ${token}`).send(body).expect(202);
  await harness.drainJobs();
  const detail = await harness.api().get(`/api/v1/analyses/${created.body.data.id}`).set("Authorization", `Bearer ${token}`).expect(200);
  return detail.body.data;
}

function expectEvidenceBacked(analysis: { status: string; result: { findings: unknown[]; evidence: { id: string }[]; confidence: string; limitations: unknown[]; provenance: { analysisId: string }; promptVersion: string } }) {
  expect(analysis.status).toBe("completed");
  expect(analysis.result.findings.length).toBeGreaterThan(0);
  expect(["low", "medium", "high"]).toContain(analysis.result.confidence);
  expect(Array.isArray(analysis.result.limitations)).toBe(true);
  expect(analysis.result.provenance.analysisId).toBeDefined();
  expect(analysis.result.promptVersion).toMatch(/\.v\d+$/);
}

describe("research gap verification workflow", () => {
  let harness: TestHarness;
  let workspaceId: string;
  let token: string;

  beforeAll(async () => {
    harness = await createTestHarness({
      researchAdapters: [
        new FakeResearchAdapter("fixture_a", FIXTURE_WORKS.filter((work) => work.source === "fixture_a")),
        new FakeResearchAdapter("fixture_b", FIXTURE_WORKS.filter((work) => work.source === "fixture_b")),
        new FakeResearchAdapter("broken", [], () => AppError.providerUnavailable("upstream down")),
      ],
    });
    ({ workspaceId } = await harness.seedWorkspace());
    token = await harness.token(USERS.faculty);
  });

  it("lists research and industry source catalogs", async () => {
    const research = await harness.api().get("/api/v1/research/sources").set("Authorization", `Bearer ${token}`).expect(200);
    expect(research.body.data.map((source: { key: string }) => source.key)).toEqual(["fixture_a", "fixture_b", "broken"]);
    const industry = await harness.api().get(`/api/v1/industry/sources?workspaceId=${workspaceId}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(industry.body.data[0].key).toBe("uploaded_dataset");
  });

  it("retrieves, deduplicates, records coverage, and never asserts novelty from failed sources", async () => {
    harness.ai.setResponder("research.gap", (context) => ({
      verdict: "supported",
      verdictRationale: "No retrieved work addresses label noise in low-resource hospital imaging.",
      closestWorkKeys: context.allowedEvidenceKeys.slice(0, 2),
      supportingFindings: [{ title: "Closest work differs in scope", summary: "Prior work covers privacy, not label noise.", confidence: "medium", sourceKind: "data_derived_pattern", evidenceKeys: [context.allowedEvidenceKeys[0]!], limitations: ["Only fixture sources searched."], requiresHumanReview: false }],
      contradictingFindings: [],
      suggestedClaimReformulation: "Few studies examine label-noise-robust federated learning for low-resource hospital imaging.",
      limitations: ["Coverage limited to two sources."],
    }));
    try {
      const analysis = await runAnalysis(harness, token, {
        workspaceId,
        type: "research_gap",
        title: "Gap check",
        input: { topic: "federated learning medical imaging", claimedGap: "No prior work studies federated learning on low-resource hospital imaging with label noise.", yearFrom: 2019, yearTo: 2023 },
      });
      expectEvidenceBacked(analysis);
      // "supported" is downgraded because one source failed.
      expect(analysis.result.output.verdict).toBe("partially_supported");
      expect(analysis.result.output.retrievedWorkCount).toBe(4);
      expect(analysis.result.output.searchCoverage.duplicatesRemoved).toBe(1);
      const failed = analysis.result.output.searchCoverage.sources.filter((entry: { ok: boolean }) => !entry.ok);
      expect(failed.length).toBeGreaterThan(0);
      expect(failed[0].errorCode).toBe("PROVIDER_UNAVAILABLE");
      expect(analysis.result.limitations.some((item: string) => item.includes("coverage incomplete"))).toBe(true);
      expect(analysis.result.evidence.every((item: { sourceType: string }) => item.sourceType === "research_work")).toBe(true);
      expect(analysis.result.output.closestWork).toHaveLength(2);
      const artifacts = await harness.api().get(`/api/v1/analyses/${analysis.id}/artifacts`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(artifacts.body.data[0].type).toBe("research_report");
      expect(artifacts.body.data[0].contentText).toContain("Search coverage");
      const stored = await harness.store.findMany("research_works");
      expect(stored).toHaveLength(4);
      const queries = await harness.store.findMany("research_queries", { filters: [{ column: "analysis_id", op: "eq", value: analysis.id }] });
      expect(queries.length).toBeGreaterThan(0);
    } finally {
      harness.ai.setResponder("research.gap", null);
    }
  });

  it("returns insufficient_evidence without calling the model when nothing is retrieved", async () => {
    const empty = await createTestHarness({ researchAdapters: [new FakeResearchAdapter("empty", [])] });
    const seeded = await empty.seedWorkspace();
    const emptyToken = await empty.token(USERS.faculty);
    const calls = empty.ai.structuredCalls;
    const analysis = await runAnalysis(empty, emptyToken, { workspaceId: seeded.workspaceId, type: "research_gap", title: "Nothing", input: { topic: "quantum basket weaving", claimedGap: "Nobody has studied quantum basket weaving pedagogy at all." } });
    expect(analysis.status).toBe("completed");
    expect(analysis.result.output.verdict).toBe("insufficient_evidence");
    expect(analysis.result.confidence).toBe("low");
    expect(empty.ai.structuredCalls).toBe(calls);
  });
});

describe("every registered analysis handler completes with validated, persisted results", () => {
  let harness: TestHarness;
  let workspaceId: string;
  let token: string;
  let studentId: string;

  beforeAll(async () => {
    harness = await createTestHarness();
    ({ workspaceId } = await harness.seedWorkspace());
    token = await harness.token(USERS.faculty);
    const student = await harness.api().post("/api/v1/students").set("Authorization", `Bearer ${token}`).send({ workspaceId, externalStudentId: "DEMO-001", displayName: "Demo Student", cgpa: 3.7, program: "BSc CSE", consentStatus: "granted" }).expect(201);
    studentId = student.body.data.id;
    for (const [title, category, level] of [["Hackathon winner", "technical", "national"], ["Class representative", "leadership", "institutional"], ["Blood donation camp volunteer", "service", "institutional"]] as const) {
      await harness.api().post(`/api/v1/students/${studentId}/achievements`).set("Authorization", `Bearer ${token}`).send({ title, category, level, achievementDate: "2026-03-01", issuer: "AUST" }).expect(201);
    }
  });

  it("research_evolution produces deterministic yearly series", async () => {
    const analysis = await runAnalysis(harness, token, { workspaceId, type: "research_evolution", title: "Trends", input: { topic: "federated learning", yearFrom: 2019, yearTo: 2022, keywords: ["federated", "privacy"], methodTerms: ["survey"] } });
    expectEvidenceBacked(analysis);
    expect(analysis.result.output.yearlySeries).toHaveLength(4);
    expect(analysis.result.output.sampleSize).toBe(4);
    const points = await harness.store.findMany("research_trend_points", { filters: [{ column: "analysis_id", op: "eq", value: analysis.id }] });
    expect(points.length).toBeGreaterThan(0);
  });

  it("research_question scores dimensions and caps novelty without literature", async () => {
    const analysis = await runAnalysis(harness, token, { workspaceId, type: "research_question", title: "RQ", input: { researchQuestion: "How does federated learning with label noise affect diagnostic accuracy in low-resource hospitals?", checkNovelty: true } });
    expectEvidenceBacked(analysis);
    expect(analysis.result.output.overallScore).toBeGreaterThanOrEqual(0);
    expect(analysis.result.output.scores.noveltyEvidence.score).toBeLessThanOrEqual(10);
    const offline = await runAnalysis(harness, token, { workspaceId, type: "research_question", title: "RQ offline", input: { researchQuestion: "Does peer instruction improve recursion understanding in first-year programming courses?", checkNovelty: false } });
    expect(offline.result.output.scores.noveltyEvidence.score).toBeLessThanOrEqual(3);
  });

  it("research_decision ranks options with explicit weights and persists them", async () => {
    const analysis = await runAnalysis(harness, token, {
      workspaceId,
      type: "research_decision",
      title: "Direction",
      input: {
        options: [
          { label: "Federated label-noise", description: "Robust FL under noisy labels", criteria: { noveltyEvidence: 8, feasibility: 5, dataAvailability: 4, methodFit: 7, expectedContribution: 8, risk: 6 } },
          { label: "Recursion pedagogy", description: "Diagnostic instruments for recursion", criteria: { noveltyEvidence: 5, feasibility: 9, dataAvailability: 9, methodFit: 8, expectedContribution: 6, risk: 2 } },
        ],
      },
    });
    expectEvidenceBacked(analysis);
    expect(analysis.result.output.options.map((option: { rank: number }) => option.rank).sort()).toEqual([1, 2]);
    expect(analysis.result.output.scoreVersion).toBe("research-decision-score.v1");
    const rows = await harness.store.findMany("research_decision_options", { filters: [{ column: "analysis_id", op: "eq", value: analysis.id }] });
    expect(rows).toHaveLength(2);
    const badWeights = await harness.api().post("/api/v1/analyses").set("Authorization", `Bearer ${token}`).send({ workspaceId, type: "research_decision", title: "bad", input: { options: [], weights: { noveltyEvidence: 90, feasibility: 20, dataAvailability: 0, methodFit: 0, expectedContribution: 0, risk: 0 } } }).expect(400);
    expect(badWeights.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("query_clustering anonymises, clusters deterministically, and drafts a broadcast", async () => {
    const messages = [
      "Why does the recursive function never stop? I think my base case is wrong",
      "My recursion never terminates, base case confusion",
      "Base case vs loop exit condition — what's the difference?",
      "When is the assignment 2 deadline? Can I get an extension?",
      "Is the deadline for assignment 2 Friday? Need extension please",
      "Where do I submit the lab report? Which room?",
      "How do stack frames work when recursion unwinds?",
      "Email me at rahim@uni.edu about the stack frame lecture recording",
    ].map((content, index) => ({ content, externalId: `m${index}` }));
    const analysis = await runAnalysis(harness, token, { workspaceId, type: "query_clustering", title: "Office hours", input: { messages, syllabusTopics: ["Recursion", "Stack frames", "Assessment logistics"], targetClusterCount: 3 } });
    expectEvidenceBacked(analysis);
    expect(analysis.result.output.totalMessages).toBe(8);
    expect(analysis.result.output.clusters).toHaveLength(3);
    expect(analysis.result.output.clusters.every((cluster: { representativeMessages: string[] }) => cluster.representativeMessages.every((message) => !message.includes("rahim@uni.edu")))).toBe(true);
    const artifacts = await harness.api().get(`/api/v1/analyses/${analysis.id}/artifacts`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(artifacts.body.data[0].type).toBe("broadcast");
    const stored = await harness.store.findMany("query_messages", { filters: [{ column: "analysis_id", op: "eq", value: analysis.id }] });
    expect(stored).toHaveLength(8);
    expect(stored.every((row) => !row.anonymized_content.includes("@uni.edu"))).toBe(true);
    const members = await harness.store.findMany("query_cluster_members");
    expect(members.length).toBe(8);
  });

  it("exam_misconception separates measured error rates from hypotheses and produces remedial artifacts", async () => {
    const analysis = await runAnalysis(harness, token, {
      workspaceId,
      type: "exam_misconception",
      title: "Midterm diagnostics",
      input: {
        examTitle: "Midterm 1",
        questions: [
          { number: "1", prompt: "Write a recursive factorial and explain the base case.", maximumMarks: 10, topic: "Recursion" },
          { number: "2", prompt: "Convert the for loop into a while loop.", maximumMarks: 5, topic: "Loops" },
        ],
        responses: [
          { questionNumber: "1", subjectKey: "s1", awardedMarks: 2, responseText: "factorial(n) returns n * factorial(n) with no stopping condition" },
          { questionNumber: "1", subjectKey: "s2", awardedMarks: 3, responseText: "I return n * factorial(n) and it stops by itself" },
          { questionNumber: "1", subjectKey: "s3", awardedMarks: 1, responseText: "base case is when n equals the loop counter" },
          { questionNumber: "1", subjectKey: "s4", awardedMarks: 10, responseText: "if n <= 1 return 1 else return n * factorial(n-1)" },
          { questionNumber: "2", subjectKey: "s1", awardedMarks: 5, responseText: "while i < n: ... i += 1" },
          { questionNumber: "2", subjectKey: "s2", awardedMarks: 1, responseText: "while loop without incrementing i" },
        ],
        syllabusTopics: ["Recursion", "Loops"],
      },
    });
    expectEvidenceBacked(analysis);
    const q1 = analysis.result.output.itemStatistics.find((stat: { questionNumber: string }) => stat.questionNumber === "1");
    expect(q1.errorRate).toBe(0.75);
    expect(q1.difficultyIndex).toBe(0.4);
    expect(analysis.result.output.heatmap[0].difficultyBand).toBe("hard");
    expect(analysis.result.output.remedialLesson.segments.length).toBeGreaterThanOrEqual(2);
    expect(analysis.result.output.diagnosticQuestions.length).toBeGreaterThanOrEqual(2);
    const measured = analysis.result.findings.filter((finding: { category: string }) => finding.category === "measured");
    const hypotheses = analysis.result.findings.filter((finding: { category: string }) => finding.category === "misconception");
    expect(measured.length).toBe(2);
    expect(hypotheses.every((finding: { requiresHumanReview: boolean; metrics: { sourceKind: string } }) => finding.requiresHumanReview && finding.metrics.sourceKind === "ai_hypothesis")).toBe(true);
    const clusters = await harness.store.findMany("misconception_clusters", { filters: [{ column: "analysis_id", op: "eq", value: analysis.id }] });
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0]?.error_rate).toBeGreaterThan(0);
    const types = (await harness.api().get(`/api/v1/analyses/${analysis.id}/artifacts`).set("Authorization", `Bearer ${token}`)).body.data.map((artifact: { type: string }) => artifact.type).sort();
    expect(types).toEqual(["diagnostic_questions", "remedial_lesson"]);
  });

  it("student_portfolio computes deterministic scores and persists them", async () => {
    const analysis = await runAnalysis(harness, token, { workspaceId, type: "student_portfolio", title: "Portfolio", input: { studentId } });
    expectEvidenceBacked(analysis);
    expect(analysis.result.output.score.version).toBe("portfolio-score.v1");
    expect(analysis.result.output.score.totalScore).toBeGreaterThan(0);
    expect(analysis.result.output.score.breakdown).toHaveLength(6);
    expect(analysis.result.output.achievements).toHaveLength(3);
    const scores = await harness.store.findMany("student_scores", { filters: [{ column: "student_id", op: "eq", value: studentId }] });
    expect(scores).toHaveLength(1);
    const custom = await runAnalysis(harness, token, { workspaceId, type: "student_portfolio", title: "Portfolio (custom weights)", input: { studentId, weights: { academic: 10, technical: 50, leadership: 10, service: 10, sportsCultural: 10, consistency: 10 } } });
    expect(custom.result.output.score.totalScore).not.toBe(analysis.result.output.score.totalScore);
    const foreign = await harness.seedWorkspace();
    const denied = await runAnalysis(harness, token, { workspaceId: foreign.workspaceId, type: "student_portfolio", title: "Foreign student", input: { studentId } });
    expect(denied.status).toBe("failed");
    expect(denied.failureCode).toBe("FORBIDDEN");
  });

  it("lor_dossier builds a requirement matrix, cites every claim, and requires approval", async () => {
    const analysis = await runAnalysis(harness, token, {
      workspaceId,
      type: "lor_dossier",
      title: "LOR",
      input: { studentId, targetProgram: { name: "MSc Data Science", institution: "Example University", requirements: ["Technical project experience such as hackathon participation", "Leadership in student organisations", "Published research papers"] }, tone: "formal" },
    });
    expectEvidenceBacked(analysis);
    expect(analysis.result.output.approvalRequired).toBe(true);
    expect(analysis.result.output.matrix).toHaveLength(3);
    expect(analysis.result.output.matrix.find((entry: { requirement: string }) => entry.requirement.startsWith("Published"))?.strength).toBe("missing");
    expect(analysis.result.output.claims.every((claim: { evidenceKeys: string[] }) => claim.evidenceKeys.length > 0)).toBe(true);
    const artifacts = (await harness.api().get(`/api/v1/analyses/${analysis.id}/artifacts`).set("Authorization", `Bearer ${token}`)).body.data;
    expect(artifacts.map((artifact: { type: string }) => artifact.type).sort()).toEqual(["lor_dossier", "lor_draft"]);
    expect(artifacts.every((artifact: { status: string }) => artifact.status === "draft")).toBe(true);
    expect(analysis.approvedAt).toBeNull();
  });

  it("curriculum_alignment measures coverage from an uploaded job dataset", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["skill", "frequency", "sector"], ["Python", 40, "data engineering"], ["Apache Spark", 25, "data engineering"], ["SQL", 35, "data engineering"], ["COBOL", 1, "data engineering"]]), "Jobs");
    const dataset = await uploadDocument(harness, token, workspaceId, { title: "Job postings 2026", filename: "jobs.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer, kind: "job_dataset" });
    const syllabus = await uploadDocument(harness, token, workspaceId, { title: "Syllabus", filename: "syllabus.txt", mimeType: "text/plain", kind: "syllabus", body: Buffer.from("Module 1: Python programming and data structures.\n\nModule 2: SQL and relational databases.\n\nModule 3: Legacy COBOL maintenance.") });
    const analysis = await runAnalysis(harness, token, { workspaceId, type: "curriculum_alignment", title: "Alignment", documentIds: [dataset.id, syllabus.id], input: { targetSector: "data engineering", syllabusTopics: ["Python programming", "SQL databases"], learningOutcomes: ["Write Python programs"], legacyHintTerms: ["COBOL"] } });
    expectEvidenceBacked(analysis);
    const skills = analysis.result.output.skills as { skill: string; classification: string }[];
    expect(skills.find((skill) => skill.skill === "Python")?.classification).toBe("current");
    expect(skills.find((skill) => skill.skill === "Apache Spark")?.classification).toBe("missing");
    expect(skills.find((skill) => skill.skill === "COBOL")?.classification).toBe("legacy");
    expect(analysis.result.output.alignmentScore).toBeGreaterThan(0);
    expect(analysis.result.output.sources[0].retrievedAt).toBeDefined();
    expect(analysis.result.output.recommendations.length).toBeGreaterThan(0);
    const mappings = await harness.store.findMany("curriculum_skill_mappings", { filters: [{ column: "analysis_id", op: "eq", value: analysis.id }] });
    expect(mappings.length).toBe(skills.length);
  });

  it("verification updates are audited and OCR-extracted facts can never become issuer_verified without a URL", async () => {
    const achievements = (await harness.api().get(`/api/v1/students/${studentId}/achievements`).set("Authorization", `Bearer ${token}`)).body.data;
    const target = achievements[0];
    const denied = await harness.api().patch(`/api/v1/achievements/${target.id}/verification`).set("Authorization", `Bearer ${token}`).send({ verificationStatus: "issuer_verified" }).expect(400);
    expect(denied.body.error.code).toBe("VALIDATION_FAILED");
    const reviewer = await harness.token(USERS.reviewer);
    await harness.api().patch(`/api/v1/achievements/${target.id}/verification`).set("Authorization", `Bearer ${reviewer}`).send({ verificationStatus: "faculty_verified" }).expect(403);
    const verified = await harness.api().patch(`/api/v1/achievements/${target.id}/verification`).set("Authorization", `Bearer ${token}`).send({ verificationStatus: "faculty_verified" }).expect(200);
    expect(verified.body.data.verifiedBy).toBe(USERS.faculty);
    const audits = await harness.container.repositories.audit.list(workspaceId, 500);
    expect(audits.some((event) => event.action === "achievement.verification_updated")).toBe(true);
    const invalidCreate = await harness.api().post(`/api/v1/students/${studentId}/achievements`).set("Authorization", `Bearer ${token}`).send({ title: "Fake", category: "technical", verificationStatus: "issuer_verified" }).expect(400);
    expect(invalidCreate.body.error.code).toBe("VALIDATION_FAILED");
  });
});
