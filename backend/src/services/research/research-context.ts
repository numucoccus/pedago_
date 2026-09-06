import type { ResearchWork } from "@pedago/shared";
import type { Json, ResearchWorkRow } from "@pedago/shared/database";
import { researchWorkKey, type AggregatedResearch } from "../../providers/research/research-aggregator.js";
import { keywordOverlap, tokenize, truncate } from "../../utils/text.js";
import { cosineSimilarity } from "../../utils/vectors.js";
import type { AnalysisContext, EvidenceCandidate } from "../analysis/types.js";
import { evidenceKey } from "../analysis/types.js";

export interface RankedWork {
  work: ResearchWork;
  row: ResearchWorkRow;
  relevance: number;
  key: string;
}

export interface ResearchContextResult {
  ranked: RankedWork[];
  evidence: EvidenceCandidate[];
  aggregated: AggregatedResearch;
  coverageSummary: string;
  limitations: string[];
}

/** Builds transparent search queries from structured inputs (no hidden query rewriting). */
export function buildSearchQueries(parts: { topic: string; method?: string; problem?: string; populationContext?: string; extra?: string[] }): string[] {
  const queries = new Set<string>();
  queries.add(parts.topic.trim());
  if (parts.method) queries.add(`${parts.topic} ${parts.method}`.trim());
  if (parts.problem) queries.add(`${parts.topic} ${parts.problem}`.trim());
  if (parts.populationContext) queries.add(`${parts.topic} ${parts.populationContext}`.trim());
  for (const extra of parts.extra ?? []) queries.add(extra.trim());
  return [...queries].filter(Boolean).slice(0, 4);
}

/**
 * Retrieves, deduplicates, persists, and semantically ranks external works, turning them into
 * evidence candidates. Coverage gaps are recorded as limitations rather than hidden.
 */
export async function collectResearchContext<TInput>(
  context: AnalysisContext<TInput>,
  queries: string[],
  options: { sources?: string[]; yearFrom?: number; yearTo?: number; limitPerSource: number; rankAgainst: string; maxEvidence: number; startIndex?: number },
): Promise<ResearchContextResult> {
  const aggregated = await context.deps.researchSources.search(queries, {
    sources: options.sources,
    yearFrom: options.yearFrom,
    yearTo: options.yearTo,
    limitPerSource: options.limitPerSource,
    signal: context.signal,
  });
  const limitations: string[] = [];
  const failed = aggregated.coverage.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    const sources = [...new Set(failed.map((entry) => entry.source))];
    limitations.push(`Source coverage incomplete: ${sources.join(", ")} failed (${[...new Set(failed.map((f) => f.errorCode))].join(", ")}).`);
  }
  if (aggregated.works.length === 0) {
    limitations.push("No external works were retrieved; novelty claims cannot be verified from this search.");
  }

  const [queryEmbedding, ...workEmbeddings] =
    aggregated.works.length > 0
      ? await context.deps.ai.createEmbeddings([options.rankAgainst, ...aggregated.works.map((work) => `${work.title}. ${work.abstract ?? ""}`.slice(0, 2000))])
      : [];

  const ranked: RankedWork[] = [];
  for (const [index, work] of aggregated.works.entries()) {
    const semantic = queryEmbedding && workEmbeddings[index] ? cosineSimilarity(queryEmbedding, workEmbeddings[index]!) : 0;
    const lexical = keywordOverlap(options.rankAgainst, `${work.title} ${work.abstract ?? ""}`);
    const relevance = Math.round((0.7 * Math.max(0, semantic) + 0.3 * lexical) * 1000) / 1000;
    const row = await context.deps.research.upsertWork({
      normalized_key: researchWorkKey(work),
      source: work.source,
      external_id: work.externalId,
      doi: work.doi ?? null,
      title: work.title,
      abstract: work.abstract ? truncate(work.abstract, 4000) : null,
      authors: work.authors as unknown as Json,
      publication_year: work.publicationYear ?? null,
      venue: work.venue ?? null,
      citation_count: work.citationCount ?? null,
      source_url: work.url,
      retrieved_at: work.retrievedAt,
      metadata: {} as Json,
    });
    ranked.push({ work, row, relevance, key: "" });
  }
  ranked.sort((a, b) => b.relevance - a.relevance || (b.work.citationCount ?? 0) - (a.work.citationCount ?? 0));
  const start = options.startIndex ?? 0;
  const top = ranked.slice(0, options.maxEvidence);
  top.forEach((item, index) => {
    item.key = evidenceKey(start + index);
  });
  const evidence: EvidenceCandidate[] = top.map((item) => ({
    key: item.key,
    sourceType: "research_work",
    researchWorkId: item.row.id,
    externalSourceUrl: item.work.url,
    title: item.work.title,
    locator: { url: item.work.url, doi: item.work.doi ?? undefined, source: item.work.source },
    excerpt: item.work.abstract ? truncate(item.work.abstract, 900) : `${item.work.title} — ${item.work.authors.slice(0, 3).join(", ")}${item.work.venue ? ` (${item.work.venue})` : ""}. No abstract available.`,
    publishedYear: item.work.publicationYear,
    metadata: { relevance: item.relevance, citationCount: item.work.citationCount ?? null, authors: item.work.authors.slice(0, 6) },
  }));

  const coverageSummary = aggregated.coverage
    .map((entry) => `${entry.source}: ${entry.ok ? `${entry.returned} results` : `FAILED (${entry.errorCode})`} for "${entry.query}"`)
    .join("; ");
  return { ranked: top, evidence, aggregated, coverageSummary, limitations };
}

export function keywordTerms(text: string, limit = 12): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([token]) => token);
}
