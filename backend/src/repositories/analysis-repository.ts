import type { AnalysisStatus } from "@pedago/shared";
import type {
  AnalysisDocumentRow,
  AnalysisEventRow,
  AnalysisResearchWorkRow,
  AnalysisRow,
  ArtifactRow,
  ArtifactVersionRow,
  EvidenceItemRow,
  FindingEvidenceRow,
  FindingRow,
  TableInsert,
  TableName,
} from "@pedago/shared/database";
import { eq, inList, type DataStore, type Filter } from "./data-store.js";

/** Domain tables whose rows are derived from a single analysis run and replaced on retry. */
const ANALYSIS_DERIVED_TABLES: TableName[] = [
  "research_trend_points",
  "research_decision_options",
  "research_queries",
  "query_clusters",
  "misconception_clusters",
  "curriculum_skill_mappings",
  "curriculum_recommendations",
  "student_scores",
  "student_risk_signals",
  "feedback_entries",
  "query_messages",
  "exams",
  "lor_requests",
];

export class AnalysisRepository {
  constructor(private readonly store: DataStore) {}

  create(values: TableInsert<"analyses">): Promise<AnalysisRow> {
    return this.store.insert("analyses", values);
  }

  getById(id: string): Promise<AnalysisRow | null> {
    return this.store.findOne("analyses", { filters: [eq("id", id)] });
  }

  findByIdempotencyKey(workspaceId: string, userId: string, key: string): Promise<AnalysisRow | null> {
    return this.store.findOne("analyses", {
      filters: [eq("workspace_id", workspaceId), eq("created_by", userId), eq("idempotency_key", key)],
    });
  }

  list(workspaceId: string, options: { limit: number; offset: number; type?: string; status?: string }): Promise<AnalysisRow[]> {
    const filters: Filter[] = [eq("workspace_id", workspaceId)];
    if (options.type) filters.push(eq("type", options.type));
    if (options.status) filters.push(eq("status", options.status));
    return this.store.findMany("analyses", {
      filters,
      orderBy: [{ column: "created_at", ascending: false }],
      limit: options.limit,
      offset: options.offset,
    });
  }

  count(workspaceId: string): Promise<number> {
    return this.store.count("analyses", [eq("workspace_id", workspaceId)]);
  }

  async update(id: string, patch: Partial<AnalysisRow>): Promise<AnalysisRow | null> {
    const [row] = await this.store.update("analyses", [eq("id", id)], patch);
    return row ?? null;
  }

  /** Atomic conditional transition. Returns null if the analysis is not in one of `from`. */
  async transition(id: string, from: AnalysisStatus[], patch: Partial<AnalysisRow>): Promise<AnalysisRow | null> {
    const [row] = await this.store.update("analyses", [eq("id", id), inList("status", from)], patch);
    return row ?? null;
  }

  async setDocuments(analysisId: string, documentIds: string[], purpose = "input"): Promise<void> {
    await this.store.delete("analysis_documents", [eq("analysis_id", analysisId)]);
    await this.store.insertMany(
      "analysis_documents",
      documentIds.map((documentId) => ({ analysis_id: analysisId, document_id: documentId, purpose })),
    );
  }

  listDocuments(analysisId: string): Promise<AnalysisDocumentRow[]> {
    return this.store.findMany("analysis_documents", { filters: [eq("analysis_id", analysisId)] });
  }

  async listDocumentsForAnalyses(analysisIds: string[]): Promise<AnalysisDocumentRow[]> {
    if (analysisIds.length === 0) return [];
    return this.store.findMany("analysis_documents", { filters: [inList("analysis_id", analysisIds)] });
  }

  addEvent(values: TableInsert<"analysis_events">): Promise<AnalysisEventRow> {
    return this.store.insert("analysis_events", values);
  }

  listEvents(analysisId: string): Promise<AnalysisEventRow[]> {
    return this.store.findMany("analysis_events", {
      filters: [eq("analysis_id", analysisId)],
      orderBy: [{ column: "created_at" }],
    });
  }

  listFindings(analysisId: string): Promise<FindingRow[]> {
    return this.store.findMany("findings", { filters: [eq("analysis_id", analysisId)], orderBy: [{ column: "sort_order" }] });
  }

  listEvidence(analysisId: string): Promise<EvidenceItemRow[]> {
    return this.store.findMany("evidence_items", { filters: [eq("analysis_id", analysisId)], orderBy: [{ column: "created_at" }] });
  }

  async listFindingEvidence(findingIds: string[]): Promise<FindingEvidenceRow[]> {
    if (findingIds.length === 0) return [];
    return this.store.findMany("finding_evidence", { filters: [inList("finding_id", findingIds)] });
  }

  insertEvidence(values: TableInsert<"evidence_items">[]): Promise<EvidenceItemRow[]> {
    return this.store.insertMany("evidence_items", values);
  }

  insertFindings(values: TableInsert<"findings">[]): Promise<FindingRow[]> {
    return this.store.insertMany("findings", values);
  }

  insertFindingEvidence(values: FindingEvidenceRow[]): Promise<FindingEvidenceRow[]> {
    return this.store.insertMany("finding_evidence", values);
  }

  insertArtifacts(values: TableInsert<"artifacts">[]): Promise<ArtifactRow[]> {
    return this.store.insertMany("artifacts", values);
  }

  /**
   * Removes every derived row of a previous attempt so retries never duplicate findings, evidence,
   * artifacts, or domain records. Approved artifacts are preserved because they carry faculty edits.
   */
  async clearDerivedResults(analysisId: string): Promise<void> {
    const findings = await this.listFindings(analysisId);
    if (findings.length > 0) {
      await this.store.delete("finding_evidence", [inList("finding_id", findings.map((finding) => finding.id))]);
    }
    await this.store.delete("findings", [eq("analysis_id", analysisId)]);
    await this.store.delete("evidence_items", [eq("analysis_id", analysisId)]);
    await this.store.delete("analysis_research_works", [eq("analysis_id", analysisId)]);
    const artifacts = await this.listArtifacts(analysisId);
    const replaceable = artifacts.filter((artifact) => artifact.status === "draft");
    if (replaceable.length > 0) {
      await this.store.delete("artifact_versions", [inList("artifact_id", replaceable.map((a) => a.id))]);
      await this.store.delete("artifacts", [inList("id", replaceable.map((a) => a.id))]);
    }
    for (const table of ANALYSIS_DERIVED_TABLES) {
      if (table === "exams") await this.cascadeExams(analysisId);
      if (table === "query_clusters") await this.cascadeQueryClusters(analysisId);
      await this.store.delete(table, [eq("analysis_id", analysisId)]);
    }
  }

  private async cascadeExams(analysisId: string): Promise<void> {
    const exams = await this.store.findMany("exams", { filters: [eq("analysis_id", analysisId)] });
    if (exams.length === 0) return;
    const questions = await this.store.findMany("exam_questions", { filters: [inList("exam_id", exams.map((e) => e.id))] });
    if (questions.length > 0) {
      await this.store.delete("student_responses", [inList("exam_question_id", questions.map((q) => q.id))]);
      await this.store.delete("exam_questions", [inList("exam_id", exams.map((e) => e.id))]);
    }
  }

  private async cascadeQueryClusters(analysisId: string): Promise<void> {
    const clusters = await this.store.findMany("query_clusters", { filters: [eq("analysis_id", analysisId)] });
    if (clusters.length > 0) {
      await this.store.delete("query_cluster_members", [inList("cluster_id", clusters.map((c) => c.id))]);
    }
  }

  listArtifacts(analysisId: string): Promise<ArtifactRow[]> {
    return this.store.findMany("artifacts", { filters: [eq("analysis_id", analysisId)], orderBy: [{ column: "created_at" }] });
  }

  getArtifact(id: string): Promise<ArtifactRow | null> {
    return this.store.findOne("artifacts", { filters: [eq("id", id)] });
  }

  async updateArtifact(id: string, patch: Partial<ArtifactRow>): Promise<ArtifactRow | null> {
    const [row] = await this.store.update("artifacts", [eq("id", id)], patch);
    return row ?? null;
  }

  addArtifactVersion(values: TableInsert<"artifact_versions">): Promise<ArtifactVersionRow> {
    return this.store.insert("artifact_versions", values);
  }

  listArtifactVersions(artifactId: string): Promise<ArtifactVersionRow[]> {
    return this.store.findMany("artifact_versions", { filters: [eq("artifact_id", artifactId)], orderBy: [{ column: "version" }] });
  }

  linkResearchWorks(values: AnalysisResearchWorkRow[]): Promise<AnalysisResearchWorkRow[]> {
    return this.store.insertMany("analysis_research_works", values);
  }
}
