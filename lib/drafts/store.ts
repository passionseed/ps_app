/**
 * Generic per-user draft store (A42, spec 5.7), refactored from the companion's
 * `shiftCompanionDrafts.ts` (DailyDraftWriter) and `shiftCompanionRecovery.ts`.
 * Key: `{namespace}:{user_id}:{draft_id}`. Drafts never cross accounts.
 */
import { shiftStorage } from "../shiftStorage";

export type DraftBase = { draft_id: string; user_id: string; created_at: string; updated_at: string };

export type DraftStore<T extends DraftBase> = {
  key: (userId: string, draftId: string) => string;
  get: (userId: string, draftId: string) => Promise<T | null>;
  save: (draft: T) => Promise<void>;
  list: (userId: string) => Promise<T[]>;
  remove: (userId: string, draftId: string) => Promise<void>;
  clearUser: (userId: string) => Promise<number>;
  writer: (userId: string, draftId: string, onState: (state: WriterState) => void) => DraftWriter<T>;
};

export type WriterState = "saving" | "saved" | "failed";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function newDraftId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // RFC4122 v4 fallback for engines without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createDraftStore<T extends DraftBase>(
  namespace: string,
  validate: (value: unknown) => value is T,
): DraftStore<T> {
  const prefix = (userId: string) => `${namespace}:${userId}:`;
  const key = (userId: string, draftId: string) => {
    if (!userId || !ID_PATTERN.test(draftId)) throw new Error("invalid_draft_key");
    return `${prefix(userId)}${draftId}`;
  };
  const parse = (raw: string | null, userId: string, draftId?: string): T | null => {
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as unknown;
      if (!validate(value)) return null;
      if (value.user_id !== userId) return null;
      if (draftId && value.draft_id !== draftId) return null;
      return value;
    } catch {
      return null;
    }
  };
  const store: DraftStore<T> = {
    key,
    async get(userId, draftId) {
      if (!userId) return null;
      return parse(await shiftStorage.getItem(key(userId, draftId)), userId, draftId);
    },
    async save(draft) {
      await shiftStorage.setItem(key(draft.user_id, draft.draft_id), JSON.stringify(draft));
    },
    async list(userId) {
      if (!userId) return [];
      const keys = await shiftStorage.keys(prefix(userId));
      const drafts: T[] = [];
      for (const k of keys) {
        const id = k.slice(prefix(userId).length);
        const draft = parse(await shiftStorage.getItem(k).catch(() => null), userId, id);
        if (draft) drafts.push(draft);
      }
      return drafts.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    async remove(userId, draftId) {
      await shiftStorage.removeItem(key(userId, draftId));
    },
    async clearUser(userId) {
      if (!userId) return 0;
      const keys = await shiftStorage.keys(prefix(userId));
      await Promise.all(keys.map((k) => shiftStorage.removeItem(k)));
      return keys.length;
    },
    writer(userId, draftId, onState) {
      return new DraftWriter<T>(key(userId, draftId), onState);
    },
  };
  return store;
}

/** A serialized writer prevents an older save from winning over a newer edit (from DailyDraftWriter). */
export class DraftWriter<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: string | null = null;
  private tail: Promise<void> = Promise.resolve();
  private generation = 0;
  private stopped = false;
  constructor(
    private readonly storageKey: string,
    private readonly onState: (state: WriterState) => void,
    private readonly delayMs = 400,
  ) {}
  schedule(value: T) {
    if (this.stopped) return;
    this.pending = JSON.stringify(value);
    this.generation++;
    this.onState("saving");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flush().catch(() => {});
    }, this.delayMs);
  }
  /** Write now (used before sending so the frozen attempt survives a kill). */
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.pending === null || this.stopped) return this.tail;
    const value = this.pending;
    const version = this.generation;
    this.pending = null;
    this.tail = this.tail
      .catch(() => {})
      .then(() => shiftStorage.setItem(this.storageKey, value))
      .then(
        () => {
          if (!this.stopped && version === this.generation) this.onState("saved");
        },
        (error) => {
          if (!this.stopped && version === this.generation) this.onState("failed");
          throw error;
        },
      );
    return this.tail;
  }
  /** After a confirmed receipt: stop writing and remove the draft. */
  async confirmReceipt() {
    await this.flush().catch(() => {});
    this.stopped = true;
    await shiftStorage.removeItem(this.storageKey);
  }
  dispose() {
    const result = this.flush();
    this.stopped = true;
    void result.catch(() => {});
  }
}
