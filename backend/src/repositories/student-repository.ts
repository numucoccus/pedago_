import type {
  AchievementRow,
  ScoringModelRow,
  StudentActivityMetricRow,
  StudentRiskSignalRow,
  StudentRow,
  StudentScoreRow,
  TableInsert,
} from "@pedago/shared/database";
import { eq, isNull, type DataStore, type Filter } from "./data-store.js";

export class StudentRepository {
  constructor(private readonly store: DataStore) {}

  create(values: TableInsert<"students">): Promise<StudentRow> {
    return this.store.insert("students", values);
  }

  getById(id: string): Promise<StudentRow | null> {
    return this.store.findOne("students", { filters: [eq("id", id), isNull("deleted_at")] });
  }

  list(workspaceId: string, options: { limit: number; offset: number; cohort?: string; program?: string }): Promise<StudentRow[]> {
    const filters: Filter[] = [eq("workspace_id", workspaceId), isNull("deleted_at")];
    if (options.cohort) filters.push(eq("cohort", options.cohort));
    if (options.program) filters.push(eq("program", options.program));
    return this.store.findMany("students", {
      filters,
      orderBy: [{ column: "display_name" }],
      limit: options.limit,
      offset: options.offset,
    });
  }

  count(workspaceId: string): Promise<number> {
    return this.store.count("students", [eq("workspace_id", workspaceId), isNull("deleted_at")]);
  }

  async update(id: string, patch: Partial<StudentRow>): Promise<StudentRow | null> {
    const [row] = await this.store.update("students", [eq("id", id)], patch);
    return row ?? null;
  }

  listAchievements(studentId: string): Promise<AchievementRow[]> {
    return this.store.findMany("achievements", {
      filters: [eq("student_id", studentId)],
      orderBy: [{ column: "achievement_date", ascending: false }, { column: "created_at" }],
    });
  }

  getAchievement(id: string): Promise<AchievementRow | null> {
    return this.store.findOne("achievements", { filters: [eq("id", id)] });
  }

  createAchievement(values: TableInsert<"achievements">): Promise<AchievementRow> {
    return this.store.insert("achievements", values);
  }

  async updateAchievement(id: string, patch: Partial<AchievementRow>): Promise<AchievementRow | null> {
    const [row] = await this.store.update("achievements", [eq("id", id)], patch);
    return row ?? null;
  }

  listActivityMetrics(studentId: string): Promise<StudentActivityMetricRow[]> {
    return this.store.findMany("student_activity_metrics", {
      filters: [eq("student_id", studentId)],
      orderBy: [{ column: "period_start" }],
    });
  }

  getActiveScoringModel(workspaceId: string): Promise<ScoringModelRow | null> {
    return this.store.findOne("scoring_models", {
      filters: [eq("workspace_id", workspaceId), eq("is_active", true)],
      orderBy: [{ column: "version", ascending: false }],
    });
  }

  insertScore(values: TableInsert<"student_scores">): Promise<StudentScoreRow> {
    return this.store.insert("student_scores", values);
  }

  insertRiskSignals(values: TableInsert<"student_risk_signals">[]): Promise<StudentRiskSignalRow[]> {
    return this.store.insertMany("student_risk_signals", values);
  }

  listScores(studentId: string): Promise<StudentScoreRow[]> {
    return this.store.findMany("student_scores", {
      filters: [eq("student_id", studentId)],
      orderBy: [{ column: "calculated_at", ascending: false }],
    });
  }

  insertLorRequest(values: TableInsert<"lor_requests">): Promise<void> {
    return this.store.insert("lor_requests", values).then(() => undefined);
  }
}
