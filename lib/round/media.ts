/**
 * Evidence media (spec 2.5, 5.6, A10, A16, E6, R18, R19).
 * - Photos are re-encoded (max 1600px long edge, JPEG 0.8), which drops EXIF/GPS.
 * - Files live in the document directory so they survive an app kill.
 * - Upload path: `{round_id}/{user_id}/{draft_id}/photo.jpg | audio.m4a`, `upsert: false`.
 */
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "../supabase";
import type { MediaArg } from "./types";

export const MEDIA_BUCKET = "shift-round-media";
export const MAX_AUDIO_MS = 180_000;
export const MAX_PHOTO_EDGE = 1600;
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

const PATH_PATTERN = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(photo\.jpg|audio\.m4a)$/;

async function quiet(run: () => Promise<unknown> | unknown): Promise<void> {
  try {
    await run();
  } catch {
    // best effort (missing folder, already deleted)
  }
}

export function mediaPath(roundId: string, userId: string, draftId: string, kind: "photo" | "audio"): string {
  const path = `${roundId}/${userId}/${draftId}/${kind === "photo" ? "photo.jpg" : "audio.m4a"}`.toLowerCase();
  if (!PATH_PATTERN.test(path)) throw new Error("invalid_media_path");
  return path;
}

export function isValidMediaPath(path: string): boolean {
  return PATH_PATTERN.test(path);
}

export function draftDir(draftId: string): string {
  return `${FileSystem.documentDirectory ?? ""}round-drafts/${draftId}/`;
}

/** Resize so the long edge is at most 1600px. */
export function resizeAction(width?: number, height?: number): { resize: { width?: number; height?: number } }[] {
  if (!width || !height) return [{ resize: { width: MAX_PHOTO_EDGE } }];
  if (Math.max(width, height) <= MAX_PHOTO_EDGE) return [];
  return width >= height ? [{ resize: { width: MAX_PHOTO_EDGE } }] : [{ resize: { height: MAX_PHOTO_EDGE } }];
}

/** Re-encodes a picked photo and stores it in the draft folder. Returns the durable local uri. */
export async function prepareDraftPhoto(
  draftId: string,
  pickedUri: string,
  size: { width?: number; height?: number } = {},
): Promise<{ local_uri: string; width: number; height: number }> {
  const result = await manipulateAsync(pickedUri, resizeAction(size.width, size.height), {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  const dir = draftDir(draftId);
  await quiet(() => FileSystem.makeDirectoryAsync(dir, { intermediates: true }));
  const target = `${dir}photo-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: result.uri, to: target });
  return { local_uri: target, width: result.width, height: result.height };
}

/** Moves a finished recording into the draft folder (R19). */
export async function persistDraftAudio(draftId: string, recordedUri: string): Promise<string> {
  const dir = draftDir(draftId);
  await quiet(() => FileSystem.makeDirectoryAsync(dir, { intermediates: true }));
  const target = `${dir}audio-${Date.now()}.m4a`;
  await FileSystem.copyAsync({ from: recordedUri, to: target });
  return target;
}

export async function fileExists(uri: string | null | undefined): Promise<boolean> {
  if (!uri) return false;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return !!info.exists;
  } catch {
    return false;
  }
}

export async function deleteDraftMedia(draftId: string): Promise<void> {
  await quiet(() => FileSystem.deleteAsync(draftDir(draftId), { idempotent: true }));
}

export async function deleteAllDraftMedia(): Promise<void> {
  await quiet(() => FileSystem.deleteAsync(`${FileSystem.documentDirectory ?? ""}round-drafts/`, { idempotent: true }));
}

async function readBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type UploadResult = { ok: true; bytes: number } | { ok: false; code: "media_missing" | "offline" | "media_too_large" | "upload_failed" };

/** Uploads with `upsert: false`; an "already exists" answer means a previous try landed. */
export async function uploadMedia(path: string, localUri: string, kind: "photo" | "audio"): Promise<UploadResult> {
  if (!(await fileExists(localUri))) return { ok: false, code: "media_missing" };
  let bytes: Uint8Array;
  try {
    bytes = await readBytes(localUri);
  } catch {
    return { ok: false, code: "media_missing" };
  }
  if (bytes.byteLength > MAX_MEDIA_BYTES) return { ok: false, code: "media_too_large" };
  try {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
      contentType: kind === "photo" ? "image/jpeg" : "audio/mp4",
      upsert: false,
    });
    if (error) {
      const message = String((error as { message?: string }).message ?? "");
      const status = Number((error as { statusCode?: string | number }).statusCode ?? 0);
      if (status === 409 || /already exists|duplicate/i.test(message)) return { ok: true, bytes: bytes.byteLength };
      if (/network|fetch|offline/i.test(message)) return { ok: false, code: "offline" };
      return { ok: false, code: "upload_failed" };
    }
    return { ok: true, bytes: bytes.byteLength };
  } catch {
    return { ok: false, code: "offline" };
  }
}

/** Owner may delete an unbound object while discarding or replacing a draft attachment. */
export async function removeUploaded(path: string): Promise<void> {
  try {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  } catch {
    // best effort; orphans are swept by the purge job
  }
}

export function buildMediaArg(kind: "photo" | "audio", path: string, bytes: number, consent: boolean, durationMs?: number | null): MediaArg {
  return { kind, path, bytes, consent, duration_ms: kind === "audio" ? Math.min(durationMs ?? 0, MAX_AUDIO_MS) : null };
}
