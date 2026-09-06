import type { ResearchWork } from "@pedago/shared";
import type { Express } from "express";
import { SignJWT } from "jose";
import pino from "pino";
import supertest from "supertest";
import { createApp } from "../../src/app.js";
import { testEnv, type Env } from "../../src/config/env.js";
import { buildContainer, type Container } from "../../src/container.js";
import { InlineJobDispatcher } from "../../src/jobs/dispatcher.js";
import { FakeAIProvider } from "../../src/providers/ai/fake-ai-provider.js";
import { FakeResearchAdapter } from "../../src/providers/research/research-aggregator.js";
import type { ResearchSourceAdapter } from "../../src/providers/research/research-source.js";
import { MemoryStorageProvider } from "../../src/providers/storage/memory-storage-provider.js";
import { MemoryDataStore } from "../../src/repositories/memory-data-store.js";

export const TEST_JWT_SECRET = "test-jwt-secret-with-at-least-32-characters!";
export const USERS = {
  owner: "11111111-1111-4111-8111-111111111111",
  faculty: "22222222-2222-4222-8222-222222222222",
  reviewer: "33333333-3333-4333-8333-333333333333",
  outsider: "44444444-4444-4444-8444-444444444444",
};

export interface TestHarness {
  app: Express;
  container: Container;
  env: Env;
  ai: FakeAIProvider;
  storage: MemoryStorageProvider;
  store: MemoryDataStore;
  research: FakeResearchAdapter[];
  token(userId: string, overrides?: Record<string, unknown>): Promise<string>;
  api(): ReturnType<typeof supertest>;
  drainJobs(): Promise<void>;
  seedWorkspace(): Promise<{ workspaceId: string; organizationId: string }>;
}

export const FIXTURE_WORKS: ResearchWork[] = [
  { externalId: "W1", source: "fixture_a", doi: "10.1000/fl-imaging-2021", title: "Federated learning for medical imaging under label noise", abstract: "We study federated learning across hospitals with noisy labels and low-resource imaging devices.", authors: ["A. Rahman", "B. Chen"], publicationYear: 2021, venue: "MICCAI", citationCount: 120, url: "https://doi.org/10.1000/fl-imaging-2021", retrievedAt: new Date().toISOString() },
  { externalId: "W2", source: "fixture_a", doi: "10.1000/fl-privacy-2020", title: "Privacy-preserving federated learning: a survey", abstract: "A survey of privacy techniques for federated learning including differential privacy and secure aggregation.", authors: ["C. Diaz"], publicationYear: 2020, venue: "ACM CSUR", citationCount: 400, url: "https://doi.org/10.1000/fl-privacy-2020", retrievedAt: new Date().toISOString() },
  { externalId: "W3", source: "fixture_a", title: "Recursion misconceptions in introductory programming", abstract: "We analyse how novices misunderstand base cases in recursion and propose diagnostic questions.", authors: ["D. Okafor"], publicationYear: 2019, venue: "SIGCSE", citationCount: 35, url: "https://example.org/recursion", retrievedAt: new Date().toISOString() },
  { externalId: "W1-dup", source: "fixture_b", doi: "https://doi.org/10.1000/FL-IMAGING-2021", title: "Federated Learning for Medical Imaging Under Label Noise", abstract: "Duplicate record from another source.", authors: ["A. Rahman"], publicationYear: 2021, url: "https://example.org/w1dup", retrievedAt: new Date().toISOString() },
  { externalId: "W4", source: "fixture_b", title: "Curriculum alignment with industry skills in computing", abstract: "Mapping course outcomes to job postings for data engineering roles.", authors: ["E. Silva"], publicationYear: 2022, venue: "ITiCSE", citationCount: 12, url: "https://example.org/curriculum", retrievedAt: new Date().toISOString() },
];

export async function createTestHarness(options: { researchAdapters?: ResearchSourceAdapter[]; envOverrides?: Partial<Record<keyof Env, string>> } = {}): Promise<TestHarness> {
  const env = testEnv(options.envOverrides);
  const store = new MemoryDataStore();
  const storage = new MemoryStorageProvider();
  const ai = new FakeAIProvider(env.AI_EMBEDDING_DIMENSION, { maxRetries: 1 });
  const research = options.researchAdapters ? [] : [new FakeResearchAdapter("fixture_a", FIXTURE_WORKS.filter((w) => w.source === "fixture_a")), new FakeResearchAdapter("fixture_b", FIXTURE_WORKS.filter((w) => w.source === "fixture_b"))];
  const logger = pino({ level: "silent" });
  const jobs = new InlineJobDispatcher("deferred");
  const container = buildContainer(env, { logger, dataStore: store, storage, ai, researchAdapters: options.researchAdapters ?? research, jobDispatcher: jobs, inlineJobMode: "deferred" });
  const app = createApp(container);
  const secret = new TextEncoder().encode(TEST_JWT_SECRET);

  const harness: TestHarness = {
    app,
    container,
    env,
    ai,
    storage,
    store,
    research: research as FakeResearchAdapter[],
    async token(userId, overrides = {}) {
      const { aud, ...claims } = overrides as { aud?: string } & Record<string, unknown>;
      return new SignJWT({ role: "authenticated", email: `${userId.slice(0, 8)}@example.edu`, ...claims })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setAudience(aud ?? "authenticated")
        .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);
    },
    api: () => supertest(app),
    drainJobs: () => jobs.drain(),
    async seedWorkspace() {
      const repo = container.repositories.workspaces;
      const organization = await repo.createOrganization({ name: "Test University", slug: `test-${Math.random().toString(36).slice(2, 8)}`, createdBy: USERS.owner });
      await repo.addOrganizationMember(organization.id, USERS.owner, "owner");
      await repo.addOrganizationMember(organization.id, USERS.faculty, "faculty");
      await repo.addOrganizationMember(organization.id, USERS.reviewer, "reviewer");
      const workspace = await repo.createWorkspace({ organizationId: organization.id, name: "CSE Dept", slug: "cse", createdBy: USERS.owner, settings: { demo: true } });
      await repo.addMember(workspace.id, USERS.owner, "owner");
      await repo.addMember(workspace.id, USERS.faculty, "faculty");
      await repo.addMember(workspace.id, USERS.reviewer, "reviewer");
      return { workspaceId: workspace.id, organizationId: organization.id };
    },
  };
  return harness;
}

/** Uploads a document through the API (intent → storage PUT simulated → complete) and drains processing. */
export async function uploadDocument(
  harness: TestHarness,
  token: string,
  workspaceId: string,
  file: { title: string; filename: string; mimeType: string; body: Buffer; kind?: string; purpose?: string },
  options: { drain?: boolean } = {},
): Promise<{ id: string; status: string }> {
  const intent = await harness
    .api()
    .post("/api/v1/documents/upload-intent")
    .set("Authorization", `Bearer ${token}`)
    .send({ workspaceId, kind: file.kind ?? "teacher_note", title: file.title, filename: file.filename, mimeType: file.mimeType, byteSize: file.body.byteLength, purpose: file.purpose ?? "academic" })
    .expect(201);
  const document = intent.body.data.document;
  // Simulate the client PUT to the signed URL using the stored bucket/path.
  const row = await harness.container.repositories.documents.getById(document.id);
  if (!row) throw new Error("document row missing");
  await harness.storage.upload(row.storage_bucket, row.storage_path, file.body, file.mimeType);
  const completed = await harness.api().post(`/api/v1/documents/${document.id}/complete`).set("Authorization", `Bearer ${token}`).send({}).expect(202);
  if (options.drain !== false) await harness.drainJobs();
  return { id: document.id, status: completed.body.data.status };
}
