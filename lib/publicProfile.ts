// Data-access + pure helpers for the public passion-identity profile.
//
// Contract with the (separate) 6-Class taxonomy workstream:
//   - reads `public_profiles` for the student's identity state
//   - growth is server-derived via the `public_profile_growth_count` RPC
//     (completed quests), NOT raw client-side user_events which are
//     duplicatable and fail-silent
//   - Class/Subclass/Path labels for display come from the taxonomy content;
//     until that exists, the profile renders the SEEDLING state
//
// Migration that creates `public_profiles` + the RPC lives in the pseed repo
// (supabase/migrations is a symlink to ../pseed). See ET1/ET2 in the plan.

import { supabase } from "./supabase";
import type {
  IdentityStage,
  PublicProfile,
  PublishableSection,
} from "../types/publicProfile";

/** Fetch a user's public profile row. Returns null when none exists yet. */
export async function getPublicProfile(
  userId: string,
): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Surface to the caller as "load failed" — do NOT collapse into seedling.
    throw error;
  }
  return (data as PublicProfile | null) ?? null;
}

/**
 * Derive the identity render state from the profile row.
 *
 * A missing row (null) and a row without a class both mean the student has not
 * picked a class yet => seedling. Load failures throw in getPublicProfile and
 * never reach here, so seedling here always means genuine user state.
 */
export function deriveIdentityStage(
  profile: PublicProfile | null,
): IdentityStage {
  return profile?.class_slug ? "revealed" : "seedling";
}

/**
 * Server-derived growth (completed quests). Falls back to 0 on RPC failure so
 * the surface degrades to "0 seeds deep — start" rather than crashing. Never
 * trust a client tally for this — it must come from the server.
 */
export async function fetchGrowthCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc(
      "public_profile_growth_count",
      { p_user_id: userId },
    );
    if (error) return 0;
    const n = typeof data === "number" ? data : Number(data);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/**
 * The "Becoming" statement — one expressive identity line built from the
 * Class -> Subclass -> Path evolution chain. Null-safe across every partial
 * state; returns null only in the seedling state (no class yet), where the UI
 * shows the invitation copy instead.
 *
 * Examples (en):
 *   class+subclass+path -> "An AI Builder becoming an AI Product Engineer"
 *   class+subclass      -> "Exploring as an AI Builder"
 *   class only          -> "A new Builder"
 *   none                -> null
 */
export function buildBecomingLine(
  profile: Pick<
    PublicProfile,
    "class_slug" | "subclass_slug" | "current_path"
  > | null,
  labels: {
    className?: string;
    subclassName?: string;
    pathName?: string;
  } = {},
  isThai = false,
): string | null {
  if (!profile?.class_slug) return null;

  const className = labels.className ?? titleize(profile.class_slug);
  const subclass = profile.subclass_slug
    ? labels.subclassName ?? titleize(profile.subclass_slug)
    : null;
  const path = profile.current_path
    ? labels.pathName ?? titleize(profile.current_path)
    : null;

  if (isThai) {
    if (subclass && path) return `${subclass} กำลังก้าวสู่ ${path}`;
    if (subclass) return `กำลังสำรวจในสาย ${subclass}`;
    return `${className} หน้าใหม่`;
  }

  if (subclass && path) return `${withArticle(subclass)} becoming ${withArticle(path)}`;
  if (subclass) return `Exploring as ${withArticle(subclass)}`;
  return `A new ${className}`;
}

/** Whether a section should appear on the public viewer. */
export function isSectionPublished(
  profile: Pick<PublicProfile, "is_public" | "published_sections"> | null,
  section: PublishableSection,
): boolean {
  if (!profile?.is_public) return false;
  return profile.published_sections.includes(section);
}

// --- small pure helpers -----------------------------------------------------

function titleize(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function withArticle(noun: string): string {
  const an = /^[aeiou]/i.test(noun.trim());
  return `${an ? "an" : "a"} ${noun}`;
}
