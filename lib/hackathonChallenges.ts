import { supabase } from "./supabase";
import type {
  HackathonChallenge,
  HackathonTeamProgramEnrollment,
  HackathonTrack,
} from "../types/hackathon-program";


export async function getHackathonTracksWithChallenges(): Promise<HackathonTrack[]> {

  const { data, error } = await supabase
    .from("hackathon_tracks")
    .select(`
      *,
      hackathon_challenges (*)
    `)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as Array<HackathonTrack & { hackathon_challenges?: HackathonChallenge[] }>) ?? []).filter(Boolean).map(
    (track) => ({
      ...track,
      hackathon_challenges: (track.hackathon_challenges ?? []).sort((a, b) =>
        a.num.localeCompare(b.num, undefined, { numeric: true }),
      ),
    }),
  ) as HackathonTrack[];
}

export async function updateSelectedHackathonChallenge(params: {
  enrollmentId: string;
  challengeId: string;
}): Promise<void> {

  const { error } = await supabase
    .from("hackathon_team_program_enrollments")
    .update({
      selected_challenge_id: params.challengeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.enrollmentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getEnrollmentSelectedChallenge(
  enrollmentId: string,
): Promise<HackathonTeamProgramEnrollment | null> {

  const { data, error } = await supabase
    .from("hackathon_team_program_enrollments")
    .select(`
      *,
      selected_challenge:hackathon_challenges (
        *,
        track:hackathon_tracks (*)
      )
    `)
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as HackathonTeamProgramEnrollment | null) ?? null;
}
