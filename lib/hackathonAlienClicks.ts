import { readHackathonParticipant } from "./hackathon-mode";
import { supabase } from "./supabase";

type TrackHackathonAlienButtonClickParams = {
  source?: string;
  targetUrl: string;
  teamId?: string | null;
};

export async function trackHackathonAlienButtonClick(
  params: TrackHackathonAlienButtonClickParams,
): Promise<void> {
  const participant = await readHackathonParticipant();
  if (!participant?.id) return;

  const { error } = await supabase.from("hackathon_journey_alien_clicks").insert({
    participant_id: participant.id,
    participant_name: participant.name ?? null,
    team_id: params.teamId ?? null,
    source: params.source ?? "journey_header_alien_button",
    target_url: params.targetUrl,
  });

  if (error) {
    console.warn("[hackathonAlienClicks] Failed to track alien button click", error.message);
  }
}
