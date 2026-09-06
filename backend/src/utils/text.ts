const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "by", "is", "are", "was", "were",
  "be", "this", "that", "it", "as", "at", "from", "we", "our", "i", "you", "my", "me", "not", "do", "does",
  "how", "what", "why", "can", "could", "would", "should", "about", "into", "than", "then", "there", "which",
  "using", "use", "based", "via", "study", "paper", "approach", "results", "analysis",
]);

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDoi(doi: string | undefined | null): string | undefined {
  if (!doi) return undefined;
  const cleaned = doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:/, "");
  return /^10\.\d{4,9}\/\S+$/.test(cleaned) ? cleaned : undefined;
}

export function tokenize(text: string): string[] {
  return normalizeTitle(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function keywordOverlap(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / Math.sqrt(setA.size * setB.size);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function normalizeSkill(skill: string): string {
  return normalizeTitle(skill)
    .replace(/\b(programming|language|framework|library|skills?|experience|knowledge)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
