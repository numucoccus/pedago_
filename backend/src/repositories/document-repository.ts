import type {
  DocumentChunkRow,
  DocumentExtractionRow,
  DocumentRow,
  TableInsert,
} from "@pedago/shared/database";
import { eq, inList, neq, type DataStore, type Filter } from "./data-store.js";

export class DocumentRepository {
  constructor(private readonly store: DataStore) {}

  create(values: TableInsert<"documents">): Promise<DocumentRow> {
    return this.store.insert("documents", values);
  }

  getById(id: string): Promise<DocumentRow | null> {
    return this.store.findOne("documents", { filters: [eq("id", id)] });
  }

  async getManyByIds(ids: string[]): Promise<DocumentRow[]> {
    if (ids.length === 0) return [];
    return this.store.findMany("documents", { filters: [inList("id", ids)] });
  }

  list(workspaceId: string, options: { limit: number; offset: number; kind?: string; status?: string; courseId?: string }): Promise<DocumentRow[]> {
    const filters: Filter[] = [eq("workspace_id", workspaceId), neq("status", "deleted")];
    if (options.kind) filters.push(eq("kind", options.kind));
    if (options.status) filters.push(eq("status", options.status));
    if (options.courseId) filters.push(eq("course_id", options.courseId));
    return this.store.findMany("documents", {
      filters,
      orderBy: [{ column: "created_at", ascending: false }],
      limit: options.limit,
      offset: options.offset,
    });
  }

  count(workspaceId: string): Promise<number> {
    return this.store.count("documents", [eq("workspace_id", workspaceId), neq("status", "deleted")]);
  }

  async update(id: string, patch: Partial<DocumentRow>): Promise<DocumentRow | null> {
    const [row] = await this.store.update("documents", [eq("id", id)], patch);
    return row ?? null;
  }

  /** Conditional status transition; returns null when the document was not in `fromStatuses`. */
  async transitionStatus(id: string, fromStatuses: DocumentRow["status"][], patch: Partial<DocumentRow>): Promise<DocumentRow | null> {
    const [row] = await this.store.update("documents", [eq("id", id), inList("status", fromStatuses)], patch);
    return row ?? null;
  }

  findByContentHash(workspaceId: string, contentHash: string): Promise<DocumentRow[]> {
    return this.store.findMany("documents", {
      filters: [eq("workspace_id", workspaceId), eq("content_hash", contentHash), neq("status", "deleted")],
    });
  }

  createExtraction(values: TableInsert<"document_extractions">): Promise<DocumentExtractionRow> {
    return this.store.insert("document_extractions", values);
  }

  async updateExtraction(id: string, patch: Partial<DocumentExtractionRow>): Promise<void> {
    await this.store.update("document_extractions", [eq("id", id)], patch);
  }

  getLatestExtraction(documentId: string): Promise<DocumentExtractionRow | null> {
    return this.store.findOne("document_extractions", {
      filters: [eq("document_id", documentId)],
      orderBy: [{ column: "started_at", ascending: false }],
    });
  }

  listExtractions(documentId: string): Promise<DocumentExtractionRow[]> {
    return this.store.findMany("document_extractions", { filters: [eq("document_id", documentId)] });
  }

  async findCompletedExtraction(documentId: string, extractor: string, extractorVersion: string, contentHash: string): Promise<DocumentExtractionRow | null> {
    const extractions = await this.store.findMany("document_extractions", {
      filters: [eq("document_id", documentId), eq("extractor", extractor), eq("extractor_version", extractorVersion)],
      orderBy: [{ column: "started_at", ascending: false }],
    });
    return (
      extractions.find(
        (extraction) =>
          extraction.completed_at !== null &&
          extraction.error_code === null &&
          (extraction.metadata as { contentHash?: string } | null)?.contentHash === contentHash,
      ) ?? null
    );
  }

  async replaceChunks(documentId: string, chunks: TableInsert<"document_chunks">[]): Promise<DocumentChunkRow[]> {
    await this.store.delete("document_chunks", [eq("document_id", documentId)]);
    return this.store.insertMany("document_chunks", chunks);
  }

  listChunks(documentId: string): Promise<DocumentChunkRow[]> {
    return this.store.findMany("document_chunks", {
      filters: [eq("document_id", documentId)],
      orderBy: [{ column: "chunk_index" }],
    });
  }

  async listChunksForDocuments(workspaceId: string, documentIds: string[]): Promise<DocumentChunkRow[]> {
    if (documentIds.length === 0) return [];
    return this.store.findMany("document_chunks", {
      filters: [eq("workspace_id", workspaceId), inList("document_id", documentIds)],
      orderBy: [{ column: "document_id" }, { column: "chunk_index" }],
    });
  }

  countChunks(documentId: string): Promise<number> {
    return this.store.count("document_chunks", [eq("document_id", documentId)]);
  }

  async deleteChunks(documentId: string): Promise<void> {
    await this.store.delete("document_chunks", [eq("document_id", documentId)]);
  }
}
