import { supabase } from "./supabase";
import type { HackathonTeamMembership } from "../types/hackathon-program";

export interface HackathonTeamReflection {
  id: string;
  team_id: string;
  phase_id: string;
  prev_hypothesis: string;
  new_reality: string;
  key_insight: string;
  member_id: string | null;
  created_at: string;
  updated_at?: string;
}


async function getCurrentMembership(): Promise<HackathonTeamMembership | null> {
  const { getCurrentHackathonTeamMembership } = await import("./hackathonProgram");
  return getCurrentHackathonTeamMembership();
}

export async function getTeamReflectionsForPhase(
  phaseId: string,
): Promise<HackathonTeamReflection[]> {
  const membership = await getCurrentMembership();
  if (!membership?.team_id) return [];

  const { data, error } = await supabase
    .from("hackathon_team_reflections")
    .select("*")
    .eq("team_id", membership.team_id)
    .eq("phase_id", phaseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as HackathonTeamReflection[] | null) ?? [];
}

export async function createHackathonTeamReflection(input: {
  phaseId: string;
  prevHypothesis: string;
  newReality: string;
  keyInsight: string;
}) {
  const membership = await getCurrentMembership();
  if (!membership?.team_id) {
    throw new Error("You must join a hackathon team before submitting a reflection.");
  }

  const payload = {
    team_id: membership.team_id,
    phase_id: input.phaseId,
    prev_hypothesis: input.prevHypothesis.trim(),
    new_reality: input.newReality.trim(),
    key_insight: input.keyInsight.trim(),
    member_id: membership.user_id ?? membership.participant_id ?? null,
  };

  const { data, error } = await supabase
    .from("hackathon_team_reflections")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as HackathonTeamReflection;
}
