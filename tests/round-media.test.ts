import { beforeEach, describe, expect, it, vi } from "vitest";
import * as FileSystem from "expo-file-system/legacy";

const manip = vi.hoisted(() => ({ manipulateAsync: vi.fn() }));
vi.mock("expo-image-manipulator", () => ({ manipulateAsync: manip.manipulateAsync, SaveFormat: { JPEG: "jpeg" } }));
const storageApi = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { storage: { from: (bucket: string) => ({ ...storageApi, bucket }) } } }));

import { mediaPath, prepareDraftPhoto, resizeAction, uploadMedia, MAX_AUDIO_MS } from "../lib/round/media";
import { validateEvidence } from "../lib/round/schema";
import { ROUND_ID, USER_ID } from "./fixtures/round";

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
    expect(out.local_uri.startsWith(`/mock/documents/round-drafts/${DRAFT}/`)).toBe(true);
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({ from: "file:///cache/out.jpg", to: out.local_uri });
    expect(resizeAction(1000, 3000)).toEqual([{ resize: { height: 1600 } }]);
    expect(resizeAction(800, 600)).toEqual([]);
  });

  it("builds the R18 storage path and refuses anything else", () => {
    expect(mediaPath(ROUND_ID, USER_ID, DRAFT, "photo")).toBe(`${ROUND_ID}/${USER_ID}/${DRAFT}/photo.jpg`);
    expect(mediaPath(ROUND_ID, USER_ID, DRAFT, "audio")).toBe(`${ROUND_ID}/${USER_ID}/${DRAFT}/audio.m4a`);
    expect(() => mediaPath("../x", USER_ID, DRAFT, "photo")).toThrow("invalid_media_path");
  });

  it("uploads with upsert false and treats 'already exists' as a landed retry", async () => {
    storageApi.upload.mockResolvedValueOnce({ data: {}, error: null });
    const path = mediaPath(ROUND_ID, USER_ID, DRAFT, "photo");
    expect(await uploadMedia(path, "file:///docs/p.jpg", "photo")).toEqual({ ok: true, bytes: 9 });
    expect(storageApi.upload.mock.calls[0][2]).toEqual({ contentType: "image/jpeg", upsert: false });
    storageApi.upload.mockResolvedValueOnce({ data: null, error: { message: "The resource already exists", statusCode: "409" } });
    expect((await uploadMedia(path, "file:///docs/p.jpg", "photo")).ok).toBe(true);
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
});
