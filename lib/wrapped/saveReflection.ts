import { supabase } from "../supabase";
import type { WrappedReflection, ArchetypeId } from "./archetypes";

export interface SaveWrappedReflectionInput {
  enrollment_id: string;
  participant_id: string;
  archetype: ArchetypeId;
  archetype_secondary: ArchetypeId;
  axes: { MM: number; SB: number; PR: number; SQ: number };
  surprise_evidence: string;
  phase1_title: string;
  archetype_fit: "nailed" | "sort_of" | "not_me";
}

/**
 * Save a WrappedReflection to Supabase wrapped_reflections table.
 * Uses upsert so re-taking Wrapped overwrites previous data.
 */
export async function saveWrappedReflection(
  input: SaveWrappedReflectionInput
): Promise<void> {
  const reflection: WrappedReflection = {
    enrollment_id: input.enrollment_id,
    archetype: input.archetype,
    archetype_secondary: input.archetype_secondary,
    axes: input.axes,
    surprise_evidence: input.surprise_evidence,
    phase1_title: input.phase1_title,
    archetype_fit: input.archetype_fit,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("wrapped_reflections")
    .upsert(reflection, {
      onConflict: "enrollment_id,participant_id",
    });

  if (error) {
    console.error("[saveWrappedReflection] Supabase error:", error.message);
    throw new Error(`Failed to save wrapped reflection: ${error.message}`);
  }
}
