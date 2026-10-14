import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.mock("../lib/shiftStorage", () => ({
  shiftStorage: {
    getItem: async (k: string) => storage.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: async (k: string) => {
      storage.delete(k);
    },
    keys: async (p: string) => [...storage.keys()].filter((k) => k.startsWith(p)),
  },
}));
vi.mock("../lib/supabase", () => ({ supabase: { rpc: vi.fn(), storage: { from: () => ({}) } } }));
vi.mock("expo-image-manipulator", () => ({ manipulateAsync: vi.fn(), SaveFormat: { JPEG: "jpeg" } }));

import { makeDraft, pendingReplays, roundDrafts, type RoundDraft } from "../lib/round/drafts";
import { replayPending, sendDraft } from "../lib/round/sender";
import { prepareSend, sendAttempt, type SendDeps } from "../lib/round/submission";
import type { Receipt, RoundResult } from "../lib/round/types";
import { counts, ENTRY_ID, ROUND_ID, USER_ID } from "./fixtures/round";

const receipt = (over: Partial<Receipt> = {}): Receipt => ({
  evidence_id: "ev-1",
  submission_id: "sub-1",
  submitted_at: "2026-11-12T05:00:01Z",
  replayed: false,
  counted: true,
  after_close: false,
  duplicate_label: false,
  missions: counts({ ideas: { ideas: 1 } }),
  newly_completed: ["ideas"],
  ...over,
});

function deps(results: RoundResult<Receipt>[]): SendDeps & { submit: ReturnType<typeof vi.fn>; upload: ReturnType<typeof vi.fn> } {
  const submit = vi.fn();
  for (const r of results) submit.mockResolvedValueOnce(r);
  return {
    submit,
    upload: vi.fn().mockResolvedValue({ ok: true, bytes: 1234 }),
    remove: vi.fn().mockResolvedValue("ok"),
    now: () => new Date("2026-11-12T05:00:00Z"),
  } as never;
}

const contactDraft = (): RoundDraft => ({
  ...makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "contact", draftId: "66666666-6666-4666-8666-666666666666" }),
  fields: { who_label: "ครู", channel: "chat", occurred_on: "2026-11-12" },
});

const offline = { ok: false as const, error: { code: "offline", category: "offline" as const, field: null, retry_after: null, details: {}, request_id: null }, request_id: null };
const retryable = { ok: false as const, error: { code: "retryable", category: "retryable" as const, field: null, retry_after: null, details: {}, request_id: null }, request_id: null };

beforeEach(() => storage.clear());

describe("frozen submission attempts (E5, X7)", () => {
  it("freezes the attempt on Send with a submission id, payload and client time", () => {
    const result = prepareSend(contactDraft(), {}, new Date("2026-11-12T05:00:00Z"), () => "sub-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.attempt).toMatchObject({
      submission_id: "sub-1",
      frozen_payload: { who_label: "ครู", channel: "chat", occurred_on: "2026-11-12" },
      client_created_at: "2026-11-12T05:00:00.000Z",
      state: "sending",
    });
  });

  it("returns field issues instead of freezing an invalid draft", () => {
    const result = prepareSend({ ...contactDraft(), fields: { who_label: "0812345678", channel: "chat", occurred_on: "2026-11-12" } });
    expect(result).toMatchObject({ ok: false, issues: [{ code: "invalid_field", field: "who_label", rule: "personal_data" }] });
  });

  it("an edit after a failed send creates a new attempt; a live attempt blocks edits", () => {
    const first = prepareSend(contactDraft(), {}, new Date(), () => "sub-1");
    if (!first.ok) throw new Error("expected ok");
    const again = prepareSend(first.draft, {}, new Date(), () => "sub-2");
    expect(again.ok && again.draft.attempt?.submission_id).toBe("sub-1");
    const failed = { ...first.draft, attempt: { ...first.draft.attempt!, state: "failed" as const } };
    const next = prepareSend({ ...failed, fields: { ...failed.fields, channel: "call" } }, {}, new Date(), () => "sub-2");
    expect(next.ok && next.draft.attempt?.submission_id).toBe("sub-2");
  });

  it("replays the same id and frozen payload after an unknown outcome, reconciling via the original receipt", async () => {
    const frozen = prepareSend(contactDraft(), {}, new Date(), () => "sub-1");
    if (!frozen.ok) throw new Error("expected ok");
    const d = deps([retryable, { ok: true, data: receipt({ replayed: true }), request_id: "r" }]);
    const first = await sendAttempt(frozen.draft, d);
    expect(first.kind).toBe("error");
    expect(first.draft.attempt?.state).toBe("unknown");
    expect(pendingReplays([first.draft])).toHaveLength(1);
    const second = await sendAttempt(first.draft, d);
    expect(second.kind).toBe("receipt");
    expect(d.submit.mock.calls[0][0]).toEqual(d.submit.mock.calls[1][0]);
    expect(d.submit.mock.calls[0][0]).toMatchObject({ submissionId: "sub-1", clientCreatedAt: frozen.draft.attempt!.client_created_at });
  });

  it("marks validation failures as failed (not replayed) and offline as retryable", async () => {
    const frozen = prepareSend(contactDraft(), {}, new Date(), () => "sub-1");
    if (!frozen.ok) throw new Error("expected ok");
    const conflict = { ok: false as const, error: { code: "submission_conflict", category: "validation" as const, field: null, retry_after: null, details: {}, request_id: null }, request_id: null };
    const failed = await sendAttempt(frozen.draft, deps([conflict]));
    expect(failed.draft.attempt?.state).toBe("failed");
    expect(pendingReplays([failed.draft])).toHaveLength(0);
    const off = await sendAttempt(frozen.draft, deps([offline]));
    expect(off.draft.attempt?.state).toBe("retryable");
  });

  it("uploads media once to the draft path and reuses it on replay", async () => {
    const withPhoto: RoundDraft = { ...contactDraft(), photo: { local_uri: "file:///docs/p.jpg", consent: true } };
    const frozen = prepareSend(withPhoto, {}, new Date(), () => "sub-1");
    if (!frozen.ok) throw new Error("expected ok");
    const d = deps([retryable, { ok: true, data: receipt(), request_id: null }]);
    const first = await sendAttempt(frozen.draft, d);
    expect(d.upload).toHaveBeenCalledWith(`${ROUND_ID}/${USER_ID}/66666666-6666-4666-8666-666666666666/photo.jpg`, "file:///docs/p.jpg", "photo", { landed: false });
    await sendAttempt(first.draft, d);
    expect(d.upload).toHaveBeenCalledTimes(1);
    expect(d.submit.mock.calls[1][0].media).toEqual([
      { kind: "photo", path: `${ROUND_ID}/${USER_ID}/66666666-6666-4666-8666-666666666666/photo.jpg`, bytes: 1234, consent: true, duration_ms: null },
    ]);
  });

  it("never submits a replaced photo as the old one", async () => {
    const path = `${ROUND_ID}/${USER_ID}/66666666-6666-4666-8666-666666666666/photo.jpg`;
    // The old photo was uploaded (e.g. a failed attempt); the student then picked a new one.
    const replaced: RoundDraft = {
      ...contactDraft(),
      photo: { local_uri: "photo-2.jpg", consent: true, uploaded_path: path, uploaded_uri: "photo-1.jpg", bytes: 10 },
    };
    const frozen = prepareSend(replaced, {}, new Date(), () => "sub-1");
    if (!frozen.ok) throw new Error("expected ok");

    const blocked = deps([{ ok: true, data: receipt(), request_id: null }]);
    blocked.remove = vi.fn().mockResolvedValue("failed");
    const failed = await sendAttempt(frozen.draft, blocked);
    expect(failed.kind).toBe("error");
    expect(blocked.upload).not.toHaveBeenCalled();
    expect(blocked.submit).not.toHaveBeenCalled();

    const d = deps([{ ok: true, data: receipt(), request_id: null }]);
    const saved: RoundDraft[] = [];
    d.save = async (draft) => void saved.push(draft);
    d.upload.mockResolvedValueOnce({ ok: true, bytes: 99 });
    const ok = await sendAttempt(frozen.draft, d);
    expect(d.remove).toHaveBeenCalledWith(path);
    expect(d.upload).toHaveBeenCalledWith(path, "/mock/documents/round-drafts/66666666-6666-4666-8666-666666666666/photo-2.jpg", "photo", { landed: false });
    // The upload intent is saved before uploading, so a lost response is recognised on replay.
    expect(saved[0].photo).toMatchObject({ uploaded_path: path, uploaded_uri: "photo-2.jpg" });
    expect(ok.kind).toBe("receipt");
    expect(ok.draft.photo).toMatchObject({ uploaded_uri: "photo-2.jpg", bytes: 99 });
  });

  it("deletes the draft after a confirmed receipt and keeps it otherwise; one send per draft at a time", async () => {
    const frozen = prepareSend(contactDraft(), {}, new Date(), () => "sub-1");
    if (!frozen.ok) throw new Error("expected ok");
    const d = deps([offline]);
    const [a, b] = await Promise.all([sendDraft(frozen.draft, d), sendDraft(frozen.draft, d)]);
    expect(a).toBe(b);
    expect(d.submit).toHaveBeenCalledTimes(1);
    expect(await roundDrafts.get(USER_ID, frozen.draft.draft_id)).toMatchObject({ attempt: { state: "retryable" } });
    const ok = deps([{ ok: true, data: receipt({ replayed: true }), request_id: null }]);
    const results = await replayPending(USER_ID, ok);
    expect(results.map((r) => r.kind)).toEqual(["receipt"]);
    expect(await roundDrafts.get(USER_ID, frozen.draft.draft_id)).toBeNull();
  });

  it("never auto-sends a draft without a frozen attempt", async () => {
    await roundDrafts.save(contactDraft());
    const d = deps([]);
    expect(await replayPending(USER_ID, d)).toEqual([]);
    expect(d.submit).not.toHaveBeenCalled();
  });
});
