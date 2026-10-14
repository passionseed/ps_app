import { draftKey, isIsoDate, newIdempotencyKey, type DailyDraftBody, type DailyUpdate } from "./shiftCompanionRules";
import { shiftStorage } from "./shiftStorage";

export type DailyDraft = DailyDraftBody & {
  date: string;
  imagePath: string | null;
  expectedRevision: number;
  idempotencyKey: string;
};

export function makeDailyDraft(date: string, update?: DailyUpdate | null): DailyDraft {
  return { date, tried: update?.tried ?? "", learned: update?.learned ?? "", help: update?.help ?? "",
    link: update?.link ?? "", imagePath: update?.image_path ?? null,
    expectedRevision: update?.revision ?? 0, idempotencyKey: newIdempotencyKey() };
}

export function parseDailyDraft(raw: string | null, date: string): DailyDraft | null {
  if (!raw || !isIsoDate(date)) return null;
  try {
    const d = JSON.parse(raw);
    if (d.date !== date || ![d.tried, d.learned, d.help, d.link, d.idempotencyKey].every(v => typeof v === "string") ||
      !d.idempotencyKey || !Number.isInteger(d.expectedRevision) || d.expectedRevision < 0 ||
      (d.imagePath !== null && typeof d.imagePath !== "string")) return null;
    return d;
  } catch { return null; }
}

export function receiptMatches(draft: DailyDraft, update: DailyUpdate, authorId: string): boolean {
  return update.author_id === authorId && update.update_date === draft.date &&
    update.revision === draft.expectedRevision + 1 && update.tried === draft.tried.trim() &&
    (update.learned ?? "") === draft.learned.trim() && (update.help ?? "") === draft.help.trim() &&
    (update.link ?? "") === draft.link.trim() && update.image_path === draft.imagePath;
}

// Every edit gets a new key. Retrying an unchanged request reuses the persisted key.
export function editDailyDraft(draft: DailyDraft, changes: Partial<DailyDraft>): DailyDraft {
  return { ...draft, ...changes, idempotencyKey: newIdempotencyKey() };
}

export async function olderDraftDates(userId: string, cohortId: string, today: string): Promise<string[]> {
  const prefix = draftKey(userId, cohortId, "");
  return (await shiftStorage.keys(prefix)).map(key => key.slice(prefix.length))
    .filter(date => isIsoDate(date) && date < today).sort().reverse();
}

/** A serialized writer prevents an older save from winning over a newer edit. */
export class DailyDraftWriter {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: string | null = null;
  private tail: Promise<void> = Promise.resolve();
  private generation = 0;
  private stopped = false;
  constructor(private key: string, private onState: (state: "saving" | "saved" | "failed") => void) {}
  schedule(draft: DailyDraft) {
    if (this.stopped) return;
    this.pending = JSON.stringify(draft);
    this.generation++;
    this.onState("saving");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, 400);
  }
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.pending === null || this.stopped) return this.tail;
    const value = this.pending;
    const version = this.generation;
    this.pending = null;
    this.tail = this.tail.catch(() => {}).then(() => shiftStorage.setItem(this.key, value)).then(() => {
      if (!this.stopped && version === this.generation) this.onState("saved");
    }, error => {
      if (!this.stopped && version === this.generation) this.onState("failed");
      throw error;
    });
    return this.tail;
  }
  async confirmReceipt() {
    await this.flush().catch(() => {});
    this.stopped = true;
    await shiftStorage.removeItem(this.key);
  }
  dispose() {
    // Flush before unmount; the captured key belongs to the original account/date.
    const result = this.flush();
    this.stopped = true;
    void result.catch(() => {});
  }
}
