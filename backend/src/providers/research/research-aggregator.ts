import type { ResearchSourceCatalogEntry, ResearchWork } from "@pedago/shared";
import type { AppLogger } from "../../config/logger.js";
import { isAppError } from "../../utils/errors.js";
import { normalizeDoi, normalizeTitle } from "../../utils/text.js";
import type { ResearchSearchParams, ResearchSourceAdapter } from "./research-source.js";

export interface SourceCoverage {
  source: string;
  query: string;
  requested: number;
  returned: number;
  ok: boolean;
  errorCode: string | null;
  latencyMs: number;
}

export interface AggregatedResearch {
  works: ResearchWork[];
  coverage: SourceCoverage[];
  queries: string[];
  yearFrom?: number;
  yearTo?: number;
  retrievedAt: string;
  duplicatesRemoved: number;
}

export function researchWorkKey(work: Pick<ResearchWork, "doi" | "title" | "publicationYear">): string {
  const doi = normalizeDoi(work.doi);
  if (doi) return `doi:${doi}`;
  return `title:${normalizeTitle(work.title)}|${work.publicationYear ?? "unknown"}`;
}

/** Deduplicates by DOI first, then by normalized title and year, keeping the richest record. */
export function deduplicateWorks(works: ResearchWork[]): { works: ResearchWork[]; removed: number } {
  const byKey = new Map<string, ResearchWork>();
  const titleIndex = new Map<string, string>();
  let removed = 0;
  for (const work of works) {
    let key = researchWorkKey(work);
    const titleKey = `title:${normalizeTitle(work.title)}|${work.publicationYear ?? "unknown"}`;
    if (!key.startsWith("doi:") && titleIndex.has(titleKey)) {
      key = titleIndex.get(titleKey)!;
    } else if (key.startsWith("doi:") && titleIndex.has(titleKey) && titleIndex.get(titleKey) !== key) {
      const previousKey = titleIndex.get(titleKey)!;
      const previous = byKey.get(previousKey);
      if (previous) {
        byKey.delete(previousKey);
        byKey.set(key, mergeWorks(previous, work));
        titleIndex.set(titleKey, key);
        removed += 1;
        continue;
      }
    }
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, mergeWorks(existing, work));
      removed += 1;
    } else {
      byKey.set(key, work);
      titleIndex.set(titleKey, key);
    }
  }
  return { works: [...byKey.values()], removed };
}

function mergeWorks(a: ResearchWork, b: ResearchWork): ResearchWork {
  return {
    ...a,
    doi: a.doi ?? b.doi,
    abstract: (a.abstract?.length ?? 0) >= (b.abstract?.length ?? 0) ? a.abstract : b.abstract,
    authors: a.authors.length >= b.authors.length ? a.authors : b.authors,
    publicationYear: a.publicationYear ?? b.publicationYear,
    venue: a.venue ?? b.venue,
    citationCount: Math.max(a.citationCount ?? 0, b.citationCount ?? 0) || undefined,
    source: a.source === b.source ? a.source : `${a.source}+${b.source}`,
  };
}

/** Runs a set of queries across enabled sources, recording coverage and failures per source. */
export class ResearchAggregator {
  constructor(
    private readonly adapters: ResearchSourceAdapter[],
    private readonly logger?: AppLogger,
  ) {}

  catalog(): ResearchSourceCatalogEntry[] {
    return this.adapters.map((adapter) => ({
      key: adapter.key,
      name: adapter.name,
      description: adapter.description,
      baseUrl: adapter.baseUrl,
      requiresApiKey: adapter.requiresApiKey,
      enabled: true,
    }));
  }

  async search(
    queries: string[],
    options: { sources?: string[]; yearFrom?: number; yearTo?: number; limitPerSource: number; signal?: AbortSignal },
  ): Promise<AggregatedResearch> {
    const selected = this.adapters.filter((adapter) => !options.sources || options.sources.includes(adapter.key));
    const coverage: SourceCoverage[] = [];
    const collected: ResearchWork[] = [];
    await Promise.all(
      selected.flatMap((adapter) =>
        queries.map(async (query) => {
          const started = Date.now();
          const params: ResearchSearchParams = {
            query,
            yearFrom: options.yearFrom,
            yearTo: options.yearTo,
            limit: options.limitPerSource,
            signal: options.signal,
          };
          try {
            const works = await adapter.search(params);
            collected.push(...works);
            coverage.push({ source: adapter.key, query, requested: options.limitPerSource, returned: works.length, ok: true, errorCode: null, latencyMs: Date.now() - started });
          } catch (error) {
            const code = isAppError(error) ? error.code : "PROVIDER_UNAVAILABLE";
            this.logger?.warn({ source: adapter.key, code }, "Research source failed");
            coverage.push({ source: adapter.key, query, requested: options.limitPerSource, returned: 0, ok: false, errorCode: code, latencyMs: Date.now() - started });
          }
        }),
      ),
    );
    const { works, removed } = deduplicateWorks(collected);
    return {
      works,
      coverage,
      queries,
      yearFrom: options.yearFrom,
      yearTo: options.yearTo,
      retrievedAt: new Date().toISOString(),
      duplicatesRemoved: removed,
    };
  }
}

/** Deterministic offline adapter for tests. */
export class FakeResearchAdapter implements ResearchSourceAdapter {
  readonly key: string;
  readonly name: string;
  readonly description = "Offline fixture source";
  readonly baseUrl = "fixture://research";
  readonly requiresApiKey = false;
  public calls = 0;

  constructor(
    key: string,
    private readonly works: ResearchWork[],
    private readonly failure?: () => Error,
  ) {
    this.key = key;
    this.name = key;
  }

  async search(params: ResearchSearchParams): Promise<ResearchWork[]> {
    this.calls += 1;
    if (this.failure) throw this.failure();
    return this.works
      .filter((work) => !params.yearFrom || !work.publicationYear || work.publicationYear >= params.yearFrom)
      .filter((work) => !params.yearTo || !work.publicationYear || work.publicationYear <= params.yearTo)
      .slice(0, params.limit);
  }
}
