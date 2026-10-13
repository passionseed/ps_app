import type { Lang } from "./types";
/**
 * SHIFT push opt-in and legacy reminder guard (X16, E16, spec 5.5/5.8).
 * - The permission prompt is offered only after the first confirmed receipt ever.
 * - The legacy local daily reminder is cancelled while the user has an upcoming/active entry.
 */
import { supabase } from "../supabase";
import { shiftStorage } from "../shiftStorage";
import {
  cancelAllReminders,
  requestPushPermissions,
  savePushToken,
  setLegacyReminderSuppressed,
} from "../notifications";

const promptKey = (userId: string) => `round:push-prompted:${userId}`;
const receiptKey = (userId: string) => `round:first-receipt:${userId}`;

/** Call after a confirmed receipt. True exactly once per user: show `push.prompt.*`. */
export async function shouldOfferPushPrompt(userId: string): Promise<boolean> {
  if (!userId) return false;
  const [prompted, hadReceipt] = await Promise.all([
    shiftStorage.getItem(promptKey(userId)).catch(() => null),
    shiftStorage.getItem(receiptKey(userId)).catch(() => null),
  ]);
  if (!hadReceipt) await shiftStorage.setItem(receiptKey(userId), "1").catch(() => {});
  return !prompted;
}

export async function markPushPrompted(userId: string): Promise<void> {
  if (userId) await shiftStorage.setItem(promptKey(userId), "1").catch(() => {});
}

/**
 * The student tapped "Turn on". Only now do we call the OS permission prompt (X16).
 * Saves the token with the existing `savePushToken` and turns on `mobile_settings.push_enabled`
 * without scheduling the legacy reminder.
 */
export async function acceptPushPrompt(userId: string): Promise<boolean> {
  await markPushPrompted(userId);
  const token = await requestPushPermissions();
  if (!token) return false;
  try {
    await savePushToken(userId, token);
    const { data } = (await supabase.from("profiles").select("mobile_settings").eq("id", userId).single()) as {
      data: { mobile_settings?: Record<string, unknown> | null } | null;
    };
    const settings = { ...(data?.mobile_settings ?? {}), push_enabled: true };
    await supabase.from("profiles").update({ mobile_settings: settings, shift_round_nudges: true }).eq("id", userId);
  } catch {
    // token saved best effort; the profile toggle can retry
  }
  return true;
}

export async function declinePushPrompt(userId: string): Promise<void> {
  await markPushPrompted(userId);
}

/** E16: no duplicate legacy reminder while a round entry is upcoming/active. */
export async function applyLegacyReminderGuard(activeEntry: boolean): Promise<void> {
  setLegacyReminderSuppressed(activeEntry);
  if (activeEntry) await cancelAllReminders();
}

/** SHIFT language: Thai unless the student picked English inside SHIFT (profiles.shift_round_language). */
export async function readShiftLanguage(userId: string): Promise<Lang> {
  try {
    const { data } = (await supabase.from("profiles").select("shift_round_language").eq("id", userId).single()) as {
      data: { shift_round_language?: string | null } | null;
    };
    return data?.shift_round_language === "en" ? "en" : "th";
  } catch {
    return "th";
  }
}

export async function setShiftLanguage(userId: string, lang: Lang): Promise<boolean> {
  const { error } = await supabase.from("profiles").update({ shift_round_language: lang }).eq("id", userId);
  return !error;
}

export async function readNudgePreference(userId: string): Promise<boolean | null> {
  try {
    const { data, error } = (await supabase.from("profiles").select("shift_round_nudges").eq("id", userId).single()) as {
      data: { shift_round_nudges?: boolean } | null;
      error: unknown;
    };
    if (error || !data) return null;
    return data.shift_round_nudges !== false;
  } catch {
    return null;
  }
}

/** `profiles.shift_round_nudges` opt-out (X12/E16). */
export async function setNudgePreference(userId: string, enabled: boolean): Promise<boolean> {
  const { error } = (await supabase.from("profiles").update({ shift_round_nudges: enabled }).eq("id", userId)) as {
    error: unknown;
  };
  return !error;
}
