import { queryClusteringInputSchema, type QueryClusteringInput } from "@pedago/shared";
import { z } from "zod";
import { queryClusterLabelPrompt } from "../../prompts/index.js";
import { redactIdentifiers } from "../../utils/redaction.js";
import { round, truncate } from "../../utils/text.js";
import { agglomerativeCluster, cosineSimilarity } from "../../utils/vectors.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, EvidenceCandidate, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";
import { matchTopic } from "./teaching-pulse-handler.js";

const intentKinds = ["conceptual", "administrative", "logistical", "other"] as const;

const buildOutputSchema = (clusterCount: number) => z.object({
  clusters: z
    .array(
      z.object({
        clusterIndex: z.number().int().min(0).max(Math.max(0, clusterCount - 1)),
        label: z.string().min(1).max(120),
        description: z.string().min(1).max(800),
        intentKind: z.enum(intentKinds),
        syllabusTopic: z.string().max(160).nullable(),
        evidenceKeys: z.array(z.string()).min(1).max(8),
      }),
    )
    .min(1),
  broadcastDraft: z.string().min(1).max(8000),
  ...aiFindingsBlock,
});

export interface QueryCluster {
  index: number;
  label: string;
  description: string;
  intentKind: (typeof intentKinds)[number];
  syllabusTopic: string | null;
  messageCount: number;
  share: number;
  cohesion: number;
  representativeKeys: string[];
  representativeMessages: string[];
}

export interface QueryClusteringOutput {
  clusters: QueryCluster[];
  totalMessages: number;
  conceptualShare: number;
  administrativeShare: number;
  clusteringParameters: Record<string, unknown>;
}

interface Message {
  key: string;
  externalId: string | null;
  content: string;
  occurredAt: string | null;
  embedding: number[];
}

interface Extra {
  messages: Message[];
  clusters: { members: number[]; centroid: number[]; representatives: number[]; cohesion: number }[];
}

const ADMIN_TERMS = ["deadline", "extension", "submit", "submission", "grade", "marks", "attendance", "exam date", "schedule", "room", "zoom", "link", "syllabus copy", "slides", "recording", "office hours", "makeup", "late"];

/** Deterministic administrative-intent heuristic used to seed and sanity-check model labels. */
export function heuristicIntent(text: string): "conceptual" | "administrative" {
  const lowered = text.toLowerCase();
  return ADMIN_TERMS.some((term) => lowered.includes(term)) ? "administrative" : "conceptual";
}

export class QueryClusteringHandler implements AnalysisHandler<QueryClusteringInput, HandlerResult<QueryClusteringOutput>, Extra> {
  readonly type = "query_clustering" as const;
  readonly promptVersion = queryClusterLabelPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): QueryClusteringInput {
    return queryClusteringInputSchema.parse(input);
  }

  async collectContext(context: AnalysisContext<QueryClusteringInput>): Promise<CollectedContext<QueryClusteringInput, Extra>> {
    const { input } = context;
    const raw: { externalId: string | null; content: string; occurredAt: string | null }[] = input.messages.map((message) => ({ externalId: message.externalId ?? null, content: message.content, occurredAt: message.occurredAt ?? null }));
    // Query exports uploaded as documents contribute one message per chunk/row.
    const exports = context.documents.filter((document) => document.kind === "query_export");
    if (exports.length > 0) {
      const chunks = await context.deps.documents.listChunksForDocuments(context.workspace.id, exports.map((document) => document.id));
      for (const chunk of chunks) raw.push({ externalId: `${chunk.document_id}:${chunk.chunk_index}`, content: chunk.content, occurredAt: null });
    }
    if (raw.length === 0) {
      return { ...context, evidence: [], extra: { messages: [], clusters: [] }, limitations: ["No student messages were supplied."], retrieval: {}, externalSources: {} };
    }
    await context.reportProgress("indexing", 35, `Anonymising and embedding ${raw.length} messages`);
    const anonymised = raw.map((message) => ({ ...message, content: redactIdentifiers(message.content).text }));
    const embeddings = await context.deps.ai.createEmbeddings(anonymised.map((message) => message.content));
    const messages: Message[] = anonymised.map((message, index) => ({ key: evidenceKey(index), externalId: message.externalId, content: message.content, occurredAt: message.occurredAt, embedding: embeddings[index]! }));

    const targetClusterCount = input.targetClusterCount ?? Math.max(2, Math.min(12, Math.round(Math.sqrt(messages.length / 2))));
    const result = agglomerativeCluster(messages.map((message) => message.embedding), { similarityThreshold: 0.55, targetClusterCount: Math.min(targetClusterCount, messages.length), maxClusters: Math.min(20, messages.length) });
    const clusters = result.clusters.map((cluster) => {
      const ranked = [...cluster.members].sort((a, b) => cosineSimilarity(messages[b]!.embedding, cluster.centroid) - cosineSimilarity(messages[a]!.embedding, cluster.centroid));
      const cohesion = cluster.members.length > 1 ? round(cluster.members.reduce((sum, member) => sum + cosineSimilarity(messages[member]!.embedding, cluster.centroid), 0) / cluster.members.length, 3) : 1;
      return { members: cluster.members, centroid: cluster.centroid, representatives: ranked.slice(0, 3), cohesion };
    });
    // Evidence = representative messages only (keeps prompts bounded) plus a metric summary.
    const evidence: EvidenceCandidate[] = [];
    for (const [clusterIndex, cluster] of clusters.entries()) {
      for (const member of cluster.representatives) {
        const message = messages[member]!;
        evidence.push({ key: message.key, sourceType: "calculated_metric", title: `Student question (cluster ${clusterIndex})`, locator: { section: "query", index: member + 1, cluster: clusterIndex }, excerpt: truncate(message.content, 500), metadata: { clusterIndex, anonymized: true } });
      }
    }
    evidence.push(metricEvidence(evidenceKey(messages.length), "Cluster size metrics", clusters.map((cluster, index) => `cluster ${index}: ${cluster.members.length} messages (${round((cluster.members.length / messages.length) * 100, 1)}%), cohesion ${cluster.cohesion}`).join("; "), { totalMessages: messages.length }));
    const syllabusEvidence = await collectDocumentEvidence({ ...context, documents: context.documents.filter((document) => document.kind === "syllabus") }, input.syllabusTopics.slice(0, 3), { limit: 4, startIndex: messages.length + 1 });
    evidence.push(...syllabusEvidence.evidence);
    return { ...context, evidence, extra: { messages, clusters }, limitations: messages.length < 10 ? [`Only ${messages.length} messages; clusters may be unstable.`] : [], retrieval: syllabusEvidence.retrieval, externalSources: {} };
  }

  async execute(context: CollectedContext<QueryClusteringInput, Extra>): Promise<HandlerResult<QueryClusteringOutput>> {
    const { extra, input } = context;
    const total = extra.messages.length;
    const emptyOutput: QueryClusteringOutput = { clusters: [], totalMessages: 0, conceptualShare: 0, administrativeShare: 0, clusteringParameters: {} };
    if (total === 0) {
      return { findings: [measuredFinding("No messages to cluster", "No messages were supplied or extracted from query exports.", [], { category: "measured", confidence: "low" })], artifacts: [], output: emptyOutput, confidence: "low", limitations: context.limitations, modelCalls: [], promptVersion: this.promptVersion };
    }
    const clusterText = extra.clusters.map((cluster, index) => `cluster ${index}: size=${cluster.members.length}, cohesion=${cluster.cohesion}, heuristicIntent=${heuristicIntent(cluster.representatives.map((m) => extra.messages[m]!.content).join(" "))}, representatives=[${cluster.representatives.map((m) => extra.messages[m]!.key).join(", ")}]`).join("\n");
    const response = await runPrompt(context, queryClusterLabelPrompt, { clusters: clusterText, syllabusTopics: input.syllabusTopics, evidence: context.evidence }, buildOutputSchema(extra.clusters.length));
    const labelled = new Map(response.data.clusters.map((cluster) => [cluster.clusterIndex, cluster]));
    const metricKey = evidenceKey(total);
    const clusters: QueryCluster[] = extra.clusters.map((cluster, index) => {
      const label = labelled.get(index);
      const representativeKeys = cluster.representatives.map((m) => extra.messages[m]!.key);
      const heuristic = heuristicIntent(cluster.representatives.map((m) => extra.messages[m]!.content).join(" "));
      return {
        index,
        label: label?.label ?? `Cluster ${index + 1}`,
        description: label?.description ?? "Unlabelled cluster",
        intentKind: label?.intentKind ?? heuristic,
        syllabusTopic: label?.syllabusTopic ?? matchTopic(cluster.representatives.map((m) => extra.messages[m]!.content).join(" "), input.syllabusTopics),
        messageCount: cluster.members.length,
        share: round(cluster.members.length / total, 3),
        cohesion: cluster.cohesion,
        representativeKeys,
        representativeMessages: cluster.representatives.map((m) => truncate(extra.messages[m]!.content, 240)),
      };
    });
    const conceptual = clusters.filter((cluster) => cluster.intentKind === "conceptual").reduce((sum, cluster) => sum + cluster.messageCount, 0);
    const administrative = clusters.filter((cluster) => cluster.intentKind === "administrative" || cluster.intentKind === "logistical").reduce((sum, cluster) => sum + cluster.messageCount, 0);
    const output: QueryClusteringOutput = { clusters, totalMessages: total, conceptualShare: round(conceptual / total, 3), administrativeShare: round(administrative / total, 3), clusteringParameters: { algorithm: "agglomerative-average-cosine", similarityThreshold: 0.55, embeddingProvider: context.deps.ai.name } };
    const findings = [
      measuredFinding("Cluster distribution", clusters.map((cluster) => `${cluster.label}: ${cluster.messageCount} (${round(cluster.share * 100, 1)}%)`).join("; "), [metricKey], { category: "measured", metrics: { totalMessages: total, conceptualShare: output.conceptualShare, administrativeShare: output.administrativeShare } }),
      ...clusters.map((cluster) => measuredFinding(`${cluster.intentKind}: ${cluster.label}`, `${cluster.description} (${cluster.messageCount} messages${cluster.syllabusTopic ? `, topic: ${cluster.syllabusTopic}` : ""})`, cluster.representativeKeys, { category: "cluster", confidence: cluster.messageCount >= 3 ? "high" : "medium", metrics: { clusterIndex: cluster.index, cohesion: cluster.cohesion, intentKind: cluster.intentKind } })),
      ...response.data.findings.map((finding) => toFindingDraft(finding, "insight")),
    ];
    return {
      findings,
      artifacts: [{ type: "broadcast", title: "Consolidated response to student questions", content: { clusters: clusters.map((cluster) => ({ index: cluster.index, label: cluster.label, intentKind: cluster.intentKind, messageCount: cluster.messageCount })) }, contentText: response.data.broadcastDraft }],
      output,
      confidence: overallConfidence(findings),
      limitations: response.data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<QueryClusteringOutput>, QueryClusteringInput, Extra>): Promise<void> {
    const { extra, result } = context;
    if (extra.messages.length === 0) return;
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    const intentByMessage = new Map<number, string>();
    for (const cluster of result.output.clusters) for (const member of extra.clusters[cluster.index]!.members) intentByMessage.set(member, cluster.intentKind);
    const messageRows = await context.deps.teaching.insertQueryMessages(
      extra.messages.map((message, index) => ({ ...tenant, course_id: context.input.courseId ?? null, document_id: null, analysis_id: context.analysis.id, external_message_id: message.externalId, anonymized_content: message.content, intent_kind: intentByMessage.get(index) ?? "other", occurred_at: message.occurredAt, embedding: message.embedding })),
    );
    const clusterRows = await context.deps.teaching.insertQueryClusters(
      result.output.clusters.map((cluster) => ({ ...tenant, analysis_id: context.analysis.id, label: cluster.label, description: cluster.description, intent_kind: cluster.intentKind, message_count: cluster.messageCount, course_topic_id: null, centroid: extra.clusters[cluster.index]!.centroid })),
    );
    await context.deps.teaching.insertQueryClusterMembers(
      result.output.clusters.flatMap((cluster, position) =>
        extra.clusters[cluster.index]!.members.map((member) => ({ cluster_id: clusterRows[position]!.id, query_message_id: messageRows[member]!.id, similarity: round(cosineSimilarity(extra.messages[member]!.embedding, extra.clusters[cluster.index]!.centroid), 4) })),
      ),
    );
  }
}
