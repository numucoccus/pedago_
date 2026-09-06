import type { TableInsert, TableName, TableRow } from "@pedago/shared/database";
import { AppError } from "../utils/errors.js";
import { newId, nowIso } from "../utils/ids.js";
import { cosineSimilarity } from "../utils/vectors.js";
import type { DataStore, Filter, MatchChunksArgs, MatchedChunk, Query } from "./data-store.js";
import { UNIQUE_CONSTRAINTS } from "./data-store.js";

type Row = Record<string, unknown>;

function clone<T>(row: Row): T {
  return structuredClone(row) as unknown as T;
}

const TIMESTAMP_TABLES_WITHOUT_UPDATED_AT = new Set<TableName>([
  "analysis_events",
  "artifact_versions",
  "audit_events",
  "retention_jobs",
  "idempotency_keys",
]);
const TABLES_WITHOUT_ID = new Set<TableName>([
  "analysis_documents",
  "finding_evidence",
  "analysis_research_works",
  "query_cluster_members",
]);

function matches(row: Row, filter: Filter): boolean {
  const value = row[filter.column];
  switch (filter.op) {
    case "eq":
      return value === filter.value;
    case "neq":
      return value !== filter.value;
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value);
    case "is":
      return value === filter.value || (filter.value === null && value === undefined);
    case "gte":
      return value !== null && value !== undefined && (value as number | string) >= (filter.value as number | string);
    case "lte":
      return value !== null && value !== undefined && (value as number | string) <= (filter.value as number | string);
    case "gt":
      return value !== null && value !== undefined && (value as number | string) > (filter.value as number | string);
    case "lt":
      return value !== null && value !== undefined && (value as number | string) < (filter.value as number | string);
    case "ilike": {
      const pattern = String(filter.value).toLowerCase().replace(/%/g, "");
      return typeof value === "string" && value.toLowerCase().includes(pattern);
    }
    default:
      return false;
  }
}

/** In-memory DataStore used by tests and local development without Supabase. */
export class MemoryDataStore implements DataStore {
  private readonly tables = new Map<TableName, Row[]>();

  private rows(table: TableName): Row[] {
    let rows = this.tables.get(table);
    if (!rows) {
      rows = [];
      this.tables.set(table, rows);
    }
    return rows;
  }

  private applyQuery(table: TableName, query: Query = {}): Row[] {
    let rows = this.rows(table).filter((row) => (query.filters ?? []).every((filter) => matches(row, filter)));
    if (query.orderBy && query.orderBy.length > 0) {
      const orderBy = query.orderBy;
      rows = [...rows].sort((a, b) => {
        for (const order of orderBy) {
          const av = a[order.column] as number | string | null;
          const bv = b[order.column] as number | string | null;
          if (av === bv) continue;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          const cmp = av < bv ? -1 : 1;
          return order.ascending === false ? -cmp : cmp;
        }
        return 0;
      });
    }
    const offset = query.offset ?? 0;
    const limit = query.limit ?? rows.length;
    return rows.slice(offset, offset + limit);
  }

  private assertUnique(table: TableName, candidate: Row, ignore?: Row): void {
    const constraints = UNIQUE_CONSTRAINTS[table] ?? [];
    for (const columns of constraints) {
      if (columns.some((column) => candidate[column] === null || candidate[column] === undefined)) continue;
      const duplicate = this.rows(table).find(
        (row) => row !== ignore && columns.every((column) => row[column] === candidate[column]),
      );
      if (duplicate) {
        throw AppError.conflict(`Duplicate value for ${table}(${columns.join(", ")})`, { table, columns });
      }
    }
  }

  async findMany<T extends TableName>(table: T, query?: Query): Promise<TableRow<T>[]> {
    return this.applyQuery(table, query).map((row) => clone<TableRow<T>>(row));
  }

  async findOne<T extends TableName>(table: T, query?: Query): Promise<TableRow<T> | null> {
    const [row] = this.applyQuery(table, { ...query, limit: 1 });
    return row ? (clone<TableRow<T>>(row)) : null;
  }

  async count<T extends TableName>(table: T, filters: Filter[] = []): Promise<number> {
    return this.applyQuery(table, { filters }).length;
  }

  async insert<T extends TableName>(table: T, values: TableInsert<T>): Promise<TableRow<T>> {
    const [row] = await this.insertMany(table, [values]);
    return row!;
  }

  async insertMany<T extends TableName>(table: T, values: TableInsert<T>[]): Promise<TableRow<T>[]> {
    const inserted: Row[] = [];
    for (const value of values) {
      const row: Row = { ...(value as Row) };
      if (!TABLES_WITHOUT_ID.has(table) && !row.id) row.id = newId();
      const now = nowIso();
      if (!TABLES_WITHOUT_ID.has(table) && !row.created_at) row.created_at = now;
      if (!TABLES_WITHOUT_ID.has(table) && !TIMESTAMP_TABLES_WITHOUT_UPDATED_AT.has(table) && !row.updated_at) {
        row.updated_at = now;
      }
      this.assertUnique(table, row);
      for (const pending of inserted) {
        for (const columns of UNIQUE_CONSTRAINTS[table] ?? []) {
          if (columns.every((column) => pending[column] !== undefined && pending[column] === row[column])) {
            throw AppError.conflict(`Duplicate value for ${table}(${columns.join(", ")})`);
          }
        }
      }
      inserted.push(row);
    }
    this.rows(table).push(...inserted);
    return inserted.map((row) => clone<TableRow<T>>(row));
  }

  async update<T extends TableName>(table: T, filters: Filter[], patch: Partial<TableRow<T>>): Promise<TableRow<T>[]> {
    const targets = this.rows(table).filter((row) => filters.every((filter) => matches(row, filter)));
    const updated: Row[] = [];
    for (const target of targets) {
      const next: Row = { ...target, ...(patch as Row) };
      if (!TIMESTAMP_TABLES_WITHOUT_UPDATED_AT.has(table) && !TABLES_WITHOUT_ID.has(table)) next.updated_at = nowIso();
      this.assertUnique(table, next, target);
      Object.assign(target, next);
      updated.push(target);
    }
    return updated.map((row) => clone<TableRow<T>>(row));
  }

  async delete<T extends TableName>(table: T, filters: Filter[]): Promise<number> {
    const rows = this.rows(table);
    const before = rows.length;
    const remaining = rows.filter((row) => !filters.every((filter) => matches(row, filter)));
    this.tables.set(table, remaining);
    return before - remaining.length;
  }

  async matchDocumentChunks(args: MatchChunksArgs): Promise<MatchedChunk[]> {
    const chunks = this.rows("document_chunks").filter(
      (row) =>
        row.workspace_id === args.workspaceId &&
        Array.isArray(row.embedding) &&
        (!args.documentIds || args.documentIds.includes(row.document_id as string)),
    );
    return chunks
      .map((row) => ({
        ...(clone<MatchedChunk>(row)),
        similarity: cosineSimilarity(row.embedding as number[], args.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity || a.chunk_index - b.chunk_index)
      .slice(0, args.matchCount);
  }

  async keywordSearchChunks(
    workspaceId: string,
    terms: string[],
    limit: number,
    documentIds?: string[] | null,
  ): Promise<MatchedChunk[]> {
    const lowered = terms.map((term) => term.toLowerCase()).filter(Boolean);
    if (lowered.length === 0) return [];
    return this.rows("document_chunks")
      .filter((row) => row.workspace_id === workspaceId && (!documentIds || documentIds.includes(row.document_id as string)))
      .map((row) => {
        const content = String(row.content).toLowerCase();
        const hits = lowered.filter((term) => content.includes(term)).length;
        return { row, hits };
      })
      .filter(({ hits }) => hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map(({ row, hits }) => ({ ...(clone<MatchedChunk>(row)), similarity: hits / lowered.length }));
  }

  /** Test helper: wipe everything. */
  reset(): void {
    this.tables.clear();
  }
}
