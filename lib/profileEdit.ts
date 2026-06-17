// lib/profileEdit.ts
//
// User-initiated edits to their own profile from the Profile screen:
//   - profile picture  -> Backblaze B2 + profiles.avatar_url
//   - display name     -> profiles.full_name
//   - primary goal     -> career_goals (first row is the displayed "goal")
//
// These intentionally do NOT touch onboarding_state (unlike lib/onboarding.ts
// saveCareers, which advances the onboarding flow). This is post-onboarding editing.

import { supabase } from "./supabase";
import { uploadToBackblaze } from "./backblazeUpload";
import { formatCareerGoalLabel } from "./profileScreenData";
import type { CareerGoal } from "../types/onboarding";

/** Pick a file extension from a picked image asset. */
function avatarFileName(asset: { uri: string; mimeType?: string }): string {
  const ext =
    asset.mimeType?.split("/").pop()?.split("+")[0] ||
    asset.uri.split(".").pop()?.split("?")[0] ||
    "jpg";
  return `avatar.${ext}`;
}

/**
 * Upload a picked image to Backblaze B2 and persist the public CDN URL on
 * profiles.avatar_url. Returns the new URL.
 */
export async function uploadUserAvatar(
  userId: string,
  asset: { uri: string; mimeType?: string },
): Promise<string> {
  const fileName = avatarFileName(asset);
  const result = await uploadToBackblaze(
    asset.uri,
    fileName,
    asset.mimeType ?? "image/jpeg",
    undefined,
    {
      pathPrefix: `users/${userId}/avatars`,
      filePrefix: "avatar",
    },
  );

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: result.url })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  return result.url;
}

/** Update the user's display name (profiles.full_name). */
export async function updateDisplayName(
  userId: string,
  fullName: string,
): Promise<void> {
  const name = fullName.trim();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name.length > 0 ? name : null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Set the user's primary career goal — the one rendered as the profile headline.
 * Rebuilds career_goals with the new goal first, preserving any other goals.
 * An empty goalName clears the primary (keeps the rest).
 */
export async function setPrimaryCareerGoal(
  userId: string,
  goalName: string,
  existing: CareerGoal[],
): Promise<void> {
  const name = goalName.trim();
  const rest = existing.filter(
    (c) => formatCareerGoalLabel(c.career_name).toLowerCase() !== name.toLowerCase(),
  );
  const rows: CareerGoal[] = name
    ? [{ career_name: name, source: "user_typed" }, ...rest]
    : rest;

  const { error: delError } = await supabase
    .from("career_goals")
    .delete()
    .eq("user_id", userId);
  if (delError) throw new Error(delError.message);

  if (rows.length > 0) {
    const { error: insError } = await supabase.from("career_goals").insert(
      rows.map((r) => ({
        user_id: userId,
        career_name: r.career_name,
        source: r.source,
      })),
    );
    if (insError) throw new Error(insError.message);
  }
}
