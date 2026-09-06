import type { ResearchWork } from "@pedago/shared";
import { XMLParser } from "fast-xml-parser";
import { normalizeDoi } from "../../utils/text.js";
import { fetchJson, fetchText, reconstructAbstract, type ResearchSearchParams, type ResearchSourceAdapter } from "./research-source.js";

interface OpenAlexResponse {
  results?: {
    id: string;
    doi?: string | null;
    title?: string | null;
    display_name?: string | null;
    abstract_inverted_index?: Record<string, number[]> | null;
    authorships?: { author?: { display_name?: string } }[];
    publication_year?: number | null;
    primary_location?: { source?: { display_name?: string | null } | null; landing_page_url?: string | null } | null;
    cited_by_count?: number | null;
  }[];
}

export class OpenAlexAdapter implements ResearchSourceAdapter {
  readonly key = "openalex";
  readonly name = "OpenAlex";
  readonly description = "Open catalog of scholarly works, authors, and venues.";
  readonly baseUrl = "https://api.openalex.org";
  readonly requiresApiKey = false;

  constructor(private readonly options: { timeoutMs: number; mailto?: string }) {}

  async search(params: ResearchSearchParams): Promise<ResearchWork[]> {
    const url = new URL(`${this.baseUrl}/works`);
    url.searchParams.set("search", params.query);
    url.searchParams.set("per-page", String(Math.min(params.limit, 50)));
    const filters: string[] = ["type:article|preprint|book-chapter"];
    if (params.yearFrom) filters.push(`from_publication_date:${params.yearFrom}-01-01`);
    if (params.yearTo) filters.push(`to_publication_date:${params.yearTo}-12-31`);
    url.searchParams.set("filter", filters.join(","));
    if (this.options.mailto) url.searchParams.set("mailto", this.options.mailto);
    const data = await fetchJson<OpenAlexResponse>(url.toString(), { timeoutMs: this.options.timeoutMs }, params.signal);
    const retrievedAt = new Date().toISOString();
    return (data.results ?? [])
      .filter((work) => (work.title ?? work.display_name) && work.id)
      .map((work) => ({
        externalId: work.id,
        source: this.key,
        doi: normalizeDoi(work.doi ?? undefined),
        title: (work.title ?? work.display_name)!,
        abstract: reconstructAbstract(work.abstract_inverted_index),
        authors: (work.authorships ?? []).map((a) => a.author?.display_name).filter((name): name is string => Boolean(name)),
        publicationYear: work.publication_year ?? undefined,
        venue: work.primary_location?.source?.display_name ?? undefined,
        citationCount: work.cited_by_count ?? undefined,
        url: work.primary_location?.landing_page_url ?? work.id,
        retrievedAt,
      }));
  }
}

interface SemanticScholarResponse {
  data?: {
    paperId: string;
    externalIds?: { DOI?: string; ArXiv?: string };
    title?: string;
    abstract?: string | null;
    authors?: { name: string }[];
    year?: number | null;
    venue?: string | null;
    citationCount?: number | null;
    url?: string;
  }[];
}

export class SemanticScholarAdapter implements ResearchSourceAdapter {
  readonly key = "semantic_scholar";
  readonly name = "Semantic Scholar";
  readonly description = "AI-powered academic search from the Allen Institute for AI.";
  readonly baseUrl = "https://api.semanticscholar.org/graph/v1";
  readonly requiresApiKey = false;

  constructor(private readonly options: { timeoutMs: number; apiKey?: string }) {}

  async search(params: ResearchSearchParams): Promise<ResearchWork[]> {
    const url = new URL(`${this.baseUrl}/paper/search`);
    url.searchParams.set("query", params.query);
    url.searchParams.set("limit", String(Math.min(params.limit, 100)));
    url.searchParams.set("fields", "title,abstract,authors,year,venue,citationCount,externalIds,url");
    if (params.yearFrom || params.yearTo) url.searchParams.set("year", `${params.yearFrom ?? ""}-${params.yearTo ?? ""}`);
    const headers = this.options.apiKey ? { "x-api-key": this.options.apiKey } : undefined;
    const data = await fetchJson<SemanticScholarResponse>(url.toString(), { timeoutMs: this.options.timeoutMs, headers }, params.signal);
    const retrievedAt = new Date().toISOString();
    return (data.data ?? [])
      .filter((paper) => paper.title)
      .map((paper) => ({
        externalId: paper.paperId,
        source: this.key,
        doi: normalizeDoi(paper.externalIds?.DOI),
        title: paper.title!,
        abstract: paper.abstract ?? undefined,
        authors: (paper.authors ?? []).map((a) => a.name),
        publicationYear: paper.year ?? undefined,
        venue: paper.venue || undefined,
        citationCount: paper.citationCount ?? undefined,
        url: paper.url ?? `https://www.semanticscholar.org/paper/${paper.paperId}`,
        retrievedAt,
      }));
  }
}

interface CrossrefResponse {
  message?: {
    items?: {
      DOI?: string;
      title?: string[];
      abstract?: string;
      author?: { given?: string; family?: string; name?: string }[];
      issued?: { "date-parts"?: number[][] };
      "container-title"?: string[];
      "is-referenced-by-count"?: number;
      URL?: string;
    }[];
  };
}

export class CrossrefAdapter implements ResearchSourceAdapter {
  readonly key = "crossref";
  readonly name = "Crossref";
  readonly description = "DOI registration agency metadata for scholarly publications.";
  readonly baseUrl = "https://api.crossref.org";
  readonly requiresApiKey = false;

  constructor(private readonly options: { timeoutMs: number; mailto?: string }) {}

  async search(params: ResearchSearchParams): Promise<ResearchWork[]> {
    const url = new URL(`${this.baseUrl}/works`);
    url.searchParams.set("query.bibliographic", params.query);
    url.searchParams.set("rows", String(Math.min(params.limit, 100)));
    url.searchParams.set("select", "DOI,title,abstract,author,issued,container-title,is-referenced-by-count,URL");
    const filters: string[] = [];
    if (params.yearFrom) filters.push(`from-pub-date:${params.yearFrom}`);
    if (params.yearTo) filters.push(`until-pub-date:${params.yearTo}`);
    if (filters.length > 0) url.searchParams.set("filter", filters.join(","));
    if (this.options.mailto) url.searchParams.set("mailto", this.options.mailto);
    const data = await fetchJson<CrossrefResponse>(url.toString(), { timeoutMs: this.options.timeoutMs }, params.signal);
    const retrievedAt = new Date().toISOString();
    return (data.message?.items ?? [])
      .filter((item) => item.DOI && item.title?.[0])
      .map((item) => ({
        externalId: item.DOI!,
        source: this.key,
        doi: normalizeDoi(item.DOI),
        title: item.title![0]!,
        abstract: item.abstract ? item.abstract.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : undefined,
        authors: (item.author ?? []).map((a) => a.name ?? [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean),
        publicationYear: item.issued?.["date-parts"]?.[0]?.[0] ?? undefined,
        venue: item["container-title"]?.[0] ?? undefined,
        citationCount: item["is-referenced-by-count"] ?? undefined,
        url: item.URL ?? `https://doi.org/${item.DOI}`,
        retrievedAt,
      }));
  }
}

interface ArxivEntry {
  id: string;
  title: string;
  summary?: string;
  author?: { name: string } | { name: string }[];
  published?: string;
  "arxiv:doi"?: string | { "#text": string };
  "arxiv:journal_ref"?: string;
}

export class ArxivAdapter implements ResearchSourceAdapter {
  readonly key = "arxiv";
  readonly name = "arXiv";
  readonly description = "Open-access preprint repository (Atom API).";
  readonly baseUrl = "https://export.arxiv.org/api";
  readonly requiresApiKey = false;
  private readonly parser = new XMLParser({ ignoreAttributes: false });

  constructor(private readonly options: { timeoutMs: number }) {}

  async search(params: ResearchSearchParams): Promise<ResearchWork[]> {
    const url = new URL(`${this.baseUrl}/query`);
    url.searchParams.set("search_query", `all:${params.query.replace(/[^\w\s-]/g, " ").trim().split(/\s+/).join(" AND all:")}`);
    url.searchParams.set("max_results", String(Math.min(params.limit, 100)));
    url.searchParams.set("sortBy", "relevance");
    const xml = await fetchText(url.toString(), { timeoutMs: this.options.timeoutMs }, params.signal);
    const parsed = this.parser.parse(xml) as { feed?: { entry?: ArxivEntry | ArxivEntry[] } };
    const entries = parsed.feed?.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];
    const retrievedAt = new Date().toISOString();
    return entries
      .map((entry) => {
        const year = entry.published ? Number(entry.published.slice(0, 4)) : undefined;
        const doiRaw = typeof entry["arxiv:doi"] === "object" ? entry["arxiv:doi"]["#text"] : entry["arxiv:doi"];
        return {
          externalId: entry.id,
          source: this.key,
          doi: normalizeDoi(doiRaw),
          title: String(entry.title).replace(/\s+/g, " ").trim(),
          abstract: entry.summary ? String(entry.summary).replace(/\s+/g, " ").trim() : undefined,
          authors: entry.author ? (Array.isArray(entry.author) ? entry.author : [entry.author]).map((a) => a.name) : [],
          publicationYear: year && Number.isFinite(year) ? year : undefined,
          venue: entry["arxiv:journal_ref"] ?? "arXiv",
          citationCount: undefined,
          url: entry.id,
          retrievedAt,
        } satisfies ResearchWork;
      })
      .filter((work) => {
        if (params.yearFrom && work.publicationYear && work.publicationYear < params.yearFrom) return false;
        if (params.yearTo && work.publicationYear && work.publicationYear > params.yearTo) return false;
        return true;
      });
  }
}

interface UnpaywallResponse {
  is_oa?: boolean;
  oa_status?: string;
  best_oa_location?: { url?: string | null; license?: string | null } | null;
}

/** Optional open-access metadata enrichment. Never used for search, only for DOI lookups. */
export class UnpaywallAdapter {
  readonly key = "unpaywall";
  readonly baseUrl = "https://api.unpaywall.org/v2";

  constructor(private readonly options: { timeoutMs: number; email: string }) {}

  async lookup(doi: string, signal?: AbortSignal): Promise<{ isOpenAccess: boolean; oaStatus: string | null; oaUrl: string | null; license: string | null }> {
    const url = `${this.baseUrl}/${encodeURIComponent(doi)}?email=${encodeURIComponent(this.options.email)}`;
    const data = await fetchJson<UnpaywallResponse>(url, { timeoutMs: this.options.timeoutMs }, signal);
    return {
      isOpenAccess: Boolean(data.is_oa),
      oaStatus: data.oa_status ?? null,
      oaUrl: data.best_oa_location?.url ?? null,
      license: data.best_oa_location?.license ?? null,
    };
  }
}
