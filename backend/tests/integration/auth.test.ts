import { describe, expect, it, beforeAll } from "vitest";
import { createTestHarness, USERS, type TestHarness } from "../helpers/harness.js";

describe("authentication, authorization, and error envelopes", () => {
  let harness: TestHarness;
  let workspaceId: string;
  let otherWorkspaceId: string;

  beforeAll(async () => {
    harness = await createTestHarness();
    ({ workspaceId } = await harness.seedWorkspace());
    const repo = harness.container.repositories.workspaces;
    const org = await repo.createOrganization({ name: "Other Uni", slug: "other-uni", createdBy: USERS.outsider });
    await repo.addOrganizationMember(org.id, USERS.outsider, "owner");
    const other = await repo.createWorkspace({ organizationId: org.id, name: "Other", slug: "other", createdBy: USERS.outsider });
    await repo.addMember(other.id, USERS.outsider, "owner");
    otherWorkspaceId = other.id;
  });

  it("returns AUTH_REQUIRED envelope without a bearer token", async () => {
    const response = await harness.api().get("/api/v1/me").expect(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
    expect(typeof response.body.requestId).toBe("string");
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
  });

  it("rejects tokens signed with the wrong secret or wrong audience", async () => {
    const { SignJWT } = await import("jose");
    const bad = await new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(USERS.owner).setExpirationTime("1h").sign(new TextEncoder().encode("another-secret-that-is-long-enough-123456"));
    const response = await harness.api().get("/api/v1/me").set("Authorization", `Bearer ${bad}`).expect(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
    const wrongAudience = await harness.token(USERS.owner, { aud: "anon" });
    await harness.api().get("/api/v1/me").set("Authorization", `Bearer ${wrongAudience}`).expect(401);
  });

  it("resolves the user from the token and lists memberships", async () => {
    const token = await harness.token(USERS.faculty);
    const response = await harness.api().get("/api/v1/me").set("Authorization", `Bearer ${token}`).expect(200);
    expect(response.body.data.id).toBe(USERS.faculty);
    expect(response.body.data.workspaces).toHaveLength(1);
    expect(response.body.data.workspaces[0].role).toBe("faculty");
  });

  it("denies cross-workspace access with FORBIDDEN", async () => {
    const token = await harness.token(USERS.outsider);
    const response = await harness.api().get(`/api/v1/workspaces/${workspaceId}`).set("Authorization", `Bearer ${token}`).expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    const member = await harness.token(USERS.faculty);
    await harness.api().get(`/api/v1/workspaces/${otherWorkspaceId}`).set("Authorization", `Bearer ${member}`).expect(403);
    // Listing documents for a foreign workspace is also denied even though the query is valid.
    await harness.api().get(`/api/v1/documents?workspaceId=${otherWorkspaceId}`).set("Authorization", `Bearer ${member}`).expect(403);
  });

  it("requires owner/admin for membership management", async () => {
    const reviewer = await harness.token(USERS.reviewer);
    const denied = await harness
      .api()
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${reviewer}`)
      .send({ userId: USERS.outsider, role: "faculty" })
      .expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    const owner = await harness.token(USERS.owner);
    const added = await harness
      .api()
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ userId: USERS.outsider, role: "reviewer" })
      .expect(201);
    expect(added.body.data.role).toBe("reviewer");
    const duplicate = await harness.api().post(`/api/v1/workspaces/${workspaceId}/members`).set("Authorization", `Bearer ${owner}`).send({ userId: USERS.outsider, role: "reviewer" }).expect(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");
    await harness.api().delete(`/api/v1/workspaces/${workspaceId}/members/${added.body.data.id}`).set("Authorization", `Bearer ${owner}`).expect(204);
  });

  it("returns VALIDATION_FAILED with details for bad bodies and RESOURCE_NOT_FOUND for unknown routes", async () => {
    const token = await harness.token(USERS.owner);
    const response = await harness.api().post("/api/v1/workspaces").set("Authorization", `Bearer ${token}`).send({ name: "x", slug: "Bad Slug" }).expect(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(response.body.error.details)).toBe(true);
    const missing = await harness.api().get("/api/v1/nope").set("Authorization", `Bearer ${token}`).expect(404);
    expect(missing.body.error.code).toBe("RESOURCE_NOT_FOUND");
    const badJson = await harness.api().post("/api/v1/workspaces").set("Authorization", `Bearer ${token}`).set("Content-Type", "application/json").send("{not json").expect(400);
    expect(badJson.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("creates a workspace with a new organization and records an audit event", async () => {
    const token = await harness.token(USERS.faculty);
    const response = await harness.api().post("/api/v1/workspaces").set("Authorization", `Bearer ${token}`).send({ name: "Research Lab", slug: "research-lab" }).expect(201);
    expect(response.body.data.role).toBe("owner");
    const audits = await harness.container.repositories.audit.list(response.body.data.id);
    expect(audits.some((event) => event.action === "workspace.created")).toBe(true);
  });

  it("serves the OpenAPI document and health endpoint without auth", async () => {
    const health = await harness.api().get("/api/v1/health").expect(200);
    expect(health.body.data.status).toBe("ok");
    const openapi = await harness.api().get("/api/v1/openapi.json").expect(200);
    expect(openapi.body.openapi).toBe("3.1.0");
    expect(Object.keys(openapi.body.paths)).toEqual(expect.arrayContaining(["/analyses", "/documents/upload-intent", "/students/{id}/achievements"]));
  });
});
