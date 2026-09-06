import type { DocumentChunkRow, DocumentRow } from "@pedago/shared/database";
import type { ZodType } from "zod";
import type { StructuredAIResponse } from "../../providers/ai/ai-provider.js";
import type { PromptTemplate } from "../../prompts/common.js";
import { truncate } from "../../utils/text.js";
import type { AnalysisContext, CollectedContext, EvidenceCandidate } from "./types.js";
import { evidenceKey } from "./types.js";

export function chunkToEvidence(chunk: DocumentChunkRow, key: string, document: DocumentRow | undefined, metadata: Record<string, unknown> = {}): EvidenceCandidate {
  return {
    key,
    sourceType: "document_chunk",
    documentId: chunk.document_id,
    documentChunkId: chunk.id,
    title: document ? `${document.title} (${document.kind})` : `Document ${chunk.document_id}`,
    locator: { ...(chunk.locator as Record<string, unknown>), chunkIndex: chunk.chunk_index },
    excerpt: truncate(chunk.content, 900),
    metadata: { documentKind: document?.kind ?? null, ...metadata },
  };
}

/**
 * Retrieves document evidence for a set of queries, restricted to the analysis documents and the
 * analysis workspace. Small document sets are included in full so nothing is silently dropped.
 */
export async function collectDocumentEvidence<TInput>(
  context: AnalysisContext<TInput>,
  queries: string[],
  options: { limit?: number; startIndex?: number; fullIfChunksUnder?: number } = {},
): Promise<{ evidence: EvidenceCandidate[]; retrieval: Record<string, unknown> }> {
  const limit = options.limit ?? context.settings.maxEvidence ?? 16;
  const documentIds = context.documents.map((document) => document.id);
  if (documentIds.length === 0) {
    return { evidence: [], retrieval: { documentIds: [], queries, mode: "none" } };
  }
  const documentsById = new Map(context.documents.map((document) => [document.id, document]));
  const allChunks = await context.deps.documents.listChunksForDocuments(context.workspace.id, documentIds);
  let selected: DocumentChunkRow[];
  let mode: string;
  if (allChunks.length <= (options.fullIfChunksUnder ?? limit)) {
    selected = allChunks;
    mode = "full";
  } else {
    const seen = new Map<string, DocumentChunkRow>();
    for (const query of queries) {
      const hits = await context.deps.retrieval.search(context.workspace.id, query, { documentIds, limit });
      for (const hit of hits) if (!seen.has(hit.chunk.id)) seen.set(hit.chunk.id, hit.chunk);
      if (seen.size >= limit) break;
    }
    selected = [...seen.values()].slice(0, limit);
    mode = "hybrid";
  }
  const start = options.startIndex ?? 0;
  const evidence = selected.map((chunk, index) => chunkToEvidence(chunk, evidenceKey(start + index), documentsById.get(chunk.document_id)));
  return {
    evidence,
    retrieval: { documentIds, queries, mode, totalChunks: allChunks.length, selectedChunks: selected.length, limit },
  };
}

export async function runPrompt<TVars, TOutput>(
  context: CollectedContext<unknown, unknown>,
  prompt: PromptTemplate<TVars>,
  vars: TVars,
  schema: ZodType<TOutput>,
  options: { evidenceKeys?: string[]; temperature?: number } = {},
): Promise<StructuredAIResponse<TOutput>> {
  return context.deps.ai.generateStructured({
    promptId: prompt.id,
    promptVersion: prompt.version,
    system: prompt.system,
    user: prompt.render(vars),
    schema,
    allowedEvidenceKeys: options.evidenceKeys ?? context.evidence.map((item) => item.key),
    temperature: options.temperature ?? 0.2,
    signal: context.signal,
    trace: {
      analysisId: context.analysis.id,
      workspaceId: context.workspace.id,
      analysisType: context.analysis.type,
      evidenceCount: context.evidence.length,
    },
  });
}

export function nextKeyIndex(evidence: EvidenceCandidate[]): number {
  return evidence.length;
}
