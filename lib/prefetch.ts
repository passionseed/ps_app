import { queryClient, queryKeys } from "./queryClient";

/**
 * Prefetching utilities for common routes.
 * Call these before navigation to warm up the cache.
 */

async function getSupabaseClient() {
  const mod = await import("./supabase");
  return mod.supabase;
}

/**
 * Prefetch hackathon home bundle data.
 * Call this when navigating to hackathon home.
 */
export async function prefetchHackathonHome(participantId: string | null) {
  if (!participantId) return;

  // Prefetch team membership
  await queryClient.prefetchQuery({
    queryKey: queryKeys.hackathon.teamMembership(participantId),
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data } = await supabase
        .from("hackathon_team_members")
        .select("*")
        .eq("participant_id", participantId)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Prefetch phase detail data.
 * Call this when user hovers/clicks on a phase card.
 */
export async function prefetchPhaseDetail(phaseId: string) {
  const supabase = await getSupabaseClient();

  await Promise.all([
    // Prefetch phase
    queryClient.prefetchQuery({
      queryKey: queryKeys.hackathon.phase(phaseId),
      queryFn: async () => {
        const { data } = await supabase
          .from("hackathon_program_phases")
          .select("*")
          .eq("id", phaseId)
          .maybeSingle();
        return data;
      },
      staleTime: 1000 * 60 * 5,
    }),
    // Prefetch playlists for this phase
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.hackathon.all, "playlists", phaseId],
      queryFn: async () => {
        const { data } = await supabase
          .from("hackathon_phase_playlists")
          .select("*")
          .eq("phase_id", phaseId)
          .order("display_order", { ascending: true });
        return data ?? [];
      },
      staleTime: 1000 * 60 * 5,
    }),
  ]);
}

/**
 * Prefetch team data including members.
 * Call this when navigating to team-related screens.
 */
export async function prefetchTeamWithMembers(teamId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.hackathon.team(teamId),
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const [{ data: teamData }, { data: memberRows }] = await Promise.all([
        supabase
          .from("hackathon_teams")
          .select("id, name, team_avatar_url, created_at")
          .eq("id", teamId)
          .maybeSingle(),
        supabase
          .from("hackathon_team_members")
          .select("participant_id")
          .eq("team_id", teamId),
      ]);

      if (!teamData) return null;

      const memberIds = (memberRows ?? [])
        .filter(Boolean)
        .map((r: any) => r.participant_id)
        .filter(Boolean);

      let members: any[] = [];
      if (memberIds.length > 0) {
        const { data: participantDetails } = await supabase
          .from("hackathon_participants")
          .select("id, name, university, track, team_emoji")
          .in("id", memberIds);

        members = (participantDetails ?? []).filter(Boolean).map((p: any) => ({
          id: p.id,
          name: p.name,
          university: p.university,
          track: p.track,
          team_emoji: p.team_emoji,
        }));
      }

      return { ...teamData, members };
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Invalidate cache after mutations.
 * Call this after creating/updating data.
 */
export function invalidateHackathonCache() {
  queryClient.invalidateQueries({ queryKey: queryKeys.hackathon.all });
}

export function invalidateHackathonHomeCache() {
  queryClient.invalidateQueries({
    queryKey: queryKeys.hackathon.home(),
  });
}

export function invalidateTeamCache(teamId: string) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.hackathon.team(teamId),
  });
}

export function invalidateTeamMembershipCache(participantId: string) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.hackathon.teamMembership(participantId),
  });
}

export function invalidatePhaseCache(phaseId: string) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.hackathon.phase(phaseId),
  });
}
