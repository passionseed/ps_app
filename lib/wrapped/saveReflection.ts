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
  phase2_cycles_run?: number;
  phase2_primary_method?: string;
  phase2_ideas_killed?: number;
  phase2_surprise?: string;
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
    participant_id: input.participant_id,
    archetype: input.archetype,
    archetype_secondary: input.archetype_secondary,
    axes: input.axes,
    surprise_evidence: input.surprise_evidence,
    phase1_title: input.phase1_title,
    archetype_fit: input.archetype_fit,
    phase2_cycles_run: input.phase2_cycles_run,
    phase2_primary_method: input.phase2_primary_method,
    phase2_ideas_killed: input.phase2_ideas_killed,
    phase2_surprise: input.phase2_surprise,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("wrapped_reflections")
    .upsert(reflection, {
      onConflict: "enrollment_id,participant_id",
    });

  if (error) {
    // Gracefully handle missing table (migration not yet applied)
    if (error.message.includes("does not exist")) {
      console.log("[saveWrappedReflection] Table not found — migration may not be applied yet");
      return;
    }
    console.error("[saveWrappedReflection] Supabase error:", error.message);
    throw new Error(`Failed to save wrapped reflection: ${error.message}`);
  }
}

/**
 * Load a saved WrappedReflection for a participant from Supabase.
 * Tries by enrollment_id + participant_id first, then falls back to participant_id alone.
 * Returns null if no reflection exists.
 */
export async function loadSavedWrappedReflection(
  enrollmentId: string | undefined,
  participantId: string
): Promise<WrappedReflection | null> {
  // Try exact match first
  if (enrollmentId) {
    const { data, error } = await supabase
      .from("wrapped_reflections")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (error) {
      // Gracefully handle missing table (migration not yet applied)
      if (error.message.includes("does not exist")) {
        console.log("[loadSavedWrappedReflection] Table not found — migration may not be applied yet");
        return null;
      }
      console.error("[loadSavedWrappedReflection] Supabase error:", error.message);
      throw new Error(`Failed to load wrapped reflection: ${error.message}`);
    }

    if (data) return data as WrappedReflection;
  }

  // Fallback: search by participant_id alone (in case enrollment_id changed or is missing)
  const { data, error } = await supabase
    .from("wrapped_reflections")
    .select("*")
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Gracefully handle missing table (migration not yet applied)
    if (error.message.includes("does not exist")) {
      console.log("[loadSavedWrappedReflection] Table not found — migration may not be applied yet");
      return null;
    }
    console.error("[loadSavedWrappedReflection] Fallback Supabase error:", error.message);
    throw new Error(`Failed to load wrapped reflection: ${error.message}`);
  }

  return data as WrappedReflection | null;
}
