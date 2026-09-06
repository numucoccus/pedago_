import type { DocumentChunkRow, TableInsert, TableName, TableRow } from "@pedago/shared/database";

export type FilterOp = "eq" | "neq" | "in" | "is" | "gte" | "lte" | "gt" | "lt" | "ilike";

export interface Filter {
  column: string;
  op: FilterOp;
  value: unknown;
}

export interface OrderBy {
  column: string;
  ascending?: boolean;
}

export interface Query {
  filters?: Filter[];
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
}

export interface MatchChunksArgs {
  workspaceId: string;
  embedding: number[];
  matchCount: number;
  documentIds?: string[] | null;
}

export type MatchedChunk = DocumentChunkRow & { similarity: number };

/**
 * Persistence port. Repositories depend on this interface only, so the same domain code runs
 * against Supabase in production and the in-memory store in tests.
 */
export interface DataStore {
  findMany<T extends TableName>(table: T, query?: Query): Promise<TableRow<T>[]>;
  findOne<T extends TableName>(table: T, query?: Query): Promise<TableRow<T> | null>;
  count<T extends TableName>(table: T, filters?: Filter[]): Promise<number>;
  insert<T extends TableName>(table: T, values: TableInsert<T>): Promise<TableRow<T>>;
  insertMany<T extends TableName>(table: T, values: TableInsert<T>[]): Promise<TableRow<T>[]>;
  update<T extends TableName>(table: T, filters: Filter[], patch: Partial<TableRow<T>>): Promise<TableRow<T>[]>;
  delete<T extends TableName>(table: T, filters: Filter[]): Promise<number>;
  matchDocumentChunks(args: MatchChunksArgs): Promise<MatchedChunk[]>;
  keywordSearchChunks(workspaceId: string, terms: string[], limit: number, documentIds?: string[] | null): Promise<DocumentChunkRow[]>;
}

export const eq = (column: string, value: unknown): Filter => ({ column, op: "eq", value });
export const neq = (column: string, value: unknown): Filter => ({ column, op: "neq", value });
export const inList = (column: string, value: unknown[]): Filter => ({ column, op: "in", value });
export const isNull = (column: string): Filter => ({ column, op: "is", value: null });
export const gte = (column: string, value: unknown): Filter => ({ column, op: "gte", value });
export const lte = (column: string, value: unknown): Filter => ({ column, op: "lte", value });

/** Unique constraints emulated by the in-memory store; Postgres enforces the same set. */
export const UNIQUE_CONSTRAINTS: Partial<Record<TableName, string[][]>> = {
  organizations: [["slug"]],
  organization_members: [["organization_id", "user_id"]],
  workspaces: [["organization_id", "slug"]],
  workspace_members: [["workspace_id", "user_id"]],
  analyses: [["workspace_id", "created_by", "idempotency_key"]],
  analysis_documents: [["analysis_id", "document_id"]],
  finding_evidence: [["finding_id", "evidence_item_id"]],
  document_chunks: [["document_id", "extraction_id", "chunk_index"]],
  artifact_versions: [["artifact_id", "version"]],
  research_works: [["normalized_key"]],
  analysis_research_works: [["analysis_id", "research_work_id"]],
  query_cluster_members: [["cluster_id", "query_message_id"]],
  students: [["workspace_id", "external_student_id"]],
  idempotency_keys: [["workspace_id", "user_id", "scope", "key"]],
  industry_sources: [["key"]],
};
