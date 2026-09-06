import type { DocumentChunkRow } from "@pedago/shared/database";
import type { AIProvider } from "../../providers/ai/ai-provider.js";
import type { DataStore } from "../../repositories/data-store.js";
import { tokenize } from "../../utils/text.js";

export interface RetrievedChunk {
  chunk: DocumentChunkRow;
  score: number;
  vectorRank: number | null;
  keywordRank: number | null;
}

export interface RetrievalOptions {
  documentIds?: string[] | null;
  limit?: number;
  keywordTerms?: string[];
}

/**
 * Hybrid retrieval: workspace-filtered vector similarity fused (reciprocal rank) with keyword hits,
 * which helps identifiers and technical terms. The workspace filter is applied before ranking.
 */
export class RetrievalService {
  constructor(
    private readonly store: DataStore,
    private readonly ai: AIProvider,
  ) {}

  async search(workspaceId: string, query: string, options: RetrievalOptions = {}): Promise<RetrievedChunk[]> {
    const limit = options.limit ?? 12;
    const [embedding] = await this.ai.createEmbeddings([query]);
    const vectorHits = embedding
      ? await this.store.matchDocumentChunks({ workspaceId, embedding, matchCount: limit * 2, documentIds: options.documentIds ?? null })
      : [];
    const terms = options.keywordTerms ?? tokenize(query).slice(0, 8);
    const keywordHits = terms.length > 0 ? await this.store.keywordSearchChunks(workspaceId, terms, limit * 2, options.documentIds ?? null) : [];

    const fused = new Map<string, RetrievedChunk>();
    vectorHits.forEach((hit, index) => {
      fused.set(hit.id, { chunk: hit, score: 1 / (60 + index) + hit.similarity * 0.01, vectorRank: index + 1, keywordRank: null });
    });
    keywordHits.forEach((hit, index) => {
      const existing = fused.get(hit.id);
      const contribution = 1 / (60 + index);
      if (existing) {
        existing.score += contribution;
        existing.keywordRank = index + 1;
      } else {
        fused.set(hit.id, { chunk: hit, score: contribution, vectorRank: null, keywordRank: index + 1 });
      }
    });
    return [...fused.values()]
      .filter((item) => item.chunk.workspace_id === workspaceId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
