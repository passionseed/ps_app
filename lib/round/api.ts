/**
 * Typed client for SHIFT round RPCs (spec 3.1-3.3). Every call goes through `callRound`,
 * which turns PostgREST and transport failures into the X5 error envelope so screens
 * never confuse "server missing" with "not enrolled".
 */
import * as Sentry from "@sentry/react-native";
import { supabase } from "../supabase";
import type {
  Checkpoint,
  ErrorCategory,
  HomeBundle,
  MediaArg,
  PublicCounts,
  Receipt,
  RoundError,
  RoundResult,
  SquadBundle,
  Track,
  WithdrawPreview,
} from "./types";

export type RoundRpc =
  | "shift_round_home"
  | "shift_round_join"
  | "shift_round_set_handle"
  | "shift_round_submit_evidence"
  | "shift_round_withdraw_evidence"
  | "shift_round_submit_checkin"
  | "shift_round_squad"
  | "shift_round_set_icebreaker"
  | "shift_round_send_cheer"
  | "shift_round_submit_summary"
  | "shift_round_set_summary_public"
  | "shift_round_set_certificate_name"
  | "shift_round_log_share"
  | "shift_round_join_waitlist"
  | "shift_round_delete_my_data"
  | "shift_round_transcription_check";

const CATEGORIES: ErrorCategory[] = [
  "validation",
  "unauthenticated",
  "forbidden",
  "unavailable",
  "retryable",
  "offline",
];

export function makeError(
  code: string,
  category: ErrorCategory,
  extra: Partial<RoundError> = {},
): RoundError {
  return {
    code,
    category,
    field: extra.field ?? null,
    retry_after: extra.retry_after ?? null,
    details: extra.details ?? {},
    request_id: extra.request_id ?? null,
  };
}

const NETWORK_PATTERN = /network request failed|failed to fetch|network ?error|load failed|internet connection|offline|ENOTFOUND|ECONNREFUSED/i;
const TIMEOUT_PATTERN = /timeout|timed out|aborted/i;

type PostgrestLikeError = { code?: string; message?: string; status?: number } | null | undefined;

/** Maps a transport/PostgREST failure (not a business envelope) to an X5 error (spec 3.1). */
export function mapTransportError(error: PostgrestLikeError | Error, status?: number): RoundError {
  const err = (error ?? {}) as { code?: string; message?: string; status?: number };
  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : String(error ?? "");
  const httpStatus = status ?? err.status ?? 0;
  if (code === "CONFIG_MISSING") return makeError("unavailable", "unavailable");
  if (httpStatus === 401 || code === "PGRST301" || code === "PGRST302" || code === "PGRST303" || /JWT|not authenticated|invalid claim/i.test(message)) {
    return makeError("unauthenticated", "unauthenticated");
  }
  if (code === "PGRST202" || httpStatus === 404) return makeError("unavailable", "unavailable");
  if (httpStatus === 403 || code === "42501") return makeError("forbidden", "forbidden");
  if (code === "57014" || httpStatus === 408 || httpStatus === 504 || TIMEOUT_PATTERN.test(message)) {
    return makeError("retryable", "retryable");
  }
  if (httpStatus >= 500) return makeError("retryable", "retryable");
  if (NETWORK_PATTERN.test(message) || (httpStatus === 0 && !code && error instanceof Error)) {
    return makeError("offline", "offline");
  }
  // Unexpected SQL error raised by the function: not the student's fault, not "not enrolled".
  return makeError("unavailable", "unavailable", { details: code ? { sql: code } : {} });
}

/** Parses a `{ok, data | error, request_id}` envelope (spec 3.1). */
export function parseEnvelope<T>(raw: unknown): RoundResult<T> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: makeError("unavailable", "unavailable"), request_id: null };
  }
  const env = raw as { ok?: unknown; data?: unknown; error?: unknown; request_id?: unknown };
  const requestId = typeof env.request_id === "string" ? env.request_id : null;
  if (env.ok === true) return { ok: true, data: (env.data ?? {}) as T, request_id: requestId };
  if (env.ok === false && env.error && typeof env.error === "object") {
    const e = env.error as Record<string, unknown>;
    const category = CATEGORIES.includes(e.category as ErrorCategory)
      ? (e.category as ErrorCategory)
      : "validation";
    return {
      ok: false,
      error: makeError(typeof e.code === "string" ? e.code : "unavailable", category, {
        field: typeof e.field === "string" ? e.field : null,
        retry_after: typeof e.retry_after === "number" ? e.retry_after : null,
        details: e.details && typeof e.details === "object" ? (e.details as Record<string, unknown>) : {},
        request_id: requestId,
      }),
      request_id: requestId,
    };
  }
  return { ok: false, error: makeError("unavailable", "unavailable"), request_id: requestId };
}

export async function callRound<T>(
  name: RoundRpc,
  args: Record<string, unknown> = {},
): Promise<RoundResult<T>> {
  let result: RoundResult<T>;
  try {
    const response = (await supabase.rpc(name, args)) as {
      data: unknown;
      error: PostgrestLikeError;
      status?: number;
    };
    if (response.error) {
      const error = mapTransportError(response.error, response.status);
      result = { ok: false, error, request_id: null };
    } else {
      result = parseEnvelope<T>(response.data);
    }
  } catch (thrown) {
    result = { ok: false, error: mapTransportError(thrown as Error), request_id: null };
  }
  try {
    Sentry.addBreadcrumb?.({
      category: "shift_round",
      message: name,
      level: result.ok ? "info" : "warning",
      data: { request_id: result.request_id, code: result.ok ? null : result.error.code },
    });
  } catch {
    // breadcrumbs are best effort
  }
  return result;
}

/** Thrown from React Query query functions so the error envelope survives. */
export class RoundApiError extends Error {
  constructor(public readonly error: RoundError) {
    super(error.code);
    this.name = "RoundApiError";
  }
}

export function unwrap<T>(result: RoundResult<T>): T {
  if (result.ok) return result.data;
  throw new RoundApiError(result.error);
}

export function errorOf(thrown: unknown): RoundError {
  if (thrown instanceof RoundApiError) return thrown.error;
  return mapTransportError(thrown as Error);
}

/** True when the student must sign in again; drafts are kept (E14). */
export function needsSignIn(error: RoundError): boolean {
  return error.category === "unauthenticated";
}

// ---- Student RPCs (3.2) ----

export const roundApi = {
  home: (entryId: string | null = null) =>
    callRound<HomeBundle>("shift_round_home", { p_entry_id: entryId }),
  join: (input: {
    roundId: string;
    track: Track;
    birthMonth: number;
    birthYear: number;
    guardianConsent: boolean;
    handle: string;
  }) =>
    callRound<{ entry_id: string; guardian_required: boolean; already?: boolean }>("shift_round_join", {
      p_round_id: input.roundId,
      p_track: input.track,
      p_birth_month: input.birthMonth,
      p_birth_year: input.birthYear,
      p_guardian_consent: input.guardianConsent,
      p_handle: input.handle,
    }),
  setHandle: (entryId: string, handle: string) =>
    callRound<{ handle: string }>("shift_round_set_handle", { p_entry_id: entryId, p_handle: handle }),
  submitEvidence: (input: {
    entryId: string;
    submissionId: string;
    type: string;
    payload: Record<string, unknown>;
    media: MediaArg[];
    clientCreatedAt: string;
    replacesEvidenceId?: string | null;
  }) =>
    callRound<Receipt>("shift_round_submit_evidence", {
      p_entry_id: input.entryId,
      p_submission_id: input.submissionId,
      p_type: input.type,
      p_payload: input.payload,
      p_media: input.media,
      p_client_created_at: input.clientCreatedAt,
      p_replaces_evidence_id: input.replacesEvidenceId ?? null,
    }),
  withdrawEvidence: (evidenceId: string, dryRun: boolean) =>
    callRound<WithdrawPreview>("shift_round_withdraw_evidence", {
      p_evidence_id: evidenceId,
      p_dry_run: dryRun,
    }),
  submitCheckin: (entryId: string, checkpoint: Checkpoint, answers: Record<string, unknown>) =>
    callRound<{ checkpoint: Checkpoint }>("shift_round_submit_checkin", {
      p_entry_id: entryId,
      p_checkpoint: checkpoint,
      p_answers: answers,
    }),
  squad: (entryId: string) => callRound<SquadBundle>("shift_round_squad", { p_entry_id: entryId }),
  setIcebreaker: (entryId: string, answer: string) =>
    callRound<{ answer: string }>("shift_round_set_icebreaker", { p_entry_id: entryId, p_answer: answer }),
  sendCheer: (entryId: string, toEntryId: string, evidenceId: string | null) =>
    callRound<{ cheer_id: string }>("shift_round_send_cheer", {
      p_entry_id: entryId,
      p_to_entry_id: toEntryId,
      p_evidence_id: evidenceId,
    }),
  submitSummary: (input: {
    entryId: string;
    title: string;
    description: string;
    demoUrl: string | null;
    publicCounts: PublicCounts;
  }) =>
    callRound<{ revision_id: string; revision: number; status: "pending" }>("shift_round_submit_summary", {
      p_entry_id: input.entryId,
      p_title: input.title,
      p_description: input.description,
      p_demo_url: input.demoUrl,
      p_public_counts: input.publicCounts,
    }),
  setSummaryPublic: (entryId: string, isPublic: boolean) =>
    callRound<{ summary_public: boolean }>("shift_round_set_summary_public", {
      p_entry_id: entryId,
      p_public: isPublic,
    }),
  setCertificateName: (certificateId: string, display: "handle" | "legal", legalName: string | null) =>
    callRound<{ display: "handle" | "legal"; render_version: number }>("shift_round_set_certificate_name", {
      p_certificate_id: certificateId,
      p_display: display,
      p_legal_name: legalName,
    }),
  logShare: (
    certificateId: string,
    format: "story" | "square" | "link",
    target: "instagram_story" | "share_sheet" | "copy",
  ) =>
    callRound<Record<string, never>>("shift_round_log_share", {
      p_certificate_id: certificateId,
      p_format: format,
      p_target: target,
    }),
  joinWaitlist: () => callRound<Record<string, never>>("shift_round_join_waitlist", {}),
  deleteMyData: (roundId: string | null, confirm: string) =>
    callRound<{ deleted_entries: number; certificates_revoked: number; deletion_request_id: string | null }>(
      "shift_round_delete_my_data",
      { p_round_id: roundId, p_confirm: confirm },
    ),
  transcriptionCheck: (path: string) =>
    callRound<{ max_seconds: number; language_hint: string | null }>("shift_round_transcription_check", {
      p_path: path,
    }),
};
