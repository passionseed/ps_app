/**
 * SHIFT round drafts and frozen submission attempts (spec 5.7, E5, X7, R9).
 * - `draft_id` names the draft and its media folder.
 * - `submission_id` is frozen when the student taps Send and reused for every replay.
 */
import { createDraftStore, newDraftId, type DraftBase } from "../drafts/store";
import type { EvidenceType, ErrorCategory, MediaArg, Receipt } from "./types";
import { EVIDENCE_TYPES } from "./types";

export type AttemptState = "sending" | "unknown" | "retryable" | "failed";

export type Attempt = {
  submission_id: string;
  frozen_payload: Record<string, unknown>;
  frozen_media: MediaArg[];
  payload_hash: string;
  client_created_at: string;
  state: AttemptState;
  error_code?: string | null;
  error_category?: ErrorCategory | null;
  retry_after?: number | null;
  tries: number;
};

export type DraftPhoto = { local_uri: string; consent: boolean; width?: number; height?: number; uploaded_path?: string; uploaded_uri?: string; bytes?: number };
export type DraftAudio = {
  local_uri: string;
  duration_ms: number;
  consent: boolean;
  uploaded_path?: string;
  uploaded_uri?: string;
  bytes?: number;
  transcript?: string;
  segments?: { id: number; start_ms: number; end_ms: number; text: string }[];
  selected?: number[];
};

export type RoundDraft = DraftBase & {
  round_id: string;
  entry_id: string;
  type: EvidenceType;
  fields: Record<string, unknown>;
  photo?: DraftPhoto | null;
  audio?: DraftAudio | null;
  source_evidence_id?: string | null;
  replaces_evidence_id?: string | null;
  attempt?: Attempt | null;
};

export function isRoundDraft(value: unknown): value is RoundDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.draft_id === "string" &&
    typeof d.user_id === "string" &&
    typeof d.round_id === "string" &&
    typeof d.entry_id === "string" &&
    typeof d.created_at === "string" &&
    typeof d.updated_at === "string" &&
    EVIDENCE_TYPES.includes(d.type as EvidenceType) &&
    !!d.fields &&
    typeof d.fields === "object" &&
    !Array.isArray(d.fields)
  );
}

export const roundDrafts = createDraftStore<RoundDraft>("round-draft", isRoundDraft);

export function makeDraft(input: {
  userId: string;
  roundId: string;
  entryId: string;
  type: EvidenceType;
  fields?: Record<string, unknown>;
  sourceEvidenceId?: string | null;
  replacesEvidenceId?: string | null;
  now?: Date;
  draftId?: string;
}): RoundDraft {
  const at = (input.now ?? new Date()).toISOString();
  return {
    draft_id: input.draftId ?? newDraftId(),
    user_id: input.userId,
    round_id: input.roundId,
    entry_id: input.entryId,
    type: input.type,
    fields: input.fields ?? {},
    photo: null,
    audio: null,
    source_evidence_id: input.sourceEvidenceId ?? null,
    replaces_evidence_id: input.replacesEvidenceId ?? null,
    attempt: null,
    created_at: at,
    updated_at: at,
  };
}

/** Stable FNV-1a hash of a JSON value with sorted keys (client-side change detection only). */
export function stableHash(value: unknown): string {
  const json = stableStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** An attempt is "live" while its outcome is unknown or it may still succeed on replay. */
export function isLiveAttempt(attempt: Attempt | null | undefined): boolean {
  return !!attempt && attempt.state !== "failed";
}

/** E5: drafts can be edited unless a live attempt exists. */
export function canEdit(draft: RoundDraft): boolean {
  return !isLiveAttempt(draft.attempt);
}

/**
 * Freezes a submission attempt on Send. If a live attempt already exists it is returned
 * unchanged (duplicate-send guard). A failed attempt is replaced by a new one.
 */
export function freezeAttempt(
  draft: RoundDraft,
  payload: Record<string, unknown>,
  media: MediaArg[],
  now: Date = new Date(),
  newId: () => string = newDraftId,
): RoundDraft {
  if (isLiveAttempt(draft.attempt)) return draft;
  const attempt: Attempt = {
    submission_id: newId(),
    frozen_payload: payload,
    frozen_media: media,
    payload_hash: stableHash({ type: draft.type, payload, media: media.map((m) => m.path).sort() }),
    client_created_at: now.toISOString(),
    state: "sending",
    error_code: null,
    error_category: null,
    retry_after: null,
    tries: 0,
  };
  return { ...draft, attempt, updated_at: now.toISOString() };
}

/**
 * Applies an edit. Editing after Send drops the old attempt only when it failed with a
 * non-retryable code; otherwise the edit waits (returns null) (E5).
 */
export function editDraft(draft: RoundDraft, changes: Partial<Pick<RoundDraft, "fields" | "photo" | "audio" | "source_evidence_id" | "type">>, now: Date = new Date()): RoundDraft | null {
  if (!canEdit(draft)) return null;
  const fields = changes.fields ? { ...draft.fields, ...changes.fields } : draft.fields;
  return { ...draft, ...changes, fields, attempt: null, updated_at: now.toISOString() };
}

const REPLAY_STATES: AttemptState[] = ["sending", "unknown", "retryable"];

/** Drafts whose frozen attempt should be resent with the same submission_id (never auto-send otherwise). */
export function pendingReplays(drafts: RoundDraft[]): RoundDraft[] {
  return drafts.filter((d) => !!d.attempt && REPLAY_STATES.includes(d.attempt.state));
}

/** Maps a failed call to the attempt's next state. */
export function attemptStateFor(category: ErrorCategory): AttemptState {
  if (category === "validation" || category === "forbidden") return "failed";
  if (category === "offline") return "retryable";
  if (category === "retryable") return "unknown";
  return "retryable"; // unavailable / unauthenticated: keep and replay later
}

export type SendOutcome =
  | { kind: "receipt"; receipt: Receipt }
  | { kind: "error"; draft: RoundDraft; code: string; category: ErrorCategory; field: string | null; retry_after: number | null; details: Record<string, unknown> };

export function withAttemptError(
  draft: RoundDraft,
  error: { code: string; category: ErrorCategory; retry_after?: number | null },
): RoundDraft {
  if (!draft.attempt) return draft;
  return {
    ...draft,
    attempt: {
      ...draft.attempt,
      state: attemptStateFor(error.category),
      error_code: error.code,
      error_category: error.category,
      retry_after: error.retry_after ?? null,
      tries: draft.attempt.tries + 1,
    },
  };
}

/**
 * Restores a draft after an app kill (A16, R19): media files live in the document directory;
 * if a file is gone, drop it and tell the composer to show `capture.photo.repick`.
 */
export async function restoreDraftMedia(
  draft: RoundDraft,
  exists: (uri: string) => Promise<boolean>,
): Promise<{ draft: RoundDraft; photoLost: boolean; audioLost: boolean }> {
  let next = draft;
  let photoLost = false;
  let audioLost = false;
  if (draft.photo?.local_uri && !(await exists(draft.photo.local_uri))) {
    next = { ...next, photo: null };
    photoLost = true;
  }
  if (draft.audio?.local_uri && !(await exists(draft.audio.local_uri))) {
    next = { ...next, audio: null };
    audioLost = true;
  }
  return { draft: next, photoLost, audioLost };
}

/**
 * Closing the composer discards a draft only when this session created it and nothing was
 * edited (an opened saved draft is never deleted by just closing it).
 */
export function shouldDiscardOnClose(draft: RoundDraft | null, state: { createdInSession: boolean; dirty: boolean }): boolean {
  return !!draft && state.createdInSession && !state.dirty && !draft.attempt;
}

/**
 * Applies a late result for a recording (upload record, transcript). Returns null when the draft
 * now holds a different recording (a newer one replaced it), so stale results are dropped.
 */
export function applyAudioResult(current: RoundDraft | null, localUri: string, patch: Partial<DraftAudio>): RoundDraft | null {
  if (!current?.audio || current.audio.local_uri !== localUri) return null;
  return editDraft(current, { audio: { ...current.audio, ...patch } });
}
