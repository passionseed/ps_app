import type {
  HackathonModuleGateStatus,
  HackathonModuleProgress,
  HackathonModuleProgressSnapshot,
  HackathonModuleStatus,
  HackathonChallenge,
  HackathonPhaseDetail,
  HackathonPhaseModule,
  HackathonPhasePlaylist,
  HackathonProgram,
  HackathonProgramHome,
  HackathonProgramPhase,
  HackathonSubmissionStatus,
  HackathonTeam,
  HackathonTeamMembership,
  HackathonTeamProgramEnrollment,
} from "../types/hackathon-program";
import type {
  PathActivityScope,
  PathGateRule,
  PathReviewMode,
} from "../types/pathlab-content";
import type { MapNode, StudentNodeProgress } from "../types/map";

type CardTone = "neutral" | "education" | "destination";

type ModuleProgressInput = {
  memberStatuses: Array<
    | HackathonSubmissionStatus
    | "completed"
    | "pending"
    | "revision_required"
  >;
  workflow: {
    scope: PathActivityScope;
    gate_rule: PathGateRule;
    review_mode: PathReviewMode;
    required_member_count?: number | null;
  };
  teamSubmissionStatus?: HackathonSubmissionStatus | null;
};

const RETRYABLE_MESSAGES = [
  "network request failed",
  "failed to fetch",
  "ssl handshake failed",
  "cloudflare",
];

function stringifyError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function getSupabaseClient() {
  const mod = await import("./supabase");
  return mod.supabase;
}

function isRetryable(error: unknown) {
  const message = stringifyError(error).toLowerCase();
  return RETRYABLE_MESSAGES.some((snippet) => message.includes(snippet));
}

async function withRetry<T>(
  task: () => Promise<T>,
  fallback: string,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === attempts) {
        throw new Error(stringifyError(error) || fallback);
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  throw new Error(stringifyError(lastError) || fallback);
}

function normalizeSubmissionStatus(
  status: ModuleProgressInput["memberStatuses"][number],
): HackathonSubmissionStatus {
  if (status === "completed") return "passed";
  if (status === "pending") return "not_started";
  return status;
}

export function buildModuleProgressSnapshot(
  input: ModuleProgressInput,
): HackathonModuleProgressSnapshot {
  const memberStatuses = input.memberStatuses.map(normalizeSubmissionStatus);
  const readyMembers = memberStatuses.filter(
    (status) => status === "passed" || status === "submitted",
  ).length;
  const revisionRequiredMembers = memberStatuses.filter(
    (status) => status === "revision_required",
  ).length;
  const pendingMembers =
    memberStatuses.length - readyMembers - revisionRequiredMembers;

  const requiredMemberCount =
    input.workflow.required_member_count ?? memberStatuses.length;
  const teamStatus = input.teamSubmissionStatus ?? "not_started";

  let gateStatus: HackathonModuleGateStatus = "blocked";
  let canOpenTeamSubmission = false;

  if (teamStatus === "passed") {
    gateStatus = "passed";
    canOpenTeamSubmission = true;
  } else if (revisionRequiredMembers > 0) {
    gateStatus = "revision_required";
  } else {
    switch (input.workflow.gate_rule) {
      case "complete":
        gateStatus = readyMembers > 0 ? "passed" : "blocked";
        canOpenTeamSubmission = input.workflow.scope !== "individual";
        break;
      case "all_members_complete":
        canOpenTeamSubmission = pendingMembers === 0 && readyMembers > 0;
        gateStatus = canOpenTeamSubmission ? "ready_for_team" : "blocked";
        break;
      case "min_members_complete":
        canOpenTeamSubmission = readyMembers >= requiredMemberCount;
        gateStatus = canOpenTeamSubmission ? "ready_for_team" : "blocked";
        break;
      case "mentor_pass":
      case "team_submission_pass":
        canOpenTeamSubmission =
          input.workflow.scope === "team"
            ? true
            : readyMembers >= requiredMemberCount;
        gateStatus =
          teamStatus === "pending_review"
            ? "ready_for_team"
            : canOpenTeamSubmission
              ? "ready_for_team"
              : "blocked";
        break;
      default:
        gateStatus = "blocked";
    }
  }

  return {
    gate_status: gateStatus,
    ready_members: readyMembers,
    pending_members: pendingMembers,
    revision_required_members: revisionRequiredMembers,
    can_open_team_submission: canOpenTeamSubmission,
  };
}

export function getModuleScopeCopy(scope: PathActivityScope): string {
  switch (scope) {
    case "individual":
      return "Required for each member before the team can move on.";
    case "team":
      return "One team submission represents the whole group.";
    case "hybrid":
      return "Members and the team both submit work before the module is complete.";
  }
}

export function getModuleStatusTone(
  gateStatus: HackathonModuleGateStatus,
): CardTone {
  switch (gateStatus) {
    case "ready_for_team":
      return "education";
    case "passed":
      return "destination";
    case "blocked":
    case "revision_required":
    default:
      return "neutral";
  }
}

export function deriveModuleStatus(
  module: HackathonModuleProgress,
): HackathonModuleStatus {
  if (module.isLocked) return "blocked";
  if (module.completedIndividualCount === 0) return "not_started";

  const individualReady =
    module.completedIndividualCount >= module.requiredIndividualCount;

  if (!individualReady) return "in_progress";
  if (!module.requiresTeamSubmission) return "completed";
  if (module.teamSubmissionStatus === "passed") return "completed";
  if (module.teamSubmissionStatus === "submitted") return "ready_for_review";
  return "in_progress";
}

export type { HackathonModuleProgress } from "../types/hackathon-program";

export function summarizePhaseModules(modules: HackathonModuleProgress[]) {
  const summary = {
    total: modules.length,
    blocked: 0,
    notStarted: 0,
    inProgress: 0,
    readyForReview: 0,
    completed: 0,
  };

  for (const module of modules) {
    const status = deriveModuleStatus(module);
    switch (status) {
      case "blocked":
        summary.blocked += 1;
        break;
      case "not_started":
        summary.notStarted += 1;
        break;
      case "in_progress":
        summary.inProgress += 1;
        break;
      case "ready_for_review":
        summary.readyForReview += 1;
        break;
      case "completed":
        summary.completed += 1;
        break;
    }
  }

  return summary;
}

function getPreferredChallengeTitle(challenge: HackathonChallenge) {
  return challenge.title_en?.trim() || challenge.title_th?.trim() || "Selected challenge";
}

function getPreferredTrackTitle(challenge: HackathonChallenge) {
  return challenge.track?.title?.trim() || challenge.track?.subtitle?.trim() || null;
}

export function getChallengeSummary(
  enrollment: HackathonTeamProgramEnrollment | null,
) {
  const challenge = enrollment?.selected_challenge;
  if (!challenge) return null;

  return {
    title: getPreferredChallengeTitle(challenge),
    trackTitle: getPreferredTrackTitle(challenge),
    promptLabel: challenge.num,
  };
}

export async function getCurrentHackathonTeamMembership(): Promise<HackathonTeamMembership | null> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();

    const { readHackathonParticipant } = await import("./hackathon-mode");
    const participant = await readHackathonParticipant();
    if (!participant?.id) return null;

    const { data, error } = await supabase
      .from("hackathon_team_members")
      .select("*")
      .eq("participant_id", participant.id)
      .maybeSingle();

    if (error) throw error;
    return (data as HackathonTeamMembership | null) ?? null;
  }, "Unable to load hackathon team membership");
}

export async function getCurrentHackathonProgramHome(): Promise<HackathonProgramHome> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();

    // Any logged-in participant can see the program — no team required.
    const { readHackathonParticipant } = await import("./hackathon-mode");
    const participant = await readHackathonParticipant();
    if (!participant?.id) {
      return { team: null, enrollment: null, program: null, phases: [] };
    }

    // Load the single active program directly.
    const { data: program, error: progErr } = await supabase
      .from("hackathon_programs")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[hackathonProgram] program:", program ? (program as any).id : null, "progErr:", progErr?.message ?? null);
    if (!program) {
      return { team: null, enrollment: null, program: null, phases: [] };
    }

    const { data: phases } = await supabase
      .from("hackathon_program_phases")
      .select("*")
      .eq("program_id", (program as any).id)
      .order("phase_number", { ascending: true });

    console.log("[hackathonProgram] phases count:", (phases as any[])?.length ?? 0);

    // Team + enrollment are optional — used for challenge selection and current_phase_id.
    const membership = await getCurrentHackathonTeamMembership();
    let team: HackathonTeam | null = null;
    let enrollment: HackathonTeamProgramEnrollment | null = null;

    if (membership) {
      const [{ data: teamData }, { data: enrollmentData }, { data: memberRows }] = await Promise.all([
        supabase.from("hackathon_teams").select("*").eq("id", membership.team_id).maybeSingle(),
        supabase
          .from("hackathon_team_program_enrollments")
          .select("*")
          .eq("team_id", membership.team_id)
          .eq("program_id", (program as any).id)
          .maybeSingle(),
        supabase
          .from("hackathon_team_members")
          .select("participant_id")
          .eq("team_id", membership.team_id),
      ]);

      if (teamData) {
        const memberIds = (memberRows ?? []).map((r: any) => r.participant_id);
        let members: import("../types/hackathon-program").HackathonTeamMember[] = [];
        if (memberIds.length > 0) {
          const { data: participantDetails } = await supabase
            .from("hackathon_participants")
            .select("id, name, university, track")
            .in("id", memberIds);
          members = (participantDetails ?? []).map((p: any) => ({
            participant_id: p.id,
            name: p.name,
            university: p.university,
            track: p.track,
          }));
        }
        team = { ...(teamData as HackathonTeam), members };
      }
      enrollment = (enrollmentData as HackathonTeamProgramEnrollment | null) ?? null;
    }

    return {
      team,
      enrollment,
      program: program as HackathonProgram,
      phases: (phases as HackathonProgramPhase[] | null) ?? [],
    };
  }, "Unable to load hackathon program");
}

export async function getHackathonPhaseDetail(
  phaseId: string,
): Promise<HackathonPhaseDetail> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();
    const [{ data: phase }, { data: playlists }] = await Promise.all([
      supabase
        .from("hackathon_program_phases")
        .select("*")
        .eq("id", phaseId)
        .maybeSingle(),
      supabase
        .from("hackathon_phase_playlists")
        .select("*")
        .eq("phase_id", phaseId)
        .order("display_order", { ascending: true }),
    ]);

    const playlistIds = (playlists ?? []).map((playlist) => playlist.id);
    const { data: modules } = playlistIds.length
      ? await supabase
          .from("hackathon_phase_modules")
          .select("*")
          .in("playlist_id", playlistIds)
          .order("display_order", { ascending: true })
      : { data: [] as HackathonPhaseModule[] };

    const playlistModules = (playlists as HackathonPhasePlaylist[] | null)?.map(
      (playlist) => ({
        ...playlist,
        modules:
          (modules as HackathonPhaseModule[] | null)?.filter(
            (module) => module.playlist_id === playlist.id,
          ) ?? [],
      }),
    ) ?? [];

    return {
      phase: (phase as HackathonProgramPhase | null) ?? null,
      playlists: playlistModules,
    };
  }, "Unable to load hackathon phase");
}

export async function getHackathonModuleDetail(moduleId: string) {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("hackathon_phase_modules")
      .select("*")
      .eq("id", moduleId)
      .maybeSingle();

    if (error) throw error;
    return (data as HackathonPhaseModule | null) ?? null;
  }, "Unable to load hackathon module");
}

export function getEmptyHackathonProgramHome(): HackathonProgramHome {
  return {
    team: null,
    enrollment: null,
    program: null,
    phases: [],
  };
}

export async function getHackathonJourneyModules(
  phaseId: string,
): Promise<Array<HackathonPhaseModule & { ends_at: string | null }>> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();

    const { data: phase, error: phaseError } = await supabase
      .from("hackathon_program_phases")
      .select("ends_at")
      .eq("id", phaseId)
      .maybeSingle();
    if (phaseError) throw phaseError;

    const { data: playlists, error: playlistError } = await supabase
      .from("hackathon_phase_playlists")
      .select("id")
      .eq("phase_id", phaseId)
      .order("display_order", { ascending: true });
    if (playlistError) throw playlistError;

    const playlistIds = (playlists ?? []).map((p: { id: string }) => p.id);
    if (playlistIds.length === 0) return [];

    const { data: modules, error: modulesError } = await supabase
      .from("hackathon_phase_modules")
      .select("*")
      .in("playlist_id", playlistIds)
      .order("display_order", { ascending: true });
    if (modulesError) throw modulesError;

    const endsAt = (phase as { ends_at: string | null } | null)?.ends_at ?? null;
    return ((modules as HackathonPhaseModule[]) ?? []).map((m) => ({
      ...m,
      ends_at: endsAt,
    }));
  }, "Unable to load journey modules");
}

export async function getModuleActivityProgress(
  moduleId: string,
  userId: string,
): Promise<{
  nodes: MapNode[];
  completedNodeIds: Set<string>;
  currentNodeId: string | null;
}> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();

    const { data: module, error: moduleError } = await supabase
      .from("hackathon_phase_modules")
      .select("path_id")
      .eq("id", moduleId)
      .maybeSingle();
    if (moduleError) throw moduleError;

    const pathId = (module as { path_id: string | null } | null)?.path_id;
    if (!pathId) {
      return { nodes: [], completedNodeIds: new Set<string>(), currentNodeId: null };
    }

    const { data: pathDays, error: daysError } = await supabase
      .from("path_days")
      .select("node_ids")
      .eq("path_id", pathId)
      .order("day_number", { ascending: true });
    if (daysError) throw daysError;

    const nodeIds: string[] = (pathDays ?? []).flatMap(
      (day: { node_ids: string[] }) => day.node_ids ?? [],
    );
    if (nodeIds.length === 0) {
      return { nodes: [], completedNodeIds: new Set<string>(), currentNodeId: null };
    }

    const [{ data: nodesData, error: nodesError }, { data: progressData, error: progressError }] =
      await Promise.all([
        supabase
          .from("map_nodes")
          .select("*, node_content(*), node_assessments(id, assessment_type, quiz_questions(*))")
          .in("id", nodeIds),
        supabase
          .from("student_node_progress")
          .select("*")
          .eq("user_id", userId)
          .in("node_id", nodeIds),
      ]);
    if (nodesError) throw nodesError;
    if (progressError) throw progressError;

    const nodeMap = new Map<string, MapNode>(
      ((nodesData as MapNode[]) ?? []).map((n) => [n.id, n]),
    );
    const orderedNodes = nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is MapNode => n !== undefined);

    const completedNodeIds = new Set<string>(
      ((progressData as StudentNodeProgress[]) ?? [])
        .filter((p) => p.status === "passed" || p.status === "submitted")
        .map((p) => p.node_id),
    );

    const currentNodeId =
      orderedNodes.find((n) => !completedNodeIds.has(n.id))?.id ?? null;

    return { nodes: orderedNodes, completedNodeIds, currentNodeId };
  }, "Unable to load module activities");
}

export async function completeActivityNode(
  nodeId: string,
  userId: string,
): Promise<void> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("student_node_progress")
      .upsert(
        {
          user_id: userId,
          node_id: nodeId,
          status: "passed",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,node_id" },
      );
    if (error) throw error;
  }, "Unable to save progress");
}
