import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import * as FileSystem from "expo-file-system/legacy";

const manip = vi.hoisted(() => ({ manipulateAsync: vi.fn() }));
vi.mock("expo-image-manipulator", () => ({ manipulateAsync: manip.manipulateAsync, SaveFormat: { JPEG: "jpeg" } }));
const storageApi = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { storage: { from: (bucket: string) => ({ ...storageApi, bucket }) } } }));

import {
  draftRelative,
  mediaPath,
  migrateDraftMedia,
  prepareDraftPhoto,
  removeUploaded,
  resizeAction,
  resolveDraftUri,
  syncDraftMedia,
  uploadMedia,
  MAX_AUDIO_MS,
  type MediaDeps,
} from "../lib/round/media";
import { makeDraft } from "../lib/round/drafts";
import { validateEvidence } from "../lib/round/schema";
import { ENTRY_ID, ROUND_ID, USER_ID } from "./fixtures/round";

const DRAFT = "77777777-7777-4777-8777-777777777777";

beforeEach(() => {
  vi.clearAllMocks();
  manip.manipulateAsync.mockResolvedValue({ uri: "file:///cache/out.jpg", width: 1600, height: 1200 });
  vi.mocked(FileSystem.copyAsync).mockResolvedValue(undefined);
  vi.mocked(FileSystem.makeDirectoryAsync).mockResolvedValue(undefined);
  vi.mocked(FileSystem.getInfoAsync).mockResolvedValue({ exists: true } as never);
  vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue(btoa("jpegbytes"));
});

describe("evidence media (E6, A10, R18, R19)", () => {
  it("re-encodes photos to max 1600px JPEG 0.8 (drops EXIF) into the document directory", async () => {
    const out = await prepareDraftPhoto(DRAFT, "file:///picked/IMG_1.HEIC", { width: 4032, height: 3024 });
    expect(manip.manipulateAsync).toHaveBeenCalledWith("file:///picked/IMG_1.HEIC", [{ resize: { width: 1600 } }], { compress: 0.8, format: "jpeg" });
    expect(out.local_uri).toMatch(/^photo-\d+\.jpg$/);
    expect(resolveDraftUri(DRAFT, out.local_uri)).toBe(`/mock/documents/round-drafts/${DRAFT}/${out.local_uri}`);
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({ from: "file:///cache/out.jpg", to: resolveDraftUri(DRAFT, out.local_uri) });
    expect(resizeAction(1000, 3000)).toEqual([{ resize: { height: 1600 } }]);
    expect(resizeAction(800, 600)).toEqual([]);
  });

  it("builds the R18 storage path and refuses anything else", () => {
    expect(mediaPath(ROUND_ID, USER_ID, DRAFT, "photo")).toBe(`${ROUND_ID}/${USER_ID}/${DRAFT}/photo.jpg`);
    expect(mediaPath(ROUND_ID, USER_ID, DRAFT, "audio")).toBe(`${ROUND_ID}/${USER_ID}/${DRAFT}/audio.m4a`);
    expect(() => mediaPath("../x", USER_ID, DRAFT, "photo")).toThrow("invalid_media_path");
  });

  it("uploads with upsert false; 'already exists' is success only when this file is recorded as landed", async () => {
    storageApi.upload.mockResolvedValueOnce({ data: {}, error: null });
    const path = mediaPath(ROUND_ID, USER_ID, DRAFT, "photo");
    expect(await uploadMedia(path, "file:///docs/p.jpg", "photo")).toEqual({ ok: true, bytes: 9 });
    expect(storageApi.upload.mock.calls[0][2]).toEqual({ contentType: "image/jpeg", upsert: false });
    const exists = { data: null, error: { message: "The resource already exists", statusCode: "409" } };
    storageApi.upload.mockResolvedValueOnce(exists);
    expect(await uploadMedia(path, "file:///docs/p.jpg", "photo", { landed: true })).toEqual({ ok: true, bytes: 9 });
    storageApi.upload.mockResolvedValueOnce(exists);
    expect(await uploadMedia(path, "file:///docs/p.jpg", "photo")).toEqual({ ok: false, code: "conflict" });
    vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({ exists: false } as never);
    expect(await uploadMedia(path, "file:///docs/gone.jpg", "photo")).toEqual({ ok: false, code: "media_missing" });
  });

  it("requires consent for photo and audio, and caps audio at 180 s", () => {
    const payload = { who_label: "ครู", occurred_on: "2026-11-12", key_point: "x" };
    expect(validateEvidence("interview", payload, [{ kind: "photo", consent: false }])).toMatchObject({ ok: false, issues: [{ code: "photo_consent_required" }] });
    expect(validateEvidence("interview", payload, [{ kind: "audio", consent: false }])).toMatchObject({ ok: false, issues: [{ code: "audio_consent_required" }] });
    expect(validateEvidence("interview", payload, [{ kind: "audio", consent: true, duration_ms: MAX_AUDIO_MS }]).ok).toBe(true);
    expect(validateEvidence("interview", payload, [{ kind: "audio", consent: true, duration_ms: MAX_AUDIO_MS + 1 }]).ok).toBe(false);
  });

  it("removeUploaded reports whether the object is gone", async () => {
    storageApi.remove.mockResolvedValueOnce({ data: [], error: null });
    expect(await removeUploaded("a/b")).toBe("ok");
    storageApi.remove.mockResolvedValueOnce({ data: null, error: { message: "permission denied" } });
    expect(await removeUploaded("a/b")).toBe("failed");
    storageApi.remove.mockResolvedValueOnce({ data: null, error: { message: "Network request failed" } });
    expect(await removeUploaded("a/b")).toBe("offline");
  });
});

describe("replacing an uploaded file (fixed path per draft)", () => {
  const path = mediaPath(ROUND_ID, USER_ID, DRAFT, "photo");
  const mediaDeps = (over: { upload?: Mock<MediaDeps["upload"]>; remove?: Mock<MediaDeps["remove"]> } = {}) => ({
    upload: over.upload ?? vi.fn<MediaDeps["upload"]>().mockResolvedValue({ ok: true, bytes: 50 }),
    remove: over.remove ?? vi.fn<MediaDeps["remove"]>().mockResolvedValue("ok"),
  });

  it("removes the old object (checked) before uploading a replaced photo", async () => {
    const d = mediaDeps();
    const persisted: unknown[] = [];
    const item = { local_uri: "photo-2.jpg", uploaded_path: path, uploaded_uri: "photo-1.jpg", bytes: 40 };
    const out = await syncDraftMedia(DRAFT, item, path, "photo", d, (i) => void persisted.push(i));
    expect(d.remove).toHaveBeenCalledWith(path);
    expect(d.remove.mock.invocationCallOrder[0]).toBeLessThan(d.upload.mock.invocationCallOrder[0]);
    expect(d.upload).toHaveBeenCalledWith(path, `/mock/documents/round-drafts/${DRAFT}/photo-2.jpg`, "photo", { landed: false });
    expect(persisted).toEqual([{ local_uri: "photo-2.jpg", uploaded_path: path, uploaded_uri: "photo-2.jpg", bytes: undefined }]);
    expect(out).toEqual({ ok: true, item: { local_uri: "photo-2.jpg", uploaded_path: path, uploaded_uri: "photo-2.jpg", bytes: 50 } });
  });

  it("does not upload when removing the old object fails", async () => {
    const d = mediaDeps({ remove: vi.fn<MediaDeps["remove"]>().mockResolvedValue("failed") });
    const item = { local_uri: "photo-2.jpg", uploaded_path: path, uploaded_uri: "photo-1.jpg", bytes: 40 };
    expect(await syncDraftMedia(DRAFT, item, path, "photo", d)).toEqual({ ok: false, code: "upload_failed" });
    expect(d.upload).not.toHaveBeenCalled();
    const off = mediaDeps({ remove: vi.fn<MediaDeps["remove"]>().mockResolvedValue("offline") });
    expect(await syncDraftMedia(DRAFT, item, path, "photo", off)).toEqual({ ok: false, code: "offline" });
  });

  it("accepts 'already exists' only for the recorded file; an unknown object is removed and retried once", async () => {
    // Recorded as landed (lost response): 409 is success, nothing is removed.
    const landed = mediaDeps({ upload: vi.fn<MediaDeps["upload"]>().mockResolvedValue({ ok: true, bytes: 50 }) });
    await syncDraftMedia(DRAFT, { local_uri: "photo-1.jpg", uploaded_path: path, uploaded_uri: "photo-1.jpg" }, path, "photo", landed);
    expect(landed.upload).toHaveBeenCalledWith(path, expect.any(String), "photo", { landed: true });
    expect(landed.remove).not.toHaveBeenCalled();

    // Not recorded: the object at the path is someone else's bytes (e.g. an old photo).
    const upload = vi.fn<MediaDeps["upload"]>().mockResolvedValueOnce({ ok: false, code: "conflict" }).mockResolvedValueOnce({ ok: true, bytes: 70 });
    const d = mediaDeps({ upload });
    const out = await syncDraftMedia(DRAFT, { local_uri: "photo-3.jpg" }, path, "photo", d);
    expect(d.remove).toHaveBeenCalledWith(path);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(out).toMatchObject({ ok: true, item: { uploaded_uri: "photo-3.jpg", bytes: 70 } });

    const stuck = mediaDeps({ upload: vi.fn<MediaDeps["upload"]>().mockResolvedValue({ ok: false, code: "conflict" }) });
    expect(await syncDraftMedia(DRAFT, { local_uri: "photo-3.jpg" }, path, "photo", stuck)).toEqual({ ok: false, code: "upload_failed" });
  });

  it("skips files already uploaded", async () => {
    const d = mediaDeps();
    const item = { local_uri: "photo-1.jpg", uploaded_path: path, uploaded_uri: "photo-1.jpg", bytes: 40 };
    expect(await syncDraftMedia(DRAFT, item, path, "photo", d)).toEqual({ ok: true, item });
    expect(d.upload).not.toHaveBeenCalled();
  });
});

describe("draft media uris survive a container path change (iOS app update)", () => {
  it("stores names relative to the draft folder and resolves them at read time", () => {
    expect(resolveDraftUri(DRAFT, "audio-1.m4a")).toBe(`/mock/documents/round-drafts/${DRAFT}/audio-1.m4a`);
    const old = `file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/round-drafts/${DRAFT}/photo-1.jpg`;
    expect(draftRelative(DRAFT, old)).toBe("photo-1.jpg");
    expect(resolveDraftUri(DRAFT, old)).toBe(`/mock/documents/round-drafts/${DRAFT}/photo-1.jpg`);
    expect(resolveDraftUri(DRAFT, "file:///elsewhere/p.jpg")).toBe("file:///elsewhere/p.jpg");
  });

  it("migrates legacy drafts with absolute uris (idempotent)", () => {
    const old = (name: string) => `file:///var/mobile/OLD/Documents/round-drafts/${DRAFT}/${name}`;
    const draft = {
      ...makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "interview", draftId: DRAFT }),
      photo: { local_uri: old("photo-1.jpg"), consent: true, uploaded_uri: old("photo-1.jpg"), uploaded_path: "x" },
      audio: { local_uri: old("audio-1.m4a"), duration_ms: 1000, consent: true },
    };
    const migrated = migrateDraftMedia(draft);
    expect(migrated.photo).toMatchObject({ local_uri: "photo-1.jpg", uploaded_uri: "photo-1.jpg", uploaded_path: "x" });
    expect(migrated.audio).toMatchObject({ local_uri: "audio-1.m4a" });
    expect(migrated.audio).not.toHaveProperty("uploaded_uri");
    expect(migrateDraftMedia(migrated)).toEqual(migrated);
  });
});
