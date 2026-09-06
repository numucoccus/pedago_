import * as XLSX from "xlsx";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestHarness, uploadDocument, USERS, type TestHarness } from "../helpers/harness.js";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);

describe("documents: upload validation and processing pipeline", () => {
  let harness: TestHarness;
  let workspaceId: string;
  let token: string;

  beforeAll(async () => {
    harness = await createTestHarness();
    ({ workspaceId } = await harness.seedWorkspace());
    token = await harness.token(USERS.faculty);
  });

  it("rejects unsupported types, oversized files, purpose mismatches, and extension mismatches", async () => {
    const base = { workspaceId, kind: "syllabus", title: "Syllabus", filename: "syllabus.exe", mimeType: "application/x-msdownload", byteSize: 100, purpose: "academic" };
    let response = await harness.api().post("/api/v1/documents/upload-intent").set("Authorization", `Bearer ${token}`).send(base).expect(400);
    expect(response.body.error.code).toBe("UPLOAD_INVALID");
    response = await harness.api().post("/api/v1/documents/upload-intent").set("Authorization", `Bearer ${token}`).send({ ...base, filename: "a.pdf", mimeType: "application/pdf", byteSize: 500 * 1024 * 1024 }).expect(400);
    expect(response.body.error.code).toBe("UPLOAD_INVALID");
    response = await harness.api().post("/api/v1/documents/upload-intent").set("Authorization", `Bearer ${token}`).send({ ...base, filename: "note.mp3", mimeType: "audio/mpeg", purpose: "academic" }).expect(400);
    expect(response.body.error.code).toBe("UPLOAD_INVALID");
    response = await harness.api().post("/api/v1/documents/upload-intent").set("Authorization", `Bearer ${token}`).send({ ...base, filename: "a.docx", mimeType: "application/pdf" }).expect(400);
    expect(response.body.error.code).toBe("UPLOAD_INVALID");
  });

  it("reviewers cannot create upload intents", async () => {
    const reviewer = await harness.token(USERS.reviewer);
    await harness
      .api()
      .post("/api/v1/documents/upload-intent")
      .set("Authorization", `Bearer ${reviewer}`)
      .send({ workspaceId, kind: "syllabus", title: "Syllabus", filename: "a.txt", mimeType: "text/plain", byteSize: 10, purpose: "academic" })
      .expect(403);
  });

  it("returns a signed upload instruction with a workspace-scoped private path and never a public URL", async () => {
    const response = await harness
      .api()
      .post("/api/v1/documents/upload-intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId, kind: "syllabus", title: "Syllabus", filename: "My Syllabus (v2).txt", mimeType: "text/plain", byteSize: 10, purpose: "academic" })
      .expect(201);
    const { document, upload } = response.body.data;
    expect(document.status).toBe("pending_upload");
    expect(upload.method).toBe("PUT");
    expect(upload.url).not.toContain("/public/");
    expect(new Date(upload.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const row = await harness.container.repositories.documents.getById(document.id);
    expect(row?.storage_path.startsWith(`${row?.organization_id}/${workspaceId}/${document.id}/`)).toBe(true);
    expect(row?.original_filename).toBe("My_Syllabus_(v2).txt");
  });

  it("complete fails when the object is missing and succeeds after upload, then processes text into redacted chunks", async () => {
    const intent = await harness
      .api()
      .post("/api/v1/documents/upload-intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId, kind: "exit_slip", title: "Exit slips", filename: "slips.txt", mimeType: "text/plain", byteSize: 200, purpose: "academic" })
      .expect(201);
    const id = intent.body.data.document.id;
    const missing = await harness.api().post(`/api/v1/documents/${id}/complete`).set("Authorization", `Bearer ${token}`).send({}).expect(400);
    expect(missing.body.error.code).toBe("UPLOAD_INVALID");

    const body = Buffer.from("Student: Ayesha Karim, ID 2020-1-60-123, email ayesha@example.edu\n\nI am confused about recursion base cases.\n\nThe loop lecture was clear.", "utf8");
    const row = await harness.container.repositories.documents.getById(id);
    await harness.storage.upload(row!.storage_bucket, row!.storage_path, body, "text/plain");
    const completed = await harness.api().post(`/api/v1/documents/${id}/complete`).set("Authorization", `Bearer ${token}`).send({}).expect(202);
    expect(completed.body.data.status).toBe("uploaded");
    await harness.drainJobs();

    const detail = await harness.api().get(`/api/v1/documents/${id}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(detail.body.data.status).toBe("ready");
    expect(detail.body.data.chunkCount).toBeGreaterThan(0);
    expect(detail.body.data.containsPersonalData).toBe(true);
    const chunks = await harness.container.repositories.documents.listChunks(id);
    const text = chunks.map((chunk) => chunk.content).join(" ");
    expect(text).not.toContain("ayesha@example.edu");
    expect(text).not.toContain("2020-1-60-123");
    expect(text).toContain("[EMAIL]");
    expect(chunks.every((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length === harness.env.AI_EMBEDDING_DIMENSION)).toBe(true);
    expect(chunks[0]?.locator).toMatchObject({ section: "p1" });
  });

  it("reprocessing identical content reuses the extraction without re-embedding (idempotent chunks)", async () => {
    const uploaded = await uploadDocument(harness, token, workspaceId, { title: "Notes", filename: "notes.txt", mimeType: "text/plain", body: Buffer.from("Paragraph one about recursion.\n\nParagraph two about iteration.") });
    const before = await harness.container.repositories.documents.listChunks(uploaded.id);
    const embeddingCalls = harness.ai.embeddingCalls;
    await harness.api().post(`/api/v1/documents/${uploaded.id}/reprocess`).set("Authorization", `Bearer ${token}`).expect(202);
    await harness.drainJobs();
    const after = await harness.container.repositories.documents.listChunks(uploaded.id);
    expect(after).toHaveLength(before.length);
    expect(after.map((chunk) => chunk.id)).toEqual(before.map((chunk) => chunk.id));
    expect(harness.ai.embeddingCalls).toBe(embeddingCalls);
    const detail = await harness.api().get(`/api/v1/documents/${uploaded.id}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(detail.body.data.status).toBe("ready");
  });

  it("fails safely when declared text content is actually binary", async () => {
    const uploaded = await uploadDocument(harness, token, workspaceId, { title: "Fake text", filename: "fake.txt", mimeType: "text/plain", body: PNG_HEADER });
    const row = await harness.container.repositories.documents.getById(uploaded.id);
    expect(row?.status).toBe("failed");
    expect(row?.extraction_error_code).toContain("DOCUMENT_PROCESSING_FAILED");
    expect(row?.extraction_error_code).toContain("MIME_MISMATCH");
  });

  it("extracts CSV and XLSX rows with sheet/row locators", async () => {
    const csv = Buffer.from("question,subject,marks\nQ1,s1,2\nQ2,s1,5\n", "utf8");
    const csvDoc = await uploadDocument(harness, token, workspaceId, { title: "Marks", filename: "marks.csv", mimeType: "text/csv", body: csv, kind: "itemized_marks" });
    const csvChunks = await harness.container.repositories.documents.listChunks(csvDoc.id);
    expect(csvChunks).toHaveLength(2);
    expect(csvChunks[0]?.locator).toMatchObject({ sheet: "Sheet1", row: 2 });
    expect(csvChunks[0]?.content).toContain("question: Q1");

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["skill", "frequency", "sector"], ["Python", 40, "data"], ["SQL", 30, "data"]]), "Jobs");
    const xlsx = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const xlsxDoc = await uploadDocument(harness, token, workspaceId, { title: "Jobs", filename: "jobs.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: xlsx, kind: "job_dataset" });
    const xlsxChunks = await harness.container.repositories.documents.listChunks(xlsxDoc.id);
    expect(xlsxChunks).toHaveLength(2);
    expect(xlsxChunks[1]?.locator).toMatchObject({ sheet: "Jobs", row: 3 });
  });

  it("routes images to OCR and audio to transcription via the AI provider", async () => {
    const image = await uploadDocument(harness, token, workspaceId, { title: "Certificate", filename: "cert.png", mimeType: "image/png", body: PNG_HEADER, kind: "certificate", purpose: "student_evidence" });
    const imageRow = await harness.container.repositories.documents.getById(image.id);
    expect(imageRow?.status).toBe("ready");
    const extraction = await harness.container.repositories.documents.getLatestExtraction(image.id);
    expect(extraction?.extractor).toBe("ai-ocr");

    const audioBody = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(64, 1)]);
    const audio = await uploadDocument(harness, token, workspaceId, { title: "Audio note", filename: "note.mp3", mimeType: "audio/mpeg", body: audioBody, kind: "teacher_note", purpose: "audio_note" });
    const audioChunks = await harness.container.repositories.documents.listChunks(audio.id);
    expect(audioChunks.length).toBeGreaterThan(0);
    expect(audioChunks[0]?.locator).toMatchObject({ timestampSeconds: 0 });
  });

  it("deletes documents and hides them from listings", async () => {
    const uploaded = await uploadDocument(harness, token, workspaceId, { title: "Temp", filename: "temp.txt", mimeType: "text/plain", body: Buffer.from("temporary content") });
    await harness.api().delete(`/api/v1/documents/${uploaded.id}`).set("Authorization", `Bearer ${token}`).expect(204);
    await harness.api().get(`/api/v1/documents/${uploaded.id}`).set("Authorization", `Bearer ${token}`).expect(404);
    const list = await harness.api().get(`/api/v1/documents?workspaceId=${workspaceId}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(list.body.data.some((document: { id: string }) => document.id === uploaded.id)).toBe(false);
    expect(typeof list.body.meta.total).toBe("number");
  });
});
