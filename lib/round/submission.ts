/**
 * Send and replay of frozen submission attempts (E5, X7, spec 5.7).
 * The same `submission_id` and frozen payload are used for every try; the server returns the
 * original receipt for a replay, which reconciles lost responses.
 */
import { roundApi } from "./api";
import {
  freezeAttempt,
  roundDrafts,
  withAttemptError,
  type RoundDraft,
} from "./drafts";
import { buildMediaArg, mediaPath, removeUploaded, syncDraftMedia, uploadMedia, type MediaDeps } from "./media";
import { validateEvidence, type ValidationIssue } from "./schema";
import type { ErrorCategory, MediaArg, Receipt, RoundResult } from "./types";

export type SendDeps = MediaDeps & {
  submit: typeof roundApi.submitEvidence;
  now: () => Date;
  newId?: () => string;
  /** Persists the draft mid-send (records an upload before it starts). */
  save?: (draft: RoundDraft) => Promise<void>;
};

export const defaultSendDeps: SendDeps = {
  upload: uploadMedia,
  remove: removeUploaded,
  submit: roundApi.submitEvidence,
  now: () => new Date(),
  save: (draft) => roundDrafts.save(draft).catch(() => {}),
};

/** Payload sent to the server for a draft (type-specific shaping of form fields). */
export function payloadFromDraft(draft: RoundDraft): Record<string, unknown> {
  const fields = { ...draft.fields };
  if (draft.type === "change" && draft.source_evidence_id) fields.source_evidence_id = draft.source_evidence_id;
  if ((draft.type === "interview" || draft.type === "tester") && draft.audio?.transcript) {
    fields.transcript = draft.audio.transcript;
    fields.input = "voice";
  } else if (draft.type === "interview" || draft.type === "tester") {
    fields.input = fields.input ?? "text";
  }
  return fields;
}

export function mediaFromDraft(draft: RoundDraft): MediaArg[] {
  const media: MediaArg[] = [];
  if (draft.photo?.local_uri) {
    media.push(buildMediaArg("photo", mediaPath(draft.round_id, draft.user_id, draft.draft_id, "photo"), draft.photo.bytes ?? 0, draft.photo.consent));
  }
  if (draft.audio?.local_uri) {
    media.push(
      buildMediaArg("audio", mediaPath(draft.round_id, draft.user_id, draft.draft_id, "audio"), draft.audio.bytes ?? 0, draft.audio.consent, draft.audio.duration_ms),
    );
  }
  return media;
}

export type FreezeResult = { ok: true; draft: RoundDraft } | { ok: false; issues: ValidationIssue[] };

/** Validates and freezes. A draft that already has a live attempt is returned as is. */
export function prepareSend(
  draft: RoundDraft,
  ctx: { earliestDate?: string; today?: string } = {},
  now: Date = new Date(),
  newId?: () => string,
): FreezeResult {
  if (draft.attempt && draft.attempt.state !== "failed") return { ok: true, draft };
  const payload = payloadFromDraft(draft);
  const media = mediaFromDraft(draft);
  const check = validateEvidence(
    draft.type,
    payload,
    media.map((m) => ({ kind: m.kind, consent: m.consent, duration_ms: m.duration_ms })),
    ctx,
  );
  if (!check.ok) return { ok: false, issues: check.issues };
  return { ok: true, draft: freezeAttempt(draft, check.payload, media, now, newId) };
}

export type SendResult =
  | { kind: "receipt"; draft: RoundDraft; receipt: Receipt }
  | {
      kind: "error";
      draft: RoundDraft;
      code: string;
      category: ErrorCategory;
      field: string | null;
      retry_after: number | null;
      details: Record<string, unknown>;
    };

function failure(draft: RoundDraft, code: string, category: ErrorCategory, extra: Partial<{ field: string | null; retry_after: number | null; details: Record<string, unknown> }> = {}): SendResult {
  return {
    kind: "error",
    draft: withAttemptError(draft, { code, category, retry_after: extra.retry_after ?? null }),
    code,
    category,
    field: extra.field ?? null,
    retry_after: extra.retry_after ?? null,
    details: extra.details ?? {},
  };
}

/** Uploads any media not yet uploaded, then calls submit with the frozen attempt. */
export async function sendAttempt(draft: RoundDraft, deps: SendDeps = defaultSendDeps): Promise<SendResult> {
  const attempt = draft.attempt;
  if (!attempt) throw new Error("no_frozen_attempt");
  let current: RoundDraft = { ...draft, attempt: { ...attempt, state: "sending" } };

  for (const kind of ["photo", "audio"] as const) {
    const item = current[kind];
    const frozen = attempt.frozen_media.find((m) => m.kind === kind);
    if (!item || !frozen) continue;
    const result = await syncDraftMedia(current.draft_id, item, frozen.path, kind, deps, async (recorded) => {
      current = { ...current, [kind]: recorded };
      await deps.save?.(current);
    });
    if (!result.ok) {
      if (result.code === "offline") return failure(current, "offline", "offline");
      if (result.code === "media_missing") return failure(current, "media_missing", "validation", { field: kind });
      if (result.code === "media_too_large") return failure(current, "invalid_field", "validation", { field: kind });
      return failure(current, "retryable", "retryable");
    }
    current = { ...current, [kind]: result.item };
  }

  const media: MediaArg[] = attempt.frozen_media.map((m) => ({ ...m, bytes: current[m.kind]?.bytes ?? m.bytes }));
  current = { ...current, attempt: { ...current.attempt!, frozen_media: media } };

  let result: RoundResult<Receipt>;
  try {
    result = await deps.submit({
      entryId: current.entry_id,
      submissionId: attempt.submission_id,
      type: current.type,
      payload: attempt.frozen_payload,
      media,
      clientCreatedAt: attempt.client_created_at,
      replacesEvidenceId: current.replaces_evidence_id ?? null,
    });
  } catch {
    return failure(current, "retryable", "retryable");
  }
  if (result.ok) return { kind: "receipt", draft: current, receipt: result.data };
  return failure(current, result.error.code, result.error.category, {
    field: result.error.field,
    retry_after: result.error.retry_after,
    details: result.error.details,
  });
}
