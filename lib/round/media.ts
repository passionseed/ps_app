/**
 * Evidence media (spec 2.5, 5.6, A10, A16, E6, R18, R19).
 * - Photos are re-encoded (max 1600px long edge, JPEG 0.8), which drops EXIF/GPS.
 * - Files live in the document directory so they survive an app kill. Drafts store file names
 *   relative to the draft folder (`photo-123.jpg`); the absolute uri is resolved at read time
 *   because the iOS container path changes across app updates.
 * - Upload path: `{round_id}/{user_id}/{draft_id}/photo.jpg | audio.m4a`, `upsert: false`.
 */
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "../supabase";
import type { RoundDraft } from "./drafts";
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

const isAbsoluteUri = (uri: string) => /^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith("/");

/**
 * Stored form of a draft media uri: the name relative to the draft folder. Legacy absolute
 * uris inside `round-drafts/{draftId}/` are converted; anything else is returned unchanged.
 */
export function draftRelative(draftId: string, uri: string): string;
export function draftRelative(draftId: string, uri: string | undefined): string | undefined;
export function draftRelative(draftId: string, uri: string | undefined): string | undefined {
  if (!uri || !isAbsoluteUri(uri)) return uri;
  const marker = `round-drafts/${draftId}/`;
  const at = uri.lastIndexOf(marker);
  return at >= 0 ? uri.slice(at + marker.length) : uri;
}

/** Absolute uri of a stored draft media uri (relative names resolve against today's draft folder). */
export function resolveDraftUri(draftId: string, stored: string): string {
  const rel = draftRelative(draftId, stored);
  return isAbsoluteUri(rel) ? rel : `${draftDir(draftId)}${rel}`;
}

/** Migrates a draft saved with absolute media uris to relative names (idempotent). */
export function migrateDraftMedia(draft: RoundDraft): RoundDraft {
  const fix = <T extends { local_uri: string; uploaded_uri?: string }>(item: T | null | undefined): T | null | undefined =>
    item
      ? {
          ...item,
          local_uri: draftRelative(draft.draft_id, item.local_uri),
          ...(item.uploaded_uri ? { uploaded_uri: draftRelative(draft.draft_id, item.uploaded_uri) } : {}),
        }
      : item;
  return { ...draft, photo: fix(draft.photo), audio: fix(draft.audio) };
}

/** Resize so the long edge is at most 1600px. */
export function resizeAction(width?: number, height?: number): { resize: { width?: number; height?: number } }[] {
  if (!width || !height) return [{ resize: { width: MAX_PHOTO_EDGE } }];
  if (Math.max(width, height) <= MAX_PHOTO_EDGE) return [];
  return width >= height ? [{ resize: { width: MAX_PHOTO_EDGE } }] : [{ resize: { height: MAX_PHOTO_EDGE } }];
}

/** Re-encodes a picked photo and stores it in the draft folder. `local_uri` is relative to the draft folder. */
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
  const name = `photo-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: result.uri, to: `${dir}${name}` });
  return { local_uri: name, width: result.width, height: result.height };
}

/** Moves a finished recording into the draft folder (R19). Returns the name relative to the draft folder. */
export async function persistDraftAudio(draftId: string, recordedUri: string): Promise<string> {
  const dir = draftDir(draftId);
  await quiet(() => FileSystem.makeDirectoryAsync(dir, { intermediates: true }));
  const name = `audio-${Date.now()}.m4a`;
  await FileSystem.copyAsync({ from: recordedUri, to: `${dir}${name}` });
  return name;
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

export type UploadErrorCode = "media_missing" | "offline" | "media_too_large" | "upload_failed" | "conflict";
export type UploadResult = { ok: true; bytes: number } | { ok: false; code: UploadErrorCode };
export type UploadOptions = {
  /** The draft records that this same local file was already sent to `path` (a lost response). */
  landed?: boolean;
};

const isConflict = (status: number, message: string) => status === 409 || /already exists|duplicate/i.test(message);
const isOffline = (message: string) => /network|fetch|offline/i.test(message);

/**
 * Uploads with `upsert: false`. An "already exists" answer counts as success only when the draft
 * records that this same local file was uploaded before; otherwise it is a `conflict` (an older
 * object sits at the fixed path) and the caller must remove it first.
 */
export async function uploadMedia(path: string, localUri: string, kind: "photo" | "audio", options: UploadOptions = {}): Promise<UploadResult> {
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
      if (isConflict(status, message)) return options.landed ? { ok: true, bytes: bytes.byteLength } : { ok: false, code: "conflict" };
      if (isOffline(message)) return { ok: false, code: "offline" };
      return { ok: false, code: "upload_failed" };
    }
    return { ok: true, bytes: bytes.byteLength };
  } catch {
    return { ok: false, code: "offline" };
  }
}

export type RemoveResult = "ok" | "offline" | "failed";

/**
 * Owner may delete an unbound object while discarding or replacing a draft attachment.
 * Removing a missing object is "ok". Callers that re-upload to the same path must check the result.
 */
export async function removeUploaded(path: string): Promise<RemoveResult> {
  try {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (!error) return "ok";
    return isOffline(String((error as { message?: string }).message ?? "")) ? "offline" : "failed";
  } catch {
    return "offline";
  }
}

type MediaItem = { local_uri: string; uploaded_path?: string; uploaded_uri?: string; bytes?: number };
export type MediaDeps = {
  upload: (path: string, localUri: string, kind: "photo" | "audio", options?: UploadOptions) => Promise<UploadResult>;
  remove: (path: string) => Promise<RemoveResult>;
};
export type SyncResult<T> = { ok: true; item: T } | { ok: false; code: Exclude<UploadErrorCode, "conflict"> };

const removeFailure = (r: RemoveResult) => ({ ok: false as const, code: r === "offline" ? ("offline" as const) : ("upload_failed" as const) });

/**
 * Makes the object at `path` hold exactly `item.local_uri` (paths are fixed per draft, R18).
 * - A different file uploaded earlier is removed first, and the removal must succeed.
 * - The upload intent is recorded (via `persist`) before uploading, so a lost response on a
 *   later try is recognised as "this same file already landed".
 * - An unexpected object at the path (lost record) is removed and the upload retried once.
 */
export async function syncDraftMedia<T extends MediaItem>(
  draftId: string,
  item: T,
  path: string,
  kind: "photo" | "audio",
  deps: MediaDeps,
  persist?: (item: T) => Promise<void> | void,
): Promise<SyncResult<T>> {
  if (item.uploaded_path === path && item.uploaded_uri === item.local_uri && item.bytes) return { ok: true, item };
  let current: T = item;
  if (current.uploaded_path && current.uploaded_uri !== current.local_uri) {
    const removed = await deps.remove(current.uploaded_path);
    if (removed !== "ok") return removeFailure(removed);
    current = { ...current, uploaded_path: undefined, uploaded_uri: undefined, bytes: undefined };
  }
  const landed = current.uploaded_path === path && current.uploaded_uri === current.local_uri;
  if (!landed) {
    current = { ...current, uploaded_path: path, uploaded_uri: current.local_uri, bytes: undefined };
    await persist?.(current);
  }
  const local = resolveDraftUri(draftId, current.local_uri);
  let result = await deps.upload(path, local, kind, { landed });
  if (!result.ok && result.code === "conflict") {
    const removed = await deps.remove(path);
    if (removed !== "ok") return removeFailure(removed);
    result = await deps.upload(path, local, kind, { landed: false });
  }
  if (!result.ok) return { ok: false, code: result.code === "conflict" ? "upload_failed" : result.code };
  return { ok: true, item: { ...current, bytes: result.bytes } };
}

export function buildMediaArg(kind: "photo" | "audio", path: string, bytes: number, consent: boolean, durationMs?: number | null): MediaArg {
  return { kind, path, bytes, consent, duration_ms: kind === "audio" ? Math.min(durationMs ?? 0, MAX_AUDIO_MS) : null };
}
