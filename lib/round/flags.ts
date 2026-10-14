/**
 * Remote flags from `public.app_config` (X18, A54, E18). Cached in shiftStorage so an
 * unreadable config falls back to the last known value. Flags are never authorization:
 * the server enforces enrollment, submissions and transcription.
 */
import { supabase } from "../supabase";
import { shiftStorage } from "../shiftStorage";
import { DEFAULT_FLAGS } from "./defaults";
import type { RoundFlags } from "./types";

export { DEFAULT_FLAGS };

export const FLAGS_CACHE_KEY = "round:flags";

const BOOL_KEYS = ["tab_enabled", "enrollment_enabled", "submissions_enabled", "transcription_enabled"] as const;

/** Parses app_config rows (`shift_round.*`) into flags. Unknown keys are ignored. */
export function parseConfigRows(rows: { key: string; value: unknown }[], base: RoundFlags = DEFAULT_FLAGS): RoundFlags {
  const flags: RoundFlags = { ...base };
  for (const row of rows) {
    if (!row.key.startsWith("shift_round.")) continue;
    const name = row.key.slice("shift_round.".length);
    if ((BOOL_KEYS as readonly string[]).includes(name)) {
      if (typeof row.value === "boolean") flags[name as (typeof BOOL_KEYS)[number]] = row.value;
    } else if (name === "emergency_message") {
      const v = row.value;
      flags.emergency_message =
        v && typeof v === "object" && !Array.isArray(v) ? (v as RoundFlags["emergency_message"]) : null;
    } else if (name === "web_base_url" && typeof row.value === "string" && /^https:\/\//.test(row.value)) {
      flags.web_base_url = row.value.replace(/\/+$/, "");
    }
  }
  return flags;
}

export function parseCachedFlags(raw: string | null): RoundFlags | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    return { ...DEFAULT_FLAGS, ...value } as RoundFlags;
  } catch {
    return null;
  }
}

export async function readCachedFlags(): Promise<RoundFlags | null> {
  return parseCachedFlags(await shiftStorage.getItem(FLAGS_CACHE_KEY).catch(() => null));
}

export async function cacheFlags(flags: RoundFlags): Promise<void> {
  await shiftStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify(flags)).catch(() => {});
}

export type FlagsResult = { flags: RoundFlags | null; fromCache: boolean };

/** Remote first, cached second, null when neither is available. */
export async function fetchFlags(): Promise<FlagsResult> {
  try {
    const { data, error } = (await supabase
      .from("app_config")
      .select("key,value")
      .like("key", "shift_round.%")) as { data: { key: string; value: unknown }[] | null; error: unknown };
    if (error || !Array.isArray(data)) throw error ?? new Error("app_config unreadable");
    const flags = parseConfigRows(data);
    await cacheFlags(flags);
    return { flags, fromCache: false };
  } catch {
    return { flags: await readCachedFlags(), fromCache: true };
  }
}
