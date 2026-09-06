import type { UploadPurpose } from "@pedago/shared";

export type InputClass = "pdf" | "docx" | "text" | "csv" | "xlsx" | "image" | "audio";

export interface MimeRule {
  inputClass: InputClass;
  extensions: string[];
  maxBytes: number;
  /** Content sniffing via magic bytes is possible for binary formats only. */
  sniffable: boolean;
}

const MB = 1024 * 1024;

export const SUPPORTED_MIME_TYPES: Record<string, MimeRule> = {
  "application/pdf": { inputClass: "pdf", extensions: ["pdf"], maxBytes: 50 * MB, sniffable: true },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    inputClass: "docx",
    extensions: ["docx"],
    maxBytes: 30 * MB,
    sniffable: true,
  },
  "text/plain": { inputClass: "text", extensions: ["txt", "md"], maxBytes: 10 * MB, sniffable: false },
  "text/markdown": { inputClass: "text", extensions: ["md", "markdown"], maxBytes: 10 * MB, sniffable: false },
  "text/csv": { inputClass: "csv", extensions: ["csv"], maxBytes: 20 * MB, sniffable: false },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    inputClass: "xlsx",
    extensions: ["xlsx"],
    maxBytes: 30 * MB,
    sniffable: true,
  },
  "application/vnd.ms-excel": { inputClass: "xlsx", extensions: ["xls"], maxBytes: 30 * MB, sniffable: true },
  "image/png": { inputClass: "image", extensions: ["png"], maxBytes: 15 * MB, sniffable: true },
  "image/jpeg": { inputClass: "image", extensions: ["jpg", "jpeg"], maxBytes: 15 * MB, sniffable: true },
  "audio/mpeg": { inputClass: "audio", extensions: ["mp3"], maxBytes: 50 * MB, sniffable: true },
  "audio/mp4": { inputClass: "audio", extensions: ["m4a", "mp4"], maxBytes: 50 * MB, sniffable: true },
  "audio/x-m4a": { inputClass: "audio", extensions: ["m4a"], maxBytes: 50 * MB, sniffable: true },
  "audio/wav": { inputClass: "audio", extensions: ["wav"], maxBytes: 50 * MB, sniffable: true },
  "audio/x-wav": { inputClass: "audio", extensions: ["wav"], maxBytes: 50 * MB, sniffable: true },
  "audio/webm": { inputClass: "audio", extensions: ["webm"], maxBytes: 50 * MB, sniffable: true },
  "audio/ogg": { inputClass: "audio", extensions: ["ogg", "oga"], maxBytes: 50 * MB, sniffable: true },
};

export const PURPOSE_INPUT_CLASSES: Record<UploadPurpose, InputClass[]> = {
  academic: ["pdf", "docx", "text", "csv", "xlsx", "image"],
  student_evidence: ["pdf", "docx", "image", "csv", "xlsx", "text"],
  audio_note: ["audio"],
};

export function getMimeRule(mimeType: string): MimeRule | null {
  return SUPPORTED_MIME_TYPES[mimeType.toLowerCase().split(";")[0]!.trim()] ?? null;
}

export function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1]! : "";
}

/** Sniffed types that are compatible with a declared MIME type (e.g., docx/xlsx are both zip). */
export function sniffedTypeMatches(declared: string, sniffed: string | undefined): boolean {
  if (!sniffed) return true;
  if (declared === sniffed) return true;
  const zipBased = new Set([
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);
  if (zipBased.has(declared) && zipBased.has(sniffed)) return true;
  const audioFamilies: Record<string, string[]> = {
    "audio/mpeg": ["audio/mpeg", "audio/mp3"],
    "audio/mp4": ["audio/mp4", "video/mp4", "audio/x-m4a"],
    "audio/x-m4a": ["audio/mp4", "audio/x-m4a"],
    "audio/wav": ["audio/wav", "audio/x-wav", "audio/vnd.wave"],
    "audio/x-wav": ["audio/wav", "audio/x-wav", "audio/vnd.wave"],
    "audio/webm": ["audio/webm", "video/webm"],
    "audio/ogg": ["audio/ogg", "application/ogg"],
  };
  return (audioFamilies[declared] ?? []).includes(sniffed);
}
