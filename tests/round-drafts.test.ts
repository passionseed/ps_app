/**
 * Generic draft store (A42, X14). Ports the applicable companion cases from
 * shift-companion-drafts.test.ts and shift-companion-recovery.test.ts to the generic store;
 * companion-only cases (link codes, email OTP, mobile numbers) cover retired features.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const mocks = vi.hoisted(() => ({ write: vi.fn(), remove: vi.fn(), read: vi.fn(), keys: vi.fn() }));
vi.mock("../lib/shiftStorage", () => ({
  shiftStorage: { setItem: mocks.write, removeItem: mocks.remove, getItem: mocks.read, keys: mocks.keys },
}));

import { createDraftStore, DraftWriter, newDraftId } from "../lib/drafts/store";
import {
  applyAudioResult,
  canEdit,
  editDraft,
  freezeAttempt,
  isRoundDraft,
  makeDraft,
  restoreDraftMedia,
  roundDrafts,
  shouldDiscardOnClose,
  type RoundDraft,
} from "../lib/round/drafts";
import { ENTRY_ID, ROUND_ID, USER_ID } from "./fixtures/round";

const OTHER_USER = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  vi.useFakeTimers();
  storage.clear();
  vi.clearAllMocks();
  mocks.write.mockImplementation(async (key: string, value: string) => {
    storage.set(key, value);
  });
  mocks.remove.mockImplementation(async (key: string) => {
    storage.delete(key);
  });
  mocks.read.mockImplementation(async (key: string) => storage.get(key) ?? null);
  mocks.keys.mockImplementation(async (prefix: string) => [...storage.keys()].filter((key) => key.startsWith(prefix)));
});
afterEach(() => {
  vi.useRealTimers();
});

const draft = (over: Partial<RoundDraft> = {}): RoundDraft => ({
  ...makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "interview", now: new Date("2026-11-12T05:00:00Z") }),
  fields: { who_label: "ครู", key_point: "งงว่าส่งไปแล้ว" },
  ...over,
});

describe("generic draft writer (ported from DailyDraftWriter cases)", () => {
  it("debounces edits, flushes on exit, and only announces saved after a successful write", async () => {
    const state = vi.fn();
    const d = draft();
    const key = roundDrafts.key(USER_ID, d.draft_id);
    const writer = new DraftWriter<RoundDraft>(key, state);
    writer.schedule({ ...d, fields: { key_point: "first" } });
    writer.schedule(d);
    expect(state).toHaveBeenLastCalledWith("saving");
    expect(mocks.write).not.toHaveBeenCalled();
    await writer.flush();
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect((await roundDrafts.get(USER_ID, d.draft_id))?.fields).toEqual(d.fields);
    expect(state).toHaveBeenLastCalledWith("saved");
    writer.schedule({ ...d, fields: { key_point: "leaving" } });
    writer.dispose();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(JSON.parse(storage.get(key)!).fields.key_point).toBe("leaving");
  });

  it("does not erase a pending draft until a receipt is confirmed, and never recreates it after", async () => {
    const d = draft();
    const writer = roundDrafts.writer(USER_ID, d.draft_id, vi.fn());
    writer.schedule(d);
    await writer.flush();
    expect(storage.has(roundDrafts.key(USER_ID, d.draft_id))).toBe(true);
    writer.schedule(d);
    await writer.confirmReceipt();
    await vi.advanceTimersByTimeAsync(1000);
    expect(storage.has(roundDrafts.key(USER_ID, d.draft_id))).toBe(false);
    writer.schedule(d);
    await writer.flush();
    expect(storage.has(roundDrafts.key(USER_ID, d.draft_id))).toBe(false);
  });

  it("reports local storage failure, keeps the draft editable, and recovers on retry", async () => {
    const state = vi.fn();
    const d = draft();
    const writer = roundDrafts.writer(USER_ID, d.draft_id, state);
    mocks.write.mockRejectedValueOnce(new Error("quota"));
    writer.schedule(d);
    await expect(writer.flush()).rejects.toThrow("quota");
    expect(state).toHaveBeenLastCalledWith("failed");
    expect(canEdit(d)).toBe(true);
    writer.schedule(d);
    await writer.flush();
    expect(state).toHaveBeenLastCalledWith("saved");
  });

  it("an older save never wins over a newer edit", async () => {
    const d = draft();
    const key = roundDrafts.key(USER_ID, d.draft_id);
    let release: () => void = () => {};
    mocks.write.mockImplementationOnce(
      (k: string, v: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            storage.set(k, v);
            resolve();
          };
        }),
    );
    const writer = roundDrafts.writer(USER_ID, d.draft_id, vi.fn());
    writer.schedule({ ...d, fields: { key_point: "old" } });
    const first = writer.flush();
    writer.schedule({ ...d, fields: { key_point: "new" } });
    const second = writer.flush();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(mocks.write).toHaveBeenCalledTimes(1);
    release();
    await first;
    await second;
    expect(JSON.parse(storage.get(key)!).fields.key_point).toBe("new");
  });
});

describe("draft store recovery (ported from companion recovery cases)", () => {
  it("restores text after an app kill from a fresh store instance", async () => {
    const d = draft();
    await roundDrafts.save(d);
    const reopened = createDraftStore<RoundDraft>("round-draft", isRoundDraft);
    expect(await reopened.get(USER_ID, d.draft_id)).toEqual(d);
  });

  it("keeps drafts per account: another user can neither list nor read them", async () => {
    const mine = draft();
    const theirs = { ...draft(), draft_id: newDraftId(), user_id: OTHER_USER };
    await roundDrafts.save(mine);
    await roundDrafts.save(theirs);
    expect((await roundDrafts.list(USER_ID)).map((x) => x.draft_id)).toEqual([mine.draft_id]);
    expect(await roundDrafts.get(OTHER_USER, mine.draft_id)).toBeNull();
    // A record copied under the wrong account key is refused.
    storage.set(roundDrafts.key(OTHER_USER, mine.draft_id), JSON.stringify(mine));
    expect(await roundDrafts.get(OTHER_USER, mine.draft_id)).toBeNull();
  });

  it("rejects damaged data rather than rendering invented drafts", async () => {
    const d = draft();
    const key = roundDrafts.key(USER_ID, d.draft_id);
    for (const raw of ["not json", "null", "[]", JSON.stringify({ ...d, type: "selfie" }), JSON.stringify({ ...d, fields: [] })]) {
      storage.set(key, raw);
      expect(await roundDrafts.get(USER_ID, d.draft_id)).toBeNull();
    }
    expect(await roundDrafts.list(USER_ID)).toEqual([]);
  });

  it("refuses a shared logged-out identity and malformed ids", async () => {
    expect(await roundDrafts.get("", "abc")).toBeNull();
    expect(await roundDrafts.list("")).toEqual([]);
    expect(() => roundDrafts.key(USER_ID, "../escape")).toThrow("invalid_draft_key");
  });

  it("lists newest first", async () => {
    const a = { ...draft(), draft_id: "a", updated_at: "2026-11-12T01:00:00Z" };
    const b = { ...draft(), draft_id: "b", updated_at: "2026-11-12T03:00:00Z" };
    await roundDrafts.save(a);
    await roundDrafts.save(b);
    expect((await roundDrafts.list(USER_ID)).map((x) => x.draft_id)).toEqual(["b", "a"]);
  });

  it("keeps drafts through sign-out and clears only the requested user (E10)", async () => {
    const mine = draft();
    const theirs = { ...draft(), draft_id: newDraftId(), user_id: OTHER_USER };
    await roundDrafts.save(mine);
    await roundDrafts.save(theirs);
    expect(await roundDrafts.clearUser(USER_ID)).toBe(1);
    expect(await roundDrafts.list(USER_ID)).toEqual([]);
    expect(await roundDrafts.list(OTHER_USER)).toHaveLength(1);
  });

  it("drops a missing photo so the composer asks to re-pick it (A16)", async () => {
    const d = draft({ photo: { local_uri: "file:///docs/round-drafts/x/photo.jpg", consent: true }, audio: { local_uri: "file:///docs/a.m4a", duration_ms: 1000, consent: true } });
    const gone = await restoreDraftMedia(d, async (uri) => !uri.endsWith("photo.jpg"));
    expect(gone.photoLost).toBe(true);
    expect(gone.draft.photo).toBeNull();
    expect(gone.draft.audio?.local_uri).toBe("file:///docs/a.m4a");
    const kept = await restoreDraftMedia(d, async () => true);
    expect(kept).toMatchObject({ photoLost: false, audioLost: false });
  });
});

describe("edits and frozen attempts on drafts (E5)", () => {
  it("keeps the same submission id until an attempt fails, and rotates it for a new send", () => {
    const d = draft();
    const frozen = freezeAttempt(d, { key_point: "x" }, [], new Date("2026-11-12T05:00:00Z"), () => "sub-1");
    expect(freezeAttempt(frozen, { key_point: "changed" }, [], new Date(), () => "sub-2").attempt?.submission_id).toBe("sub-1");
    expect(editDraft(frozen, { fields: { key_point: "edit" } })).toBeNull();
    const failed = { ...frozen, attempt: { ...frozen.attempt!, state: "failed" as const } };
    const edited = editDraft(failed, { fields: { key_point: "edit" } });
    expect(edited?.attempt).toBeNull();
    expect(freezeAttempt(edited!, { key_point: "edit" }, [], new Date(), () => "sub-2").attempt?.submission_id).toBe("sub-2");
  });
});

describe("closing the composer (capture.tsx)", () => {
  const draft = () => makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "contact" });

  it("keeps a saved draft that was only opened and closed", () => {
    expect(shouldDiscardOnClose(draft(), { createdInSession: false, dirty: false })).toBe(false);
  });

  it("discards only an untouched draft created in this session", () => {
    expect(shouldDiscardOnClose(draft(), { createdInSession: true, dirty: false })).toBe(true);
    expect(shouldDiscardOnClose(draft(), { createdInSession: true, dirty: true })).toBe(false);
    const sent = freezeAttempt(draft(), {}, [], new Date(), () => "sub-1");
    expect(shouldDiscardOnClose(sent, { createdInSession: true, dirty: false })).toBe(false);
    expect(shouldDiscardOnClose(null, { createdInSession: true, dirty: false })).toBe(false);
  });
});

describe("late transcription results (capture.tsx)", () => {
  const withAudio = (local: string): RoundDraft => ({
    ...makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "interview" }),
    audio: { local_uri: local, duration_ms: 5000, consent: true },
  });

  it("applies a result to the recording it belongs to, keeping newer edits like consent", () => {
    const next = applyAudioResult(withAudio("audio-1.m4a"), "audio-1.m4a", { transcript: "hello", segments: [], selected: [] });
    expect(next?.audio).toMatchObject({ local_uri: "audio-1.m4a", consent: true, transcript: "hello" });
  });

  it("ignores a result for a recording that was replaced or removed", () => {
    expect(applyAudioResult(withAudio("audio-2.m4a"), "audio-1.m4a", { transcript: "old" })).toBeNull();
    expect(applyAudioResult({ ...withAudio("x"), audio: null }, "audio-1.m4a", { transcript: "old" })).toBeNull();
    expect(applyAudioResult(null, "audio-1.m4a", { transcript: "old" })).toBeNull();
  });
});
