import type { Json } from "@pedago/shared/database";
import type {
  AuditEventRow,
  IdempotencyKeyRow,
  IndustrySkillObservationRow,
  IndustrySourceRow,
  ResearchWorkRow,
  TableInsert,
} from "@pedago/shared/database";
import { eq, inList, isNull, type DataStore } from "./data-store.js";

export class AuditRepository {
  constructor(private readonly store: DataStore) {}

  record(values: TableInsert<"audit_events">): Promise<AuditEventRow> {
    return this.store.insert("audit_events", values);
  }

  list(workspaceId: string, limit = 100): Promise<AuditEventRow[]> {
    return this.store.findMany("audit_events", {
      filters: [eq("workspace_id", workspaceId)],
      orderBy: [{ column: "created_at", ascending: false }],
      limit,
    });
  }
}

export class IdempotencyRepository {
  constructor(private readonly store: DataStore) {}

  find(workspaceId: string, userId: string, scope: string, key: string): Promise<IdempotencyKeyRow | null> {
    return this.store.findOne("idempotency_keys", {
      filters: [eq("workspace_id", workspaceId), eq("user_id", userId), eq("scope", scope), eq("key", key)],
    });
  }

  save(values: TableInsert<"idempotency_keys">): Promise<IdempotencyKeyRow> {
    return this.store.insert("idempotency_keys", values);
  }
}

export class ResearchRepository {
  constructor(private readonly store: DataStore) {}

  async findByNormalizedKeys(keys: string[]): Promise<ResearchWorkRow[]> {
    if (keys.length === 0) return [];
    return this.store.findMany("research_works", { filters: [inList("normalized_key", keys)] });
  }

  async upsertWork(values: TableInsert<"research_works">): Promise<ResearchWorkRow> {
    const existing = await this.store.findOne("research_works", { filters: [eq("normalized_key", values.normalized_key)] });
    if (existing) {
      const [row] = await this.store.update("research_works", [eq("id", existing.id)], {
        citation_count: values.citation_count ?? existing.citation_count,
        abstract: values.abstract ?? existing.abstract,
        retrieved_at: values.retrieved_at,
        metadata: values.metadata ?? existing.metadata,
      });
      return row ?? existing;
    }
    return this.store.insert("research_works", values);
  }

  recordQuery(values: TableInsert<"research_queries">): Promise<void> {
    return this.store.insert("research_queries", values).then(() => undefined);
  }

  insertTrendPoints(values: TableInsert<"research_trend_points">[]): Promise<void> {
    return this.store.insertMany("research_trend_points", values).then(() => undefined);
  }

  insertDecisionOptions(values: TableInsert<"research_decision_options">[]): Promise<void> {
    return this.store.insertMany("research_decision_options", values).then(() => undefined);
  }
}

export class IndustryRepository {
  constructor(private readonly store: DataStore) {}

  async listSources(workspaceId: string): Promise<IndustrySourceRow[]> {
    const global = await this.store.findMany("industry_sources", { filters: [isNull("workspace_id")] });
    const scoped = await this.store.findMany("industry_sources", { filters: [eq("workspace_id", workspaceId)] });
    return [...global, ...scoped];
  }

  getSourceByKey(key: string): Promise<IndustrySourceRow | null> {
    return this.store.findOne("industry_sources", { filters: [eq("key", key)] });
  }

  async listObservations(workspaceId: string, sourceIds: string[], sector?: string): Promise<IndustrySkillObservationRow[]> {
    if (sourceIds.length === 0) return [];
    const filters = [eq("workspace_id", workspaceId), inList("source_id", sourceIds)];
    if (sector) filters.push(eq("sector", sector));
    return this.store.findMany("industry_skill_observations", { filters });
  }

  insertMappings(values: TableInsert<"curriculum_skill_mappings">[]): Promise<void> {
    return this.store.insertMany("curriculum_skill_mappings", values).then(() => undefined);
  }

  insertRecommendations(values: TableInsert<"curriculum_recommendations">[]): Promise<void> {
    return this.store.insertMany("curriculum_recommendations", values).then(() => undefined);
  }
}

export class TeachingRepository {
  constructor(private readonly store: DataStore) {}

  insertFeedback(values: TableInsert<"feedback_entries">[]): Promise<void> {
    return this.store.insertMany("feedback_entries", values).then(() => undefined);
  }

  insertQueryMessages(values: TableInsert<"query_messages">[]) {
    return this.store.insertMany("query_messages", values);
  }

  insertQueryClusters(values: TableInsert<"query_clusters">[]) {
    return this.store.insertMany("query_clusters", values);
  }

  insertQueryClusterMembers(values: { cluster_id: string; query_message_id: string; similarity: number }[]): Promise<void> {
    return this.store.insertMany("query_cluster_members", values).then(() => undefined);
  }

  insertExam(values: TableInsert<"exams">) {
    return this.store.insert("exams", values);
  }

  insertExamQuestions(values: TableInsert<"exam_questions">[]) {
    return this.store.insertMany("exam_questions", values);
  }

  insertStudentResponses(values: TableInsert<"student_responses">[]): Promise<void> {
    return this.store.insertMany("student_responses", values).then(() => undefined);
  }

  insertMisconceptionClusters(values: TableInsert<"misconception_clusters">[]): Promise<void> {
    return this.store.insertMany("misconception_clusters", values).then(() => undefined);
  }
}

export type { Json };
