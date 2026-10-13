import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DailyDraftWriter, editDailyDraft, makeDailyDraft, olderDraftDates, parseDailyDraft, receiptMatches } from "../lib/shiftCompanionDrafts";
import { draftKey, type DailyUpdate } from "../lib/shiftCompanionRules";
const storage = new Map<string, string>();
const mocks = vi.hoisted(() => ({ write: vi.fn(), remove: vi.fn(), read: vi.fn(), keys: vi.fn() }));
vi.mock("../lib/shiftStorage", () => ({ shiftStorage: { setItem: mocks.write, removeItem: mocks.remove, getItem: mocks.read, keys: mocks.keys } }));
beforeEach(() => {
  vi.useFakeTimers(); storage.clear(); vi.clearAllMocks();
  mocks.write.mockImplementation(async (key, value) => { storage.set(key, value); });
  mocks.remove.mockImplementation(async key => { storage.delete(key); });
  mocks.read.mockImplementation(async key => storage.get(key) ?? null);
  mocks.keys.mockImplementation(async prefix => [...storage.keys()].filter(key => key.startsWith(prefix)));
});
afterEach(() => vi.useRealTimers());
const draft = () => ({ ...makeDailyDraft("2026-10-01"), tried: "I tested a prototype", learned: "Short labels help" });
const receipt = (d = draft(), extra: Partial<DailyUpdate> = {}): DailyUpdate => ({
  id: "receipt", author_id: "a", author_name: "You", mine: true, update_date: d.date, tried: d.tried,
  learned: d.learned, help: null, link: null, image_path: d.imagePath, revision: d.expectedRevision + 1,
  edited: false, submitted_at: "2026-10-01T12:01:00Z", updated_at: "2026-10-01T12:01:00Z", ...extra,
});
describe("personal draft delivery", () => {
  it("debounces edits, flushes on exit, and only announces saved after a successful write", async () => {
    const state = vi.fn(); const d = draft(); const key = draftKey("a", "cohort", d.date);
    const writer = new DailyDraftWriter(key, state);
    writer.schedule({ ...d, tried: "first" }); writer.schedule(d);
    expect(state).toHaveBeenLastCalledWith("saving"); expect(mocks.write).not.toHaveBeenCalled();
    await writer.flush(); expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(parseDailyDraft(storage.get(key)!, d.date)?.tried).toBe(d.tried);
    expect(state).toHaveBeenLastCalledWith("saved");
    writer.schedule({ ...d, tried: "leaving" }); writer.dispose();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(JSON.parse(storage.get(key)!).tried).toBe("leaving");
  });
  it("does not erase a pending draft until a receipt is confirmed or recreate it after clearing", async () => {
    const d = draft(); const key = draftKey("a", "cohort", d.date);
    const writer = new DailyDraftWriter(key, vi.fn()); writer.schedule(d); await writer.flush();
    expect(storage.has(key)).toBe(true);
    writer.schedule(d); await writer.confirmReceipt(); await vi.advanceTimersByTimeAsync(1000);
    expect(storage.has(key)).toBe(false); writer.schedule(d); await writer.flush(); expect(storage.has(key)).toBe(false);
  });
  it("reports local storage failure, keeps the draft editable, and can recover on retry", async () => {
    const state = vi.fn(); const d = draft(); const writer = new DailyDraftWriter("key", state);
    mocks.write.mockRejectedValueOnce(new Error("quota")); writer.schedule(d);
    await expect(writer.flush()).rejects.toThrow("quota"); expect(state).toHaveBeenLastCalledWith("failed");
    writer.schedule(d); await writer.flush(); expect(state).toHaveBeenLastCalledWith("saved");
  });
  it("keeps exact retry keys for unchanged content and rotates them for edits", () => {
    const d = draft(); expect(parseDailyDraft(JSON.stringify(d), d.date)?.idempotencyKey).toBe(d.idempotencyKey);
    expect(editDailyDraft(d, { tried: "new" }).idempotencyKey).not.toBe(d.idempotencyKey);
  });
  it("checks receipt author, date, revision and every optional field before clearing", () => {
    const d = draft(); expect(receiptMatches(d, receipt(d), "a")).toBe(true);
    for (const change of [{ author_id: "b" }, { update_date: "2026-10-02" }, { revision: 3 }, { learned: "other" }, { help: "changed" }, { image_path: "other" }, { link: "https://example.com" }]) {
      expect(receiptMatches(d, receipt(d, change), "a")).toBe(false);
    }
  });
  it("recovers older dates only for the same account/cohort without moving their date", async () => {
    for (const [user, cohort, date] of [["a", "c", "2026-09-25"], ["a", "c", "2026-10-01"], ["b", "c", "2026-09-25"], ["a", "other", "2026-09-25"], ["a", "c", "2026-10-02"]]) storage.set(draftKey(user, cohort, date), "{}");
    expect(await olderDraftDates("a", "c", "2026-10-02")).toEqual(["2026-10-01", "2026-09-25"]);
    const d = draft(); expect(parseDailyDraft(JSON.stringify(d), "2026-10-02")).toBeNull();
    expect(parseDailyDraft('{"date":"2026-10-01"}', d.date)).toBeNull();
  });
});
