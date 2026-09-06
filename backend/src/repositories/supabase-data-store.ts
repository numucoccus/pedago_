import type { DocumentChunkRow, TableInsert, TableName, TableRow } from "@pedago/shared/database";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ServiceSupabaseClient } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import type { DataStore, Filter, MatchChunksArgs, MatchedChunk, Query } from "./data-store.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyBuilder = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function translateError(error: PostgrestError, table: string): AppError {
  if (error.code === "23505") {
    return AppError.conflict(`Duplicate value for ${table}`, { constraint: error.details });
  }
  if (error.code === "23503" || error.code === "23514") {
    return AppError.validation(`Constraint violation on ${table}`, { code: error.code });
  }
  if (error.code === "PGRST301" || error.code === "42501") {
    return AppError.forbidden("Database policy denied the operation");
  }
  return new AppError("INTERNAL_ERROR", `Database operation failed on ${table}`, { cause: error });
}

function applyFilters(builder: AnyBuilder, filters: Filter[] = []): AnyBuilder {
  let query = builder;
  for (const filter of filters) {
    switch (filter.op) {
      case "eq":
        query = query.eq(filter.column, filter.value);
        break;
      case "neq":
        query = query.neq(filter.column, filter.value);
        break;
      case "in":
        query = query.in(filter.column, filter.value as unknown[]);
        break;
      case "is":
        query = query.is(filter.column, filter.value as null);
        break;
      case "gte":
        query = query.gte(filter.column, filter.value);
        break;
      case "lte":
        query = query.lte(filter.column, filter.value);
        break;
      case "gt":
        query = query.gt(filter.column, filter.value);
        break;
      case "lt":
        query = query.lt(filter.column, filter.value);
        break;
      case "ilike":
        query = query.ilike(filter.column, filter.value as string);
        break;
    }
  }
  return query;
}

/** Supabase (PostgREST) implementation of the DataStore port using the service-role client. */
export class SupabaseDataStore implements DataStore {
  constructor(private readonly client: ServiceSupabaseClient) {}

  private from(table: TableName): AnyBuilder {
    return (this.client as unknown as { from(table: string): AnyBuilder }).from(table);
  }

  async findMany<T extends TableName>(table: T, query: Query = {}): Promise<TableRow<T>[]> {
    let builder = applyFilters(this.from(table).select("*"), query.filters);
    for (const order of query.orderBy ?? []) {
      builder = builder.order(order.column, { ascending: order.ascending !== false });
    }
    if (query.limit !== undefined) {
      const offset = query.offset ?? 0;
      builder = builder.range(offset, offset + query.limit - 1);
    }
    const { data, error } = await builder;
    if (error) throw translateError(error, table);
    return (data ?? []) as TableRow<T>[];
  }

  async findOne<T extends TableName>(table: T, query: Query = {}): Promise<TableRow<T> | null> {
    const rows = await this.findMany(table, { ...query, limit: 1 });
    return rows[0] ?? null;
  }

  async count<T extends TableName>(table: T, filters: Filter[] = []): Promise<number> {
    const { count, error } = await applyFilters(this.from(table).select("*", { count: "exact", head: true }), filters);
    if (error) throw translateError(error, table);
    return count ?? 0;
  }

  async insert<T extends TableName>(table: T, values: TableInsert<T>): Promise<TableRow<T>> {
    const [row] = await this.insertMany(table, [values]);
    if (!row) throw new AppError("INTERNAL_ERROR", `Insert into ${table} returned no row`);
    return row;
  }

  async insertMany<T extends TableName>(table: T, values: TableInsert<T>[]): Promise<TableRow<T>[]> {
    if (values.length === 0) return [];
    const { data, error } = await this.from(table).insert(values).select("*");
    if (error) throw translateError(error, table);
    return (data ?? []) as TableRow<T>[];
  }

  async update<T extends TableName>(table: T, filters: Filter[], patch: Partial<TableRow<T>>): Promise<TableRow<T>[]> {
    const { data, error } = await applyFilters(this.from(table).update(patch), filters).select("*");
    if (error) throw translateError(error, table);
    return (data ?? []) as TableRow<T>[];
  }

  async delete<T extends TableName>(table: T, filters: Filter[]): Promise<number> {
    if (filters.length === 0) {
      throw new AppError("INTERNAL_ERROR", "Refusing to delete without filters");
    }
    const { data, error } = await applyFilters(this.from(table).delete(), filters).select("id");
    if (error) throw translateError(error, table);
    return (data ?? []).length;
  }

  async matchDocumentChunks(args: MatchChunksArgs): Promise<MatchedChunk[]> {
    const { data, error } = await (this.client as unknown as { rpc(fn: string, params: unknown): AnyBuilder }).rpc(
      "match_document_chunks",
      {
        p_workspace_id: args.workspaceId,
        p_query_embedding: args.embedding,
        p_match_count: args.matchCount,
        p_document_ids: args.documentIds ?? null,
      },
    );
    if (error) throw translateError(error, "match_document_chunks");
    return ((data ?? []) as MatchedChunk[]).filter((chunk) => chunk.workspace_id === args.workspaceId);
  }

  async keywordSearchChunks(
    workspaceId: string,
    terms: string[],
    limit: number,
    documentIds?: string[] | null,
  ): Promise<DocumentChunkRow[]> {
    const cleaned = terms.map((term) => term.replace(/[%_]/g, "").trim()).filter((term) => term.length > 2);
    if (cleaned.length === 0) return [];
    let builder = this.from("document_chunks").select("*").eq("workspace_id", workspaceId);
    if (documentIds && documentIds.length > 0) builder = builder.in("document_id", documentIds);
    builder = builder.or(cleaned.map((term) => `content.ilike.%${term}%`).join(",")).limit(limit);
    const { data, error } = await builder;
    if (error) throw translateError(error, "document_chunks");
    return (data ?? []) as DocumentChunkRow[];
  }
}
