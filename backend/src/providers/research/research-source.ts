import type { ResearchWork } from "@pedago/shared";
import { AppError } from "../../utils/errors.js";

export interface ResearchSearchParams {
  query: string;
  yearFrom?: number;
  yearTo?: number;
  limit: number;
  signal?: AbortSignal;
}

export interface ResearchSourceAdapter {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly baseUrl: string;
  readonly requiresApiKey: boolean;
  search(params: ResearchSearchParams): Promise<ResearchWork[]>;
}

export interface ResearchFetchOptions {
  timeoutMs: number;
  headers?: Record<string, string>;
}

/** Shared HTTP helper that maps network and HTTP failures onto PROVIDER_UNAVAILABLE. */
export async function fetchJson<T>(url: string, options: ResearchFetchOptions, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "PedagoAI/0.1 (academic research assistant)", ...options.headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw AppError.providerUnavailable(`Research source returned HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.providerUnavailable("Research source request failed", error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchText(url: string, options: ResearchFetchOptions, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "PedagoAI/0.1 (academic research assistant)", ...options.headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw AppError.providerUnavailable(`Research source returned HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.providerUnavailable("Research source request failed", error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function reconstructAbstract(inverted: Record<string, number[]> | null | undefined): string | undefined {
  if (!inverted) return undefined;
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const position of positions) words.push([position, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  const text = words.map(([, word]) => word).join(" ");
  return text.length > 0 ? text : undefined;
}
