import { supabase } from "./supabase";
import type { CompanionStatus, DailyUpdate, PreviewResult, ClaimResult, TodayResult, SaveDailyResult } from "./shiftCompanionRules";
export {
  SHIFT_TIME_ZONE,
  SHIFT_SESSION_LABEL,
  bangkokClock,
  updateWindow,
  normalizeCode,
  normalizeMobile,
  validHttpLink,
  validateDailyBody,
  draftKey,
  newIdempotencyKey,
  allowLoggedOutShiftLink,
  companionEntryTarget,
  formatBangkokDate,
  formatBangkokTime,
  sessionEmailConfirmed,
} from "./shiftCompanionRules";
export type {
  CompanionLang,
  DailyUpdate,
  CompanionCohort,
  CompanionStatus,
  PreviewResult,
  ClaimResult,
  SaveDailyResult,
  TodayResult,
  DailyDraftBody,
} from "./shiftCompanionRules";

export class CompanionServiceError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}
export function requiresCompanionSignIn(error: unknown): boolean {
  return error instanceof CompanionServiceError && (
    ["PGRST301", "PGRST302", "PGRST303"].includes(error.code ?? "") || /jwt.*(expired|invalid)|invalid.*jwt/i.test(error.message)
  );
}

type CompanionResponse = Record<string, unknown>;

async function companionAction(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<CompanionResponse> {
  const { data, error } = await supabase.rpc("shift_companion_action", {
    p_action: action,
    p_payload: payload,
  });
  if (error) throw new CompanionServiceError(error.message, error.code);
  if (!data || typeof data !== "object") throw new Error("The SHIFT service did not respond.");
  return data as CompanionResponse;
}

export async function companionStatus(): Promise<CompanionStatus | null> {
  try {
    const data = await companionAction("status");
    if (data.ok !== true) return null;
    return data as unknown as CompanionStatus;
  } catch (error) {
    // Old deployments can continue using the wider app until this RPC is installed.
    if (error instanceof Error && /shift_companion_action.*(schema cache|does not exist)/i.test(error.message)) return null;
    throw error;
  }
}

export async function previewLinkCode(code: string): Promise<PreviewResult> {
  const data = await companionAction("preview_code", { code });
  return data as unknown as PreviewResult;
}

export async function claimLinkCode(input: {
  code: string;
  email: string;
  countryCode: string;
  mobile: string;
}): Promise<ClaimResult> {
  const data = await companionAction("claim", {
    code: input.code,
    email: input.email,
    country_code: input.countryCode,
    mobile: input.mobile,
  });
  return data as unknown as ClaimResult;
}

export async function loadToday(cohortId: string): Promise<TodayResult> {
  const data = await companionAction("today", { cohort_id: cohortId });
  return data as unknown as TodayResult;
}

export async function loadHistory(cohortId: string, before?: string): Promise<DailyUpdate[]> {
  const data = await companionAction("history", { cohort_id: cohortId, before });
  if (data.ok !== true || !Array.isArray(data.updates)) {
    throw new Error(typeof data.error === "string" ? data.error : "Couldn't load updates.");
  }
  return data.updates as DailyUpdate[];
}

export async function saveDailyUpdate(input: {
  cohortId: string;
  updateDate: string;
  expectedRevision: number;
  idempotencyKey: string;
  tried: string;
  learned: string;
  help: string;
  link: string;
  imagePath: string | null;
}): Promise<SaveDailyResult> {
  const data = await companionAction("save_daily", {
    cohort_id: input.cohortId,
    update_date: input.updateDate,
    expected_revision: input.expectedRevision,
    idempotency_key: input.idempotencyKey,
    tried: input.tried,
    learned: input.learned,
    help: input.help,
    link: input.link,
    image_path: input.imagePath,
  });
  return data as unknown as SaveDailyResult;
}

export async function updateCompanionMobile(input: {
  cohortId: string;
  countryCode: string;
  mobile: string;
}): Promise<{ ok: boolean; error?: string; mobile?: string }> {
  const data = await companionAction("update_contact", {
    cohort_id: input.cohortId,
    country_code: input.countryCode,
    mobile: input.mobile,
  });
  return data as { ok: boolean; error?: string; mobile?: string };
}

export async function requestCompanionEmailChange(userId: string, email: string): Promise<void> {
  const { data: current, error: currentError } = await supabase.auth.getUser();
  if (currentError || current.user?.id !== userId || !current.user.email_confirmed_at) throw new Error("verify_email");
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("email");
  if (current.user.email?.toLowerCase() === normalized) throw new Error("email_unchanged");
  const emailRedirectTo = typeof document !== "undefined" ? `${window.location.origin}/shift/account` : undefined;
  const { data, error } = await supabase.auth.updateUser({ email: normalized }, { emailRedirectTo });
  if (error) throw new Error("email_change_failed");
  if (data.user?.id !== userId) throw new Error("verify_email");
}

export async function syncCompanionEmail(userId: string, requestedEmail?: string): Promise<{ confirmed: boolean; email?: string }> {
  // getUser verifies the identity with Auth; a local session or entered address is not confirmation.
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== userId || !data.user.email_confirmed_at || !data.user.email) throw new Error("verify_email");
  const email = data.user.email.trim().toLowerCase();
  if (requestedEmail && email !== requestedEmail.trim().toLowerCase()) return { confirmed: false };
  const result = await companionAction("sync_contact_email");
  if (result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "network");
  if (result.user_id !== userId || result.email !== email) throw new Error("email_sync_failed");
  // Refresh the cached session after the server-confirmed address change.
  await supabase.auth.refreshSession().catch(() => {});
  return { confirmed: true, email };
}

export async function uploadDailyImage(
  cohortId: string,
  userId: string,
  uri: string,
  mime = "image/jpeg",
): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("image_type");
  const bytes = await (await fetch(uri)).arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error("image_size");
  }
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `daily/${cohortId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("shift-camp")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function sendEmailOtp(email: string, shouldCreateUser = true): Promise<void> {
  const auth = supabase.auth as {
    signInWithOtp?: (args: {
      email: string;
      options?: { shouldCreateUser?: boolean; emailRedirectTo?: string };
    }) => Promise<{ error: { message: string } | null }>;
  };
  if (!auth.signInWithOtp) throw new Error("Email sign-in is unavailable.");
  const emailRedirectTo =
    typeof document !== "undefined" ? `${window.location.origin}/shift/${shouldCreateUser ? "link" : "sign-in"}` : undefined;
  const { error } = await auth.signInWithOtp({
    email,
    options: { shouldCreateUser, emailRedirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function verifyEmailOtp(email: string, token: string): Promise<string> {
  if (!supabase.auth.verifyOtp) throw new Error("Email sign-in is unavailable.");
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw new Error(error.message);
  const verifiedUserId = data.session?.user.id;
  if (!verifiedUserId) throw new Error("Email sign-in did not establish a session.");
  return verifiedUserId;
}
