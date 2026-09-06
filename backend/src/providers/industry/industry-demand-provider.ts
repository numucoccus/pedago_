import type { IndustrySourceCatalogEntry } from "@pedago/shared";
import type { DocumentRow } from "@pedago/shared/database";
import type { DocumentRepository } from "../../repositories/document-repository.js";
import type { IndustryRepository } from "../../repositories/misc-repositories.js";
import { normalizeSkill } from "../../utils/text.js";

export interface SkillDemandObservation {
  skill: string;
  normalizedSkill: string;
  frequency: number;
  sampleSize: number;
  sector: string;
  sourceKey: string;
  sourceName: string;
  retrievedAt: string;
  locator: Record<string, unknown>;
  excerpt: string;
  documentId?: string;
  documentChunkId?: string;
}

export interface IndustryDemandResult {
  observations: SkillDemandObservation[];
  sources: { key: string; name: string; retrievedAt: string; observationCount: number; termsUrl: string | null }[];
  limitations: string[];
}

/**
 * Industry demand comes only from uploaded datasets (CSV/XLSX job requirement exports) or from
 * pre-approved configured sources. No live scraping happens here.
 */
export class IndustryDemandProvider {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly industry: IndustryRepository,
  ) {}

  async catalog(workspaceId: string): Promise<IndustrySourceCatalogEntry[]> {
    const configured = await this.industry.listSources(workspaceId);
    const entries: IndustrySourceCatalogEntry[] = configured.map((source) => ({
      key: source.key,
      name: source.name,
      sourceType: "configured_dataset",
      description: `${source.source_type}${source.retrieved_at ? ` (retrieved ${source.retrieved_at.slice(0, 10)})` : ""}`,
      termsUrl: source.terms_url,
    }));
    entries.unshift({
      key: "uploaded_dataset",
      name: "Uploaded job-requirement dataset",
      sourceType: "uploaded_dataset",
      description: "CSV/XLSX with columns such as skill, frequency/count, sector, and optional role or source.",
      termsUrl: null,
    });
    return entries;
  }

  async collect(workspaceId: string, sector: string, datasetDocuments: DocumentRow[], sourceKeys: string[]): Promise<IndustryDemandResult> {
    const observations: SkillDemandObservation[] = [];
    const sources: IndustryDemandResult["sources"] = [];
    const limitations: string[] = [];

    for (const document of datasetDocuments) {
      const chunks = await this.documents.listChunks(document.id);
      const parsed = parseDatasetChunks(chunks.map((chunk) => ({ id: chunk.id, content: chunk.content, locator: chunk.locator as Record<string, unknown> })), sector);
      if (parsed.length === 0) {
        limitations.push(`Dataset "${document.title}" had no rows with a recognizable skill column.`);
        continue;
      }
      observations.push(
        ...parsed.map((row) => ({
          ...row,
          sourceKey: "uploaded_dataset",
          sourceName: document.title,
          retrievedAt: document.created_at,
          documentId: document.id,
        })),
      );
      sources.push({ key: `uploaded:${document.id}`, name: document.title, retrievedAt: document.created_at, observationCount: parsed.length, termsUrl: null });
    }

    if (sourceKeys.length > 0) {
      const configured = (await this.industry.listSources(workspaceId)).filter((source) => sourceKeys.includes(source.key));
      const missing = sourceKeys.filter((key) => !configured.some((source) => source.key === key));
      if (missing.length > 0) limitations.push(`Unknown industry sources ignored: ${missing.join(", ")}.`);
      const rows = await this.industry.listObservations(workspaceId, configured.map((source) => source.id), sector);
      for (const source of configured) {
        const own = rows.filter((row) => row.source_id === source.id);
        observations.push(
          ...own.map((row) => ({
            skill: row.skill,
            normalizedSkill: row.normalized_skill || normalizeSkill(row.skill),
            frequency: row.frequency,
            sampleSize: row.sample_size,
            sector: row.sector,
            sourceKey: source.key,
            sourceName: source.name,
            retrievedAt: row.observed_at,
            locator: { url: source.source_url ?? undefined, observationId: row.id },
            excerpt: `${row.skill}: ${row.frequency} of ${row.sample_size} postings (${row.sector})`,
          })),
        );
        sources.push({ key: source.key, name: source.name, retrievedAt: source.retrieved_at ?? "unknown", observationCount: own.length, termsUrl: source.terms_url });
      }
    }

    if (observations.length === 0) {
      limitations.push("No industry demand observations were available; coverage cannot be measured.");
    }
    return { observations, sources, limitations };
  }
}

const SKILL_COLUMNS = ["skill", "skills", "requirement", "requirements", "competency", "technology", "keyword"];
const FREQUENCY_COLUMNS = ["frequency", "count", "postings", "mentions", "demand", "occurrences"];
const SAMPLE_COLUMNS = ["sample_size", "sample", "total_postings", "total", "n"];
const SECTOR_COLUMNS = ["sector", "industry", "domain"];

/** Parses SheetJS row segments of the form "Header: value | Header: value". */
export function parseDatasetChunks(
  chunks: { id: string; content: string; locator: Record<string, unknown> }[],
  sector: string,
): Omit<SkillDemandObservation, "sourceKey" | "sourceName" | "retrievedAt">[] {
  const results: Omit<SkillDemandObservation, "sourceKey" | "sourceName" | "retrievedAt">[] = [];
  for (const chunk of chunks) {
    const fields = new Map<string, string>();
    for (const part of chunk.content.split(" | ")) {
      const separator = part.indexOf(":");
      if (separator < 0) continue;
      fields.set(part.slice(0, separator).trim().toLowerCase().replace(/\s+/g, "_"), part.slice(separator + 1).trim());
    }
    const skillKey = [...fields.keys()].find((key) => SKILL_COLUMNS.includes(key));
    if (!skillKey) continue;
    const rowSector = [...fields.keys()].find((key) => SECTOR_COLUMNS.includes(key));
    const sectorValue = rowSector ? fields.get(rowSector)! : sector;
    if (rowSector && sectorValue && sectorValue.toLowerCase() !== sector.toLowerCase()) continue;
    const frequencyKey = [...fields.keys()].find((key) => FREQUENCY_COLUMNS.includes(key));
    const sampleKey = [...fields.keys()].find((key) => SAMPLE_COLUMNS.includes(key));
    const frequency = frequencyKey ? Number(fields.get(frequencyKey)) : 1;
    const sampleSize = sampleKey ? Number(fields.get(sampleKey)) : 0;
    const skills = fields
      .get(skillKey)!
      .split(/[;,/]/)
      .map((skill) => skill.trim())
      .filter(Boolean);
    for (const skill of skills) {
      results.push({
        skill,
        normalizedSkill: normalizeSkill(skill),
        frequency: Number.isFinite(frequency) && frequency > 0 ? frequency : 1,
        sampleSize: Number.isFinite(sampleSize) && sampleSize > 0 ? sampleSize : 0,
        sector: sectorValue || sector,
        locator: chunk.locator,
        excerpt: chunk.content.slice(0, 300),
        documentChunkId: chunk.id,
      });
    }
  }
  return results;
}
