import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, staleTimes } from "../queryClient";
import type {
  HackathonTeamMembership,
  HackathonTeam,
  HackathonTeamProgramEnrollment,
  HackathonProgramPhase,
  HackathonPhaseDetail,
  HackathonProgramHome,
} from "../../types/hackathon-program";
type ParticipantInfo = {
  id: string;
  name: string;
  university?: string;
  track?: string;
  team_emoji?: string;
};

async function getSupabaseClient() {
  const mod = await import("../supabase");
  return mod.supabase;
}

type HackathonHomeBundleResponse = HackathonProgramHome & {
  membership?: HackathonTeamMembership | null;
  teamMembership?: HackathonTeamMembership | null;
};

class HackathonApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "HackathonApiError";
  }
}

async function parseApiErrorDetails(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

async function fetchHackathonJson<T>(
  path: string,
  options?: { notFoundValue?: T }
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path);
  } catch (error) {
    throw new HackathonApiError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }

  if (response.status === 404 && options && "notFoundValue" in options) {
    return options.notFoundValue as T;
  }

  if (!response.ok) {
    const details = await parseApiErrorDetails(response);
    const message =
      typeof details === "string"
        ? details
        : typeof details === "object" && details && "error" in details
          ? String((details as { error?: unknown }).error)
          : `HTTP ${response.status}`;

    throw new HackathonApiError(message, response.status, details);
  }

  return (await response.json()) as T;
}

function normalizeParticipantInfo(member: Record<string, any>): ParticipantInfo {
  return {
    id: member.id ?? member.participant_id,
    name: member.name,
    university: member.university,
    track: member.track,
    team_emoji: member.team_emoji,
  };
}

function extractMembership(
  bundle: HackathonHomeBundleResponse | null | undefined
): HackathonTeamMembership | null {
  if (!bundle) return null;
  return bundle.membership ?? bundle.teamMembership ?? null;
}

function extractPhases(
  payload:
    | HackathonProgramPhase[]
    | { phases?: HackathonProgramPhase[] | null }
    | null
    | undefined
): HackathonProgramPhase[] {
  if (Array.isArray(payload)) return payload;
  return payload?.phases ?? [];
}

/**
 * Cached hook for hackathon team membership.
 * Based on HAR analysis: 32 requests, 18 duplicates for this data.
 * Cache: 2 minutes staleTime for user-specific data.
 */
export function useTeamMembership(participantId: string | null | undefined) {
  return useQuery({
    queryKey: participantId
      ? queryKeys.hackathon.teamMembership(participantId)
      : ["hackathon", "teamMembership", "null"],
    queryFn: async (): Promise<HackathonTeamMembership | null> => {
      if (!participantId) return null;

      const bundle = await fetchHackathonJson<HackathonHomeBundleResponse | null>(
        `/api/hackathon/home-bundle?participant_id=${encodeURIComponent(participantId)}`,
        { notFoundValue: null }
      );

      return extractMembership(bundle);
    },
    staleTime: staleTimes.userContent,
    enabled: !!participantId,
  });
}

/**
 * Cached hook for team details with members.
 * Based on HAR analysis: 10 requests, 6 duplicates for team data.
 * Cache: 5 minutes staleTime (team data changes infrequently).
 */
export function useTeamWithMembers(teamId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: teamId
      ? queryKeys.hackathon.team(teamId)
      : ["hackathon", "team", "null"],
    queryFn: async (): Promise<
      (HackathonTeam & { members: ParticipantInfo[] }) | null
    > => {
      if (!teamId) return null;

      const payload = await fetchHackathonJson<
        | (HackathonTeam & { members?: Array<Record<string, any>> | null })
        | {
            team?: HackathonTeam | null;
            members?: Array<Record<string, any>> | null;
          }
        | null
      >(`/api/hackathon/team/${encodeURIComponent(teamId)}`, {
        notFoundValue: null,
      });

      if (!payload) return null;

      const teamData = "team" in payload ? payload.team : payload;
      if (!teamData) return null;

      const rawMembers =
        ("members" in payload ? payload.members : undefined) ??
        ((teamData as HackathonTeam & { members?: Array<Record<string, any>> | null })
          .members ?? []);

      const members = (rawMembers ?? [])
        .filter(Boolean)
        .map((member) => normalizeParticipantInfo(member))
        .filter((member) => Boolean(member.id && member.name));

      members.forEach((member) => {
        queryClient.setQueryData(queryKeys.participants.detail(member.id), member);
      });

      return {
        ...(teamData as HackathonTeam),
        members: members as any[],
      } as HackathonTeam & { members: ParticipantInfo[] };
    },
    staleTime: staleTimes.progressive,
    enabled: !!teamId,
  });
}

/**
 * Cached hook for program phases.
 * Based on HAR analysis: 16 requests, 6 duplicates for phase data.
 * Cache: 30 minutes staleTime (phases are reference data).
 */
export function useProgramPhases(programId: string | null | undefined) {
  return useQuery({
    queryKey: programId
      ? queryKeys.hackathon.phases(programId)
      : ["hackathon", "phases", "null"],
    queryFn: async (): Promise<HackathonProgramPhase[]> => {
      if (!programId) return [];

      const payload = await fetchHackathonJson<
        HackathonProgramPhase[] | { phases?: HackathonProgramPhase[] | null }
      >(`/api/hackathon/program/${encodeURIComponent(programId)}/phases`, {
        notFoundValue: [],
      });

      return extractPhases(payload);
    },
    staleTime: staleTimes.reference,
    enabled: !!programId,
  });
}

/**
 * Cached hook for phase detail with playlists.
 * Cache: 5 minutes (phase content changes infrequently).
 */
export function usePhaseDetail(phaseId: string | null | undefined) {
  return useQuery({
    queryKey: phaseId
      ? queryKeys.hackathon.phase(phaseId)
      : ["hackathon", "phase", "null"],
    queryFn: async (): Promise<HackathonPhaseDetail | null> => {
      if (!phaseId) return null;

      const detail = await fetchHackathonJson<HackathonPhaseDetail | null>(
        `/api/hackathon/phase/${encodeURIComponent(phaseId)}`,
        { notFoundValue: null }
      );

      if (!detail) return null;

      return {
        phase: detail.phase ?? null,
        playlists: detail.playlists ?? [],
      };
    },
    staleTime: staleTimes.progressive,
    enabled: !!phaseId,
  });
}

/**
 * Cached hook for team program enrollment.
 * Cache: 2 minutes (enrollment status can change).
 */
export function useTeamEnrollment(
  teamId: string | null | undefined,
  programId: string | null | undefined
) {
  return useQuery({
    queryKey:
      teamId && programId
        ? [...queryKeys.hackathon.all, "enrollment", teamId, programId]
        : ["hackathon", "enrollment", "null"],
    queryFn: async (): Promise<HackathonTeamProgramEnrollment | null> => {
      if (!teamId || !programId) return null;

      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("hackathon_team_program_enrollments")
        .select("*")
        .eq("team_id", teamId)
        .eq("program_id", programId)
        .maybeSingle();

      if (error) throw error;
      return (data as HackathonTeamProgramEnrollment | null) ?? null;
    },
    staleTime: staleTimes.userContent,
    enabled: !!teamId && !!programId,
  });
}

/**
 * Cached hook for participant details.
 * Based on HAR analysis: 14 requests for participant data.
 * Cache: 5 minutes (participant profiles change infrequently).
 */
export function useParticipant(participantId: string | null | undefined) {
  return useQuery({
    queryKey: participantId
      ? queryKeys.participants.detail(participantId)
      : ["participants", "null"],
    queryFn: async (): Promise<ParticipantInfo | null> => {
      if (!participantId) return null;

      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("hackathon_participants")
        .select("id, name, university, track, team_emoji")
        .eq("id", participantId)
        .maybeSingle();

      if (error) throw error;
      return data as ParticipantInfo | null;
    },
    staleTime: staleTimes.progressive,
    enabled: !!participantId,
  });
}

/**
 * Batch fetch multiple participants efficiently.
 * Uses a single query instead of N+1 queries.
 */
export function useParticipants(participantIds: string[]) {
  return useQuery({
    queryKey: [...queryKeys.participants.all, "batch", participantIds.sort()],
    queryFn: async (): Promise<ParticipantInfo[]> => {
      if (participantIds.length === 0) return [];

      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("hackathon_participants")
        .select("id, name, university, track, team_emoji")
        .in("id", participantIds);

      if (error) throw error;
      return (data as ParticipantInfo[]) ?? [];
    },
    staleTime: staleTimes.progressive,
    enabled: participantIds.length > 0,
  });
}
