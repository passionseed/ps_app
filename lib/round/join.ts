/** Join helpers (DS6, spec 3.2 join rules). The server re-checks everything. */
import { ictParts } from "./time";

/** Guardian required when age in months <= 240 in ICT (conservative in the birthday month). */
export function guardianRequired(birthMonth: number, birthYear: number, now: Date = new Date()): boolean {
  const p = ictParts(now);
  return p.year * 12 + p.month - (birthYear * 12 + birthMonth) <= 240;
}

/** Handle rules mirrored from the RPC: 2-24 chars, no URLs, @handles or 9+ digits. */
export function handleProblem(handle: string): boolean {
  const h = handle.trim();
  if (h.length < 2 || h.length > 24) return true;
  if (/https?:|www\.|\.(com|net|org|me|co)\b|@/i.test(h)) return true;
  return (h.match(/\d/g) ?? []).length >= 9;
}

/** Thai students often type the Buddhist-era year (e.g. 2551 -> 2008). */
export function normalizeBirthYear(raw: string): number | null {
  const n = Number(raw.trim());
  if (!raw.trim() || !Number.isInteger(n)) return null;
  const ce = n > 2400 ? n - 543 : n;
  return ce >= 1950 && ce <= 2020 ? ce : null;
}
