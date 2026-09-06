import { researchEvolutionInputSchema, type ResearchEvolutionInput } from "@pedago/shared";
import type { Json } from "@pedago/shared/database";
import { z } from "zod";
import { researchEvolutionPrompt } from "../../prompts/index.js";
import { tokenize } from "../../utils/text.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";
import { buildSearchQueries, collectResearchContext, type RankedWork } from "./research-context.js";

const outputSchema = z.object({ ...aiFindingsBlock });

export interface TrendPoint {
  year: number;
  dimension: "publications" | "citations" | "keyword" | "method";
  label: string;
  value: number;
  sampleSize: number;
}

export interface ResearchEvolutionOutput {
  yearlySeries: { year: number; publications: number; citations: number }[];
  keywordSeries: { keyword: string; points: { year: number; count: number }[]; trend: "emerging" | "declining" | "stable"; slope: number }[];
  methodSeries: { method: string; points: { year: number; count: number }[]; trend: "emerging" | "declining" | "stable"; slope: number }[];
  searchCoverage: Record<string, unknown>;
  sampleSize: number;
}

interface Extra {
  ranked: RankedWork[];
  points: TrendPoint[];
  output: ResearchEvolutionOutput;
  coverage: Record<string, unknown>;
}

/** Deterministic aggregation of counts; the model only labels and explains the measured series. */
export function aggregateTrends(
  works: { publicationYear?: number; title: string; abstract?: string; citationCount?: number }[],
  yearFrom: number,
  yearTo: number,
  keywords: string[],
  methodTerms: string[],
): { points: TrendPoint[]; output: Omit<ResearchEvolutionOutput, "searchCoverage"> } {
  const years = Array.from({ length: yearTo - yearFrom + 1 }, (_, index) => yearFrom + index);
  const dated = works.filter((work) => work.publicationYear !== undefined && work.publicationYear >= yearFrom && work.publicationYear <= yearTo);
  const yearlySeries = years.map((year) => {
    const inYear = dated.filter((work) => work.publicationYear === year);
    return { year, publications: inYear.length, citations: inYear.reduce((sum, work) => sum + (work.citationCount ?? 0), 0) };
  });
  const autoKeywords = keywords.length > 0 ? keywords : topTokens(dated.map((work) => `${work.title} ${work.abstract ?? ""}`), 8);
  const series = (terms: string[]) =>
    terms.map((term) => {
      const lowered = term.toLowerCase();
      const points = years.map((year) => ({
        year,
        count: dated.filter((work) => work.publicationYear === year && `${work.title} ${work.abstract ?? ""}`.toLowerCase().includes(lowered)).length,
      }));
      const slope = linearSlope(points.map((point) => point.count));
      const total = points.reduce((sum, point) => sum + point.count, 0);
      const trend: "emerging" | "declining" | "stable" = total < 2 ? "stable" : slope > 0.15 ? "emerging" : slope < -0.15 ? "declining" : "stable";
      return { term, points, trend, slope: Math.round(slope * 1000) / 1000 };
    });
  const keywordSeries = series(autoKeywords).map(({ term, ...rest }) => ({ keyword: term, ...rest }));
  const methodSeries = series(methodTerms).map(({ term, ...rest }) => ({ method: term, ...rest }));
  const points: TrendPoint[] = [
    ...yearlySeries.flatMap((entry) => [
      { year: entry.year, dimension: "publications" as const, label: "publications", value: entry.publications, sampleSize: entry.publications },
      { year: entry.year, dimension: "citations" as const, label: "citations", value: entry.citations, sampleSize: entry.publications },
    ]),
    ...keywordSeries.flatMap((entry) => entry.points.map((point) => ({ year: point.year, dimension: "keyword" as const, label: entry.keyword, value: point.count, sampleSize: yearlySeries.find((y) => y.year === point.year)?.publications ?? 0 }))),
    ...methodSeries.flatMap((entry) => entry.points.map((point) => ({ year: point.year, dimension: "method" as const, label: entry.method, value: point.count, sampleSize: yearlySeries.find((y) => y.year === point.year)?.publications ?? 0 }))),
  ];
  return { points, output: { yearlySeries, keywordSeries, methodSeries, sampleSize: dated.length } };
}

function topTokens(texts: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const text of texts) for (const token of new Set(tokenize(text))) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([token]) => token);
}

export function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY);
    denominator += (index - meanX) ** 2;
  });
  return denominator === 0 ? 0 : numerator / denominator;
}

export class ResearchEvolutionHandler implements AnalysisHandler<ResearchEvolutionInput, HandlerResult<ResearchEvolutionOutput>, Extra> {
  readonly type = "research_evolution" as const;
  readonly promptVersion = researchEvolutionPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): ResearchEvolutionInput {
    const parsed = researchEvolutionInputSchema.parse(input);
    if (parsed.yearTo < parsed.yearFrom) throw new Error("yearTo must be greater than or equal to yearFrom");
    if (parsed.yearTo - parsed.yearFrom > 40) throw new Error("Year range must be at most 40 years");
    return parsed;
  }

  async collectContext(context: AnalysisContext<ResearchEvolutionInput>): Promise<CollectedContext<ResearchEvolutionInput, Extra>> {
    const { input } = context;
    const queries = buildSearchQueries({ topic: input.topic, extra: input.keywords.slice(0, 2).map((keyword) => `${input.topic} ${keyword}`) });
    await context.reportProgress("indexing", 35, "Retrieving works for trend aggregation");
    const research = await collectResearchContext(context, queries, {
      sources: input.sources,
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      limitPerSource: input.maxResultsPerSource,
      rankAgainst: input.topic,
      maxEvidence: Math.min(context.settings.maxEvidence ?? 12, 20),
    });
    const { points, output } = aggregateTrends(research.aggregated.works, input.yearFrom, input.yearTo, input.keywords, input.methodTerms);
    const metrics = [
      metricEvidence(evidenceKey(research.evidence.length), "Yearly publication counts", output.yearlySeries.map((entry) => `${entry.year}: ${entry.publications} works, ${entry.citations} citations`).join("; "), { series: "publications" }),
      metricEvidence(evidenceKey(research.evidence.length + 1), "Keyword frequency series", output.keywordSeries.map((entry) => `${entry.keyword} (${entry.trend}, slope ${entry.slope}): ${entry.points.map((p) => p.count).join(",")}`).join("; ") || "no keywords", { series: "keywords" }),
      metricEvidence(evidenceKey(research.evidence.length + 2), "Method frequency series", output.methodSeries.map((entry) => `${entry.method} (${entry.trend}, slope ${entry.slope}): ${entry.points.map((p) => p.count).join(",")}`).join("; ") || "no method terms", { series: "methods" }),
    ];
    const coverage = { sources: research.aggregated.coverage, queries, totalRetrieved: research.aggregated.works.length, datedWorks: output.sampleSize, retrievedAt: research.aggregated.retrievedAt };
    return {
      ...context,
      evidence: [...research.evidence, ...metrics],
      extra: { ranked: research.ranked, points, output: { ...output, searchCoverage: coverage }, coverage },
      limitations: [...research.limitations, output.sampleSize < 10 ? `Only ${output.sampleSize} dated works were retrieved; trends are indicative, not conclusive.` : ""].filter(Boolean),
      retrieval: {},
      externalSources: coverage,
    };
  }

  async execute(context: CollectedContext<ResearchEvolutionInput, Extra>): Promise<HandlerResult<ResearchEvolutionOutput>> {
    const { extra, input } = context;
    const metricKeys = context.evidence.filter((item) => item.sourceType === "calculated_metric").map((item) => item.key);
    const measured = [
      measuredFinding(
        `Publication volume ${input.yearFrom}–${input.yearTo}`,
        `${extra.output.sampleSize} dated works retrieved; yearly counts: ${extra.output.yearlySeries.map((entry) => `${entry.year}=${entry.publications}`).join(", ")}.`,
        [metricKeys[0]!],
        { category: "measured", metrics: { series: extra.output.yearlySeries }, limitations: context.limitations.length > 0 ? context.limitations : undefined },
      ),
    ];
    if (extra.output.sampleSize === 0) {
      return { findings: measured, artifacts: [], output: extra.output, confidence: "low", limitations: ["No dated works retrieved."], modelCalls: [], promptVersion: this.promptVersion };
    }
    const response = await runPrompt(
      context,
      researchEvolutionPrompt,
      {
        topic: input.topic,
        yearRange: `${input.yearFrom}–${input.yearTo}`,
        series: JSON.stringify({ yearly: extra.output.yearlySeries, keywords: extra.output.keywordSeries.map((k) => ({ keyword: k.keyword, trend: k.trend, counts: k.points.map((p) => p.count) })), methods: extra.output.methodSeries.map((m) => ({ method: m.method, trend: m.trend, counts: m.points.map((p) => p.count) })) }),
        evidence: context.evidence,
      },
      outputSchema,
    );
    const findings = [...measured, ...response.data.findings.map((finding) => toFindingDraft(finding, "narrative"))];
    const report = [
      `## Research evolution: ${input.topic} (${input.yearFrom}–${input.yearTo})`,
      `Sample: ${extra.output.sampleSize} dated works.`,
      ``,
      `| Year | Publications | Citations |`,
      `|---|---|---|`,
      ...extra.output.yearlySeries.map((entry) => `| ${entry.year} | ${entry.publications} | ${entry.citations} |`),
      ``,
      `### Keyword trends`,
      ...extra.output.keywordSeries.map((entry) => `- ${entry.keyword}: ${entry.trend} (slope ${entry.slope})`),
      ``,
      `### Narrative findings`,
      ...response.data.findings.map((finding) => `- **${finding.title}** — ${finding.summary} [${finding.evidenceKeys.join(", ")}]`),
    ].join("\n");
    return {
      findings,
      artifacts: [{ type: "research_report", title: `Evolution report: ${input.topic}`, content: extra.output as unknown as Record<string, unknown>, contentText: report }],
      output: extra.output,
      confidence: overallConfidence(findings),
      limitations: response.data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<ResearchEvolutionOutput>, ResearchEvolutionInput, Extra>): Promise<void> {
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    await context.deps.research.insertTrendPoints(
      context.extra.points.map((point) => ({ ...tenant, analysis_id: context.analysis.id, year: point.year, dimension: point.dimension, label: point.label, value: point.value, sample_size: point.sampleSize, metadata: {} as Json })),
    );
    for (const entry of (context.extra.coverage.sources as { source: string; query: string; returned: number; errorCode: string | null }[]) ?? []) {
      await context.deps.research.recordQuery({ ...tenant, analysis_id: context.analysis.id, query_text: entry.query, source: entry.source, filters: { yearFrom: context.input.yearFrom, yearTo: context.input.yearTo } as Json, executed_at: context.extra.coverage.retrievedAt as string, result_count: entry.returned, error_code: entry.errorCode });
    }
    if (context.extra.ranked.length > 0) {
      await context.deps.analyses.linkResearchWorks(context.extra.ranked.map((item) => ({ analysis_id: context.analysis.id, research_work_id: item.row.id, relevance_score: item.relevance, relationship: "context" as const })));
    }
  }
}
