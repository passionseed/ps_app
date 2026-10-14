/**
 * Ideas composer rows (scale spec 2.2, step 1): 3 to 6 rows of "ไอเดีย" + "ใครเจอ", one picked.
 * Drafts keep rows with ids (stable list keys, picking by id); the payload is built from the
 * non-empty rows with `picked` as a 0-based index into them.
 */
import { IDEAS_MAX, IDEAS_MIN } from "./schema";

export type IdeaRow = { id: string; text: string; who: string };

let counter = 0;
export function ideaRowId(): string {
  counter = (counter + 1) % 1_000_000;
  return `i${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newIdeaRows(count = IDEAS_MIN, makeId: () => string = ideaRowId): IdeaRow[] {
  return Array.from({ length: count }, () => ({ id: makeId(), text: "", who: "" }));
}

/** Rows from a draft's fields (tolerates older or partial drafts). */
export function ideaRows(raw: unknown): IdeaRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r, i) => ({
      id: typeof r.id === "string" && r.id ? r.id : `row-${i}`,
      text: typeof r.text === "string" ? r.text : "",
      who: typeof r.who === "string" ? r.who : "",
    }));
}

const isBlank = (row: IdeaRow) => !row.text.trim() && !row.who.trim();

export function canAddIdea(rows: IdeaRow[]): boolean {
  return rows.length < IDEAS_MAX;
}

export function canRemoveIdea(rows: IdeaRow[]): boolean {
  return rows.length > IDEAS_MIN;
}

export function addIdeaRow(rows: IdeaRow[], makeId: () => string = ideaRowId): IdeaRow[] {
  return canAddIdea(rows) ? [...rows, { id: makeId(), text: "", who: "" }] : rows;
}

export function removeIdeaRow(rows: IdeaRow[], id: string): IdeaRow[] {
  return canRemoveIdea(rows) ? rows.filter((r) => r.id !== id) : rows;
}

export function updateIdeaRow(rows: IdeaRow[], id: string, patch: Partial<Pick<IdeaRow, "text" | "who">>): IdeaRow[] {
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

/**
 * Payload part for `ideas`: blank rows are dropped; `picked` is the index of the picked row
 * among the kept rows (undefined when nothing kept is picked). `rowIds[i]` maps payload item i
 * back to its row, so validation issues land on the right row.
 */
export function ideasPayload(rawRows: unknown, pickedId: unknown): { ideas: { text: string; who: string }[]; picked: number | undefined; rowIds: string[] } {
  const kept = ideaRows(rawRows).filter((r) => !isBlank(r));
  const index = typeof pickedId === "string" ? kept.findIndex((r) => r.id === pickedId) : -1;
  return {
    ideas: kept.map((r) => ({ text: r.text, who: r.who })),
    picked: index >= 0 ? index : undefined,
    rowIds: kept.map((r) => r.id),
  };
}
