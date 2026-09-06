import { beforeAll, describe, expect, it } from "vitest";
import { createTestHarness, uploadDocument, USERS, type TestHarness } from "../helpers/harness.js";

const pulseInput = {
  weekLabel: "Week 5",
  topics: ["Recursion", "Base cases", "Loops"],
  teacherObservations: ["Several students conflated the base case with a loop exit condition."],
  exitSlips: ["I'm confused about when recursion stops", "Base case still unclear to me", "Loops were fine", "Why does the recursive call come before the return?", "I don't understand stack frames"],
  quizSummary: [{ topic: "Recursion", averageScore: 48, attempts: 30 }, { topic: "Loops", averageScore: 82, attempts: 30 }],
};

describe("analysis lifecycle: teaching pulse end to end", () => {
  let harness: TestHarness;
  let workspaceId: string;
  let token: string;
  let documentId: string;

  beforeAll(async () => {
    harness = await createTestHarness();
    ({ workspaceId } = await harness.seedWorkspace());
    token = await harness.token(USERS.faculty);
    const uploaded = await uploadDocument(harness, token, workspaceId, {
      title: "Recursion syllabus",
      filename: "syllabus.txt",
      mimeType: "text/plain",
      kind: "syllabus",
      body: Buffer.from("Week 5: Recursion. Learning outcomes: identify base cases, trace recursive calls, compare recursion with iteration.\n\nWeek 6: Stack frames and call order."),
    });
    documentId = uploaded.id;
  });

  it("rejects invalid handler input before queuing", async () => {
    const response = await harness
      .api()
      .post("/api/v1/analyses")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId, type: "research_gap", title: "bad", input: { topic: "x" } })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects documents from another workspace", async () => {
    const other = await harness.seedWorkspace();
    const response = await harness
      .api()
      .post("/api/v1/analyses")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId: other.workspaceId, type: "teaching_pulse", title: "x", documentIds: [documentId], input: pulseInput })
      .expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("runs queued → extracting → indexing → analyzing → completed with evidence-backed results", async () => {
    const created = await harness
      .api()
      .post("/api/v1/analyses")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "pulse-week-5-0001")
      .send({ workspaceId, type: "teaching_pulse", title: "Week 5 Recursion Pulse", documentIds: [documentId], input: pulseInput })
      .expect(202);
    const analysisId = created.body.data.id as string;
    expect(created.body.data.status).toBe("queued");
    expect(created.body.data.module).toBe("teaching");

    const replay = await harness
      .api()
      .post("/api/v1/analyses")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "pulse-week-5-0001")
      .send({ workspaceId, type: "teaching_pulse", title: "Week 5 Recursion Pulse", documentIds: [documentId], input: pulseInput })
      .expect(200);
    expect(replay.body.data.id).toBe(analysisId);
    expect(replay.body.meta.idempotentReplay).toBe(true);
    const mismatch = await harness
      .api()
      .post("/api/v1/analyses")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", "pulse-week-5-0001")
      .send({ workspaceId, type: "teaching_pulse", title: "Different title", documentIds: [documentId], input: pulseInput })
      .expect(409);
    expect(mismatch.body.error.code).toBe("CONFLICT");

    // Approval before completion must be refused.
    await harness.api().post(`/api/v1/analyses/${analysisId}/approve`).set("Authorization", `Bearer ${token}`).send({}).expect(409);

    await harness.drainJobs();
    const detail = await harness.api().get(`/api/v1/analyses/${analysisId}`).set("Authorization", `Bearer ${token}`).expect(200);
    const analysis = detail.body.data;
    expect(analysis.status).toBe("completed");
    expect(analysis.progress).toBe(100);
    expect(analysis.attemptCount).toBe(1);
    expect(analysis.promptVersion).toBe("teaching.pulse.v1");
    expect(analysis.modelProvider).toBe("fake");
    const statuses = analysis.events.map((event: { status: string }) => event.status);
    expect(statuses).toEqual(expect.arrayContaining(["queued", "extracting", "indexing", "analyzing", "completed"]));
    expect(statuses.indexOf("extracting")).toBeLessThan(statuses.indexOf("indexing"));
    expect(statuses.indexOf("indexing")).toBeLessThan(statuses.indexOf("analyzing"));

    const result = analysis.result;
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(result.confidence);
    expect(Array.isArray(result.limitations)).toBe(true);
    expect(result.provenance.modelCalls[0].promptVersion).toBe("teaching.pulse.v1");
    expect(result.provenance.documentIds).toEqual([documentId]);
    expect(result.model.provider).toBe("fake");
    const evidenceIds = new Set(result.evidence.map((item: { id: string }) => item.id));
    for (const finding of result.findings) {
      for (const link of finding.evidence) expect(evidenceIds.has(link.evidenceId)).toBe(true);
    }
    expect(result.evidence.some((item: { sourceType: string }) => item.sourceType === "document_chunk")).toBe(true);
    expect(result.output.actionPlan).toHaveLength(3);
    expect(result.output.warmupQuestions.length).toBeGreaterThanOrEqual(3);
    expect(result.output.sourceBreakdown.direct_student_feedback).toBe(5);
    // AI hypotheses must always be flagged for review.
    const hypotheses = result.findings.filter((finding: { metrics: { sourceKind?: string } }) => finding.metrics.sourceKind === "ai_hypothesis");
    expect(hypotheses.every((finding: { requiresHumanReview: boolean }) => finding.requiresHumanReview)).toBe(true);

    const evidence = await harness.api().get(`/api/v1/analyses/${analysisId}/evidence`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(evidence.body.data.evidence.length).toBe(result.evidence.length);

    const artifacts = await harness.api().get(`/api/v1/analyses/${analysisId}/artifacts`).set("Authorization", `Bearer ${token}`).expect(200);
    const types = artifacts.body.data.map((artifact: { type: string }) => artifact.type).sort();
    expect(types).toEqual(["action_plan", "warmup_quiz"]);
    const actionPlan = artifacts.body.data.find((artifact: { type: string }) => artifact.type === "action_plan");

    // Export requires approval; editing creates a version; approval unlocks export; export is idempotent.
    const exportDenied = await harness.api().post(`/api/v1/artifacts/${actionPlan.id}/export`).set("Authorization", `Bearer ${token}`).send({ format: "markdown" }).expect(409);
    expect(exportDenied.body.error.code).toBe("CONFLICT");
    const edited = await harness.api().patch(`/api/v1/artifacts/${actionPlan.id}`).set("Authorization", `Bearer ${token}`).send({ contentText: "1. Re-teach base cases with a trace table.\n2. Pair exercise.\n3. Exit quiz." }).expect(200);
    expect(edited.body.data.version).toBe(2);
    expect(edited.body.data.status).toBe("faculty_edited");
    const versions = await harness.container.repositories.analyses.listArtifactVersions(actionPlan.id);
    expect(versions.map((version) => version.version)).toEqual([1, 2]);
    // Reviewers cannot approve.
    const reviewer = await harness.token(USERS.reviewer);
    await harness.api().post(`/api/v1/analyses/${analysisId}/approve`).set("Authorization", `Bearer ${reviewer}`).send({}).expect(403);
    const approved = await harness.api().post(`/api/v1/analyses/${analysisId}/approve`).set("Authorization", `Bearer ${token}`).send({ note: "Looks right" }).expect(200);
    expect(approved.body.data.approvedBy).toBe(USERS.faculty);
    const exported = await harness.api().post(`/api/v1/artifacts/${actionPlan.id}/export`).set("Authorization", `Bearer ${token}`).set("Idempotency-Key", "export-0001").send({ format: "markdown" }).expect(201);
    expect(exported.body.data.downloadUrl).toContain("generated-exports");
    expect(exported.body.data.path.startsWith(`${analysis.workspaceId}`)).toBe(false);
    const replayExport = await harness.api().post(`/api/v1/artifacts/${actionPlan.id}/export`).set("Authorization", `Bearer ${token}`).set("Idempotency-Key", "export-0001").send({ format: "markdown" }).expect(200);
    expect(replayExport.body.data.path).toBe(exported.body.data.path);
    expect(replayExport.body.meta.idempotentReplay).toBe(true);

    // Cross-workspace read denial on the analysis itself.
    const outsider = await harness.token(USERS.outsider);
    await harness.api().get(`/api/v1/analyses/${analysisId}`).set("Authorization", `Bearer ${outsider}`).expect(403);

    const audits = await harness.container.repositories.audit.list(workspaceId, 200);
    const actions = audits.map((event) => event.action);
    expect(actions).toEqual(expect.arrayContaining(["analysis.created", "analysis.completed", "analysis.approved", "artifact.updated", "artifact.exported", "analysis.accessed"]));
  });

  it("marks retryable AI failures, retries up to the limit, and exposes an actionable failure code", async () => {
    harness.ai.setResponder("teaching.pulse", () => ({ totally: "wrong" }));
    try {
      const created = await harness
        .api()
        .post("/api/v1/analyses")
        .set("Authorization", `Bearer ${token}`)
        .send({ workspaceId, type: "teaching_pulse", title: "Failing pulse", documentIds: [], input: pulseInput })
        .expect(202);
      const analysisId = created.body.data.id as string;
      await harness.drainJobs();
      const detail = await harness.api().get(`/api/v1/analyses/${analysisId}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(detail.body.data.status).toBe("failed");
      expect(detail.body.data.failureCode).toBe("AI_OUTPUT_INVALID");
      expect(detail.body.data.attemptCount).toBe(3);
      expect(detail.body.data.result).toBeNull();
      const retryEvents = detail.body.data.events.filter((event: { metadata: { retryable?: boolean } }) => event.metadata.retryable === true);
      expect(retryEvents.length).toBe(2);
      const findings = await harness.container.repositories.analyses.listFindings(analysisId);
      expect(findings).toHaveLength(0);

      // Faculty retry re-queues and, once the provider recovers, succeeds without duplicating results.
      harness.ai.setResponder("teaching.pulse", null);
      const retried = await harness.api().post(`/api/v1/analyses/${analysisId}/retry`).set("Authorization", `Bearer ${token}`).expect(202);
      expect(retried.body.data.status).toBe("queued");
      await harness.drainJobs();
      const recovered = await harness.api().get(`/api/v1/analyses/${analysisId}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(recovered.body.data.status).toBe("completed");
      expect(recovered.body.data.attemptCount).toBe(4);
      const evidence = await harness.container.repositories.analyses.listEvidence(analysisId);
      expect(new Set(evidence.map((item) => (item.metadata as { key: string }).key)).size).toBe(evidence.length);
    } finally {
      harness.ai.setResponder("teaching.pulse", null);
    }
  });

  it("cancels a queued analysis so the job becomes a no-op and refuses retry of completed analyses", async () => {
    const created = await harness
      .api()
      .post("/api/v1/analyses")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId, type: "teaching_pulse", title: "Cancel me", input: pulseInput })
      .expect(202);
    const analysisId = created.body.data.id as string;
    const cancelled = await harness.api().post(`/api/v1/analyses/${analysisId}/cancel`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(cancelled.body.data.status).toBe("cancelled");
    await harness.drainJobs();
    const detail = await harness.api().get(`/api/v1/analyses/${analysisId}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(detail.body.data.status).toBe("cancelled");
    expect(detail.body.data.attemptCount).toBe(0);
    await harness.api().post(`/api/v1/analyses/${analysisId}/cancel`).set("Authorization", `Bearer ${token}`).expect(200);
    // Cancelled analyses can be retried; completed ones cannot.
    const list = await harness.api().get(`/api/v1/analyses?workspaceId=${workspaceId}&status=completed`).set("Authorization", `Bearer ${token}`).expect(200);
    const completedId = list.body.data[0].id;
    await harness.api().post(`/api/v1/analyses/${completedId}/retry`).set("Authorization", `Bearer ${token}`).expect(409);
    await harness.api().post(`/api/v1/analyses/${completedId}/cancel`).set("Authorization", `Bearer ${token}`).expect(409);
  });

  it("rejects model output that cites evidence outside the provided context", async () => {
    harness.ai.setResponder("teaching.pulse", () => ({
      frictionPoints: [{ topic: "Recursion", description: "x", sourceKind: "direct_student_feedback", evidenceKeys: ["E999"], severity: "high" }],
      actionPlan: ["a", "b", "c"],
      warmupQuestions: [{ topic: "Recursion", question: "q1", targetsMisconception: "" }, { topic: "Recursion", question: "q2", targetsMisconception: "" }, { topic: "Recursion", question: "q3", targetsMisconception: "" }],
      findings: [{ title: "t", summary: "s", confidence: "high", sourceKind: "ai_hypothesis", evidenceKeys: ["E999"], limitations: ["l"], requiresHumanReview: true }],
      limitations: ["l"],
    }));
    try {
      const created = await harness.api().post("/api/v1/analyses").set("Authorization", `Bearer ${token}`).send({ workspaceId, type: "teaching_pulse", title: "Hallucinated citations", input: pulseInput }).expect(202);
      await harness.drainJobs();
      const detail = await harness.api().get(`/api/v1/analyses/${created.body.data.id}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(detail.body.data.status).toBe("failed");
      expect(detail.body.data.failureCode).toBe("AI_OUTPUT_INVALID");
      expect(detail.body.data.failureMessage).toMatch(/outside the provided context/);
    } finally {
      harness.ai.setResponder("teaching.pulse", null);
    }
  });
});
