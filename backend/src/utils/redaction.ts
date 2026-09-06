/**
 * Detects and redacts common student identifiers. This is a conservative heuristic pass; the
 * database still records `contains_personal_data` so retention rules can apply regardless.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?<!\d)(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)\d{3}[\s-]?\d{4}(?!\d)/g;
// Typical student/roll identifiers such as 2020-1-60-123, CSE-19-045, 190104123, 2021CSE0451.
const STUDENT_ID = /\b(?:\d{4}-\d{1,2}-\d{2}-\d{3}|[A-Z]{2,5}-?\d{2}-?\d{3,5}|\d{9,12}|\d{4}[A-Z]{2,5}\d{3,5})\b/g;
const NAME_LABEL = /\b(?:name|student name|student|roll no\.?|roll|id|reg(?:istration)? no\.?)\s*[:\-]\s*([A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+){0,3})/gi;

export interface RedactionResult {
  text: string;
  redactions: { kind: "email" | "phone" | "student_id" | "name"; count: number }[];
  containsIdentifiers: boolean;
}

export function detectIdentifiers(text: string): boolean {
  return EMAIL.test(text) || PHONE.test(text) || STUDENT_ID.test(text) || NAME_LABEL.test(text);
}

export function redactIdentifiers(text: string): RedactionResult {
  const counts = { email: 0, phone: 0, student_id: 0, name: 0 };
  let output = text.replace(EMAIL, () => {
    counts.email += 1;
    return "[EMAIL]";
  });
  output = output.replace(NAME_LABEL, (match, name: string) => {
    counts.name += 1;
    return match.replace(name, "[NAME]");
  });
  output = output.replace(STUDENT_ID, () => {
    counts.student_id += 1;
    return "[STUDENT_ID]";
  });
  output = output.replace(PHONE, () => {
    counts.phone += 1;
    return "[PHONE]";
  });
  const redactions = (Object.entries(counts) as [keyof typeof counts, number][])
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, count }));
  return { text: output, redactions, containsIdentifiers: redactions.length > 0 };
}

/** Produces a stable pseudonymous key for a subject identifier so joins remain possible after redaction. */
export function pseudonymize(value: string, salt: string): string {
  let hash = 0x811c9dc5;
  const input = `${salt}:${value.trim().toLowerCase()}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `subj_${hash.toString(16).padStart(8, "0")}`;
}
