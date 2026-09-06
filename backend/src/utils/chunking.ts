import type { EvidenceLocator } from "@pedago/shared";

export interface TextSegment {
  text: string;
  locator: EvidenceLocator;
}

export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
  locator: EvidenceLocator;
}

/** Cheap token estimate that is stable across runs (about 4 characters per token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

/**
 * Chunks document-aware segments. Segments (pages, slides, rows, timestamps) are never merged
 * across locator boundaries so every chunk keeps a precise locator. Long segments are split on
 * paragraph/sentence boundaries with overlap.
 */
export function chunkSegments(segments: TextSegment[], options: ChunkOptions = {}): Chunk[] {
  const maxTokens = options.maxTokens ?? 350;
  const overlapTokens = options.overlapTokens ?? 40;
  const chunks: Chunk[] = [];

  for (const segment of segments) {
    const text = segment.text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
    if (!text) {
      continue;
    }
    if (estimateTokens(text) <= maxTokens) {
      chunks.push({ index: chunks.length, content: text, tokenCount: estimateTokens(text), locator: segment.locator });
      continue;
    }
    const pieces = splitIntoUnits(text);
    let buffer: string[] = [];
    let bufferTokens = 0;
    const flush = () => {
      if (buffer.length === 0) return;
      const content = buffer.join(" ").trim();
      chunks.push({
        index: chunks.length,
        content,
        tokenCount: estimateTokens(content),
        locator: { ...segment.locator, part: chunks.filter((c) => sameLocator(c.locator, segment.locator)).length + 1 },
      });
      // keep overlap
      const keep: string[] = [];
      let keepTokens = 0;
      for (let i = buffer.length - 1; i >= 0 && keepTokens < overlapTokens; i -= 1) {
        keep.unshift(buffer[i]!);
        keepTokens += estimateTokens(buffer[i]!);
      }
      buffer = keep;
      bufferTokens = keepTokens;
    };
    for (const unit of pieces) {
      const unitTokens = estimateTokens(unit);
      if (bufferTokens + unitTokens > maxTokens && buffer.length > 0) {
        flush();
      }
      if (unitTokens > maxTokens) {
        // Hard split very long units by characters.
        for (let start = 0; start < unit.length; start += maxTokens * 4) {
          const slice = unit.slice(start, start + maxTokens * 4);
          buffer.push(slice);
          bufferTokens += estimateTokens(slice);
          flush();
        }
        continue;
      }
      buffer.push(unit);
      bufferTokens += unitTokens;
    }
    if (buffer.length > 0 && (buffer.join(" ").trim().length > 0)) {
      const content = buffer.join(" ").trim();
      const last = chunks[chunks.length - 1];
      if (!last || !last.content.endsWith(content)) {
        chunks.push({
          index: chunks.length,
          content,
          tokenCount: estimateTokens(content),
          locator: { ...segment.locator, part: chunks.filter((c) => sameLocator(c.locator, segment.locator)).length + 1 },
        });
      }
    }
  }
  return chunks;
}

function sameLocator(a: EvidenceLocator, b: EvidenceLocator): boolean {
  const keys = ["page", "slide", "row", "sheet", "question", "timestampSeconds", "line", "section"] as const;
  return keys.every((key) => a[key] === b[key]);
}

function splitIntoUnits(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const units: string[] = [];
  for (const paragraph of paragraphs) {
    if (estimateTokens(paragraph) <= 120) {
      units.push(paragraph);
      continue;
    }
    const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).map((s) => s.trim()).filter(Boolean);
    units.push(...sentences);
  }
  return units;
}
