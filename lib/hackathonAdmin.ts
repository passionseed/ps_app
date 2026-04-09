import { computeTeamRank, type TeamScoreRow } from "./hackathonRanking";
import type {
  HackathonAdminActivityRow,
  HackathonAdminActivitySubmission,
  HackathonAdminAttentionItem,
  HackathonAdminDashboard,
  HackathonAdminInboxItem,
  HackathonAdminParticipantRow,
  HackathonAdminOverview,
  HackathonAdminPhaseSummary,
  HackathonAdminProgramRow,
  HackathonAdminStudentRow,
  HackathonAdminSubmissionRow,
  HackathonAdminTeamMember,
  HackathonAdminTeamMemberRow,
  HackathonAdminTeamScoreRow,
  HackathonAdminTeamSubmissionRow,
  HackathonAdminTeamSummary,
} from "../types/hackathon-admin";
import type {
  HackathonProgramPhase,
  HackathonTeam,
  HackathonTeamProgramEnrollment,
} from "../types/hackathon-program";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const CURRENT_PHASE_FRESHNESS_MS = DAY_MS;

function getValueString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toMillis(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function latestIso(values: Array<string | null | undefined>): string | null {
  let latestTime = -Infinity;
  let latestValue: string | null = null;

  for (const value of values) {
    const time = toMillis(value);
    if (time === null || time < latestTime) continue;
    latestTime = time;
    latestValue = value ?? null;
  }

  return latestValue;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function getParticipantLabel(participant: HackathonAdminParticipantRow | undefined) {
  if (!participant) return null;
  return (
    getValueString(participant.display_name) ??
    getValueString(participant.name) ??
    null
  );
}

function getTeamLabel(team: HackathonTeam | undefined) {
  if (!team) return null;
  return getValueString(team.name) ?? getValueString(team.team_name);
}

function isRequiredActivity(activity: HackathonAdminActivityRow) {
  return Boolean(activity?.is_required) && !Boolean(activity?.is_draft);
}

function getActivityScope(activity: HackathonAdminActivityRow): "individual" | "team" {
  return activity.submission_scope === "team" ? "team" : "individual";
}

function buildPhaseMap(phases: HackathonProgramPhase[]) {
  const map = new Map<string, HackathonProgramPhase>();
  for (const phase of phases) {
    if (!phase?.id) continue;
    map.set(phase.id, phase);
  }
  return map;
}

function resolveCurrentPhaseId(
  phases: HackathonProgramPhase[],
  enrollments: HackathonTeamProgramEnrollment[],
) {
  const phaseMap = buildPhaseMap(phases);
  const counts = new Map<string, number>();

  for (const enrollment of enrollments) {
    if (!enrollment?.current_phase_id) continue;
    counts.set(
      enrollment.current_phase_id,
      (counts.get(enrollment.current_phase_id) ?? 0) + 1,
    );
  }

  if (counts.size > 0) {
    const ranked = Array.from(counts.entries()).sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      const leftPhase = phaseMap.get(left[0]);
      const rightPhase = phaseMap.get(right[0]);
      const leftOrder = leftPhase?.phase_number ?? 0;
      const rightOrder = rightPhase?.phase_number ?? 0;
      if (rightOrder !== leftOrder) return rightOrder - leftOrder;
      return left[0].localeCompare(right[0]);
    });

    return ranked[0]?.[0] ?? null;
  }

  const releasedPhases = phases
    .filter((phase) => phase?.status === "released")
    .slice()
    .sort((left, right) => right.phase_number - left.phase_number);

  return releasedPhases[0]?.id ?? null;
}

function buildPhaseSummaries(
  phases: HackathonProgramPhase[],
  activities: HackathonAdminActivityRow[],
  teamSummaries: HackathonAdminTeamSummary[],
  currentPhaseId: string | null,
): HackathonAdminPhaseSummary[] {
  return phases
    .slice()
    .sort((left, right) => left.phase_number - right.phase_number)
    .map((phase) => {
      const phaseActivities = activities.filter(
        (activity) => activity.phase_id === phase.id && !activity.is_draft,
      );
      const requiredActivities = phaseActivities.filter(isRequiredActivity);
      const phaseTeams = teamSummaries.filter(
        (team) => team.currentPhase?.id === phase.id,
      );
      const phaseTeamCompletions = phaseTeams.reduce(
        (total, team) => total + team.completedRequiredActivities,
        0,
      );
      const totalSlots = requiredActivities.length * phaseTeams.length;
      const completionRate = totalSlots > 0 ? Math.round((phaseTeamCompletions / totalSlots) * 100) : 0;

      return {
        ...phase,
        isCurrent: phase.id === currentPhaseId,
        activityCount: phaseActivities.length,
        requiredActivityCount: requiredActivities.length,
        completedRequiredActivityCount: phaseTeamCompletions,
        completionRate,
      };
    });
}

function buildSubmissionDirectory(
  submissions: HackathonAdminSubmissionRow[],
  participantById: Map<string, HackathonAdminParticipantRow>,
  teamIdByParticipantId: Map<string, string>,
  teamById: Map<string, HackathonTeam>,
) {
  return submissions
    .slice()
    .sort((left, right) => {
      const leftTime = toMillis(left.submitted_at) ?? -Infinity;
      const rightTime = toMillis(right.submitted_at) ?? -Infinity;
      return rightTime - leftTime;
    })
    .map<HackathonAdminActivitySubmission>((submission) => {
      const submittedBy = getValueString(submission.submitted_by);
      const participantId =
        getValueString(submission.participant_id) ?? submittedBy;
      const explicitTeamId = getValueString(submission.team_id);
      const teamId = explicitTeamId ?? (participantId ? teamIdByParticipantId.get(participantId) ?? null : null);
      const participant = participantId ? participantById.get(participantId) : undefined;
      const team = teamId ? teamById.get(teamId) : undefined;

      return {
        id: submission.id,
        activityId: submission.activity_id,
        participantId,
        participantName: getParticipantLabel(participant) ?? (explicitTeamId ? "Team submission" : null),
        teamId,
        teamName: getTeamLabel(team),
        submittedAt: submission.submitted_at,
        assessmentId: getValueString(submission.assessment_id),
        textAnswer: submission.text_answer ?? null,
        imageUrl: submission.image_url ?? null,
        fileUrls: submission.file_urls ?? null,
        status: submission.status ?? null,
      };
    });
}

function buildActivitySummaries(
  phases: HackathonProgramPhase[],
  activities: HackathonAdminActivityRow[],
  enrollments: HackathonTeamProgramEnrollment[],
  teamIds: string[],
  teamIdByParticipantId: Map<string, string>,
  participantById: Map<string, HackathonAdminParticipantRow>,
  teamById: Map<string, HackathonTeam>,
  submissions: HackathonAdminSubmissionRow[],
  teamSubmissions: HackathonAdminTeamSubmissionRow[],
  nowMs: number,
) {
  const phaseById = buildPhaseMap(phases);
  const submissionsByActivityId = new Map<string, HackathonAdminSubmissionRow[]>();
  const allSubmissions: HackathonAdminSubmissionRow[] = [
    ...submissions,
    ...teamSubmissions,
  ];

  for (const submission of allSubmissions) {
    const existing = submissionsByActivityId.get(submission.activity_id) ?? [];
    existing.push(submission);
    submissionsByActivityId.set(submission.activity_id, existing);
  }

  const participantIds = unique([
    ...Array.from(participantById.keys()),
    ...allSubmissions
      .map((submission) => getValueString(submission.participant_id))
      .filter((id): id is string => Boolean(id)),
  ]);
  const teamCount = teamIds.length;
  const participantCount = participantIds.length;

  return activities
    .slice()
    .filter((activity) => !activity.is_draft)
    .sort((left, right) => {
      const leftPhase = phaseById.get(left.phase_id)?.phase_number ?? 0;
      const rightPhase = phaseById.get(right.phase_id)?.phase_number ?? 0;
      if (leftPhase !== rightPhase) return leftPhase - rightPhase;
      return left.display_order - right.display_order;
    })
    .map((activity) => {
      const phase = phaseById.get(activity.phase_id);
      const rawSubmissions = submissionsByActivityId.get(activity.id) ?? [];
      const renderedSubmissions = buildSubmissionDirectory(
        rawSubmissions,
        participantById,
        teamIdByParticipantId,
        teamById,
      );
      const scope = getActivityScope(activity);
      const expectedUnits = scope === "team" ? teamCount : participantCount;

      const unitKeys = rawSubmissions.map((submission) => {
        const participantId = getValueString(submission.participant_id);
        const teamId =
          getValueString(submission.team_id) ??
          (participantId ? teamIdByParticipantId.get(participantId) ?? null : null);
        return scope === "team" ? teamId ?? participantId ?? submission.id : participantId ?? submission.id;
      });

      const representedTeamKeys = rawSubmissions.map((submission) => {
        const participantId = getValueString(submission.participant_id);
        const teamId =
          getValueString(submission.team_id) ??
          (participantId ? teamIdByParticipantId.get(participantId) ?? null : null);
        return teamId ?? participantId ?? submission.id;
      });

      return {
        id: activity.id,
        phaseId: activity.phase_id,
        phaseNumber: phase?.phase_number ?? 0,
        title: activity.title,
        displayOrder: activity.display_order,
        isRequired: isRequiredActivity(activity),
        submissionScope: scope,
        submittedCount: unique(unitKeys.filter(Boolean) as string[]).length,
        representedTeamCount: unique(representedTeamKeys.filter(Boolean) as string[]).length,
        missingCount: Math.max(
          0,
          expectedUnits -
            unique(
              unitKeys.filter(Boolean) as string[],
            ).length,
        ),
        latestSubmittedAt: latestIso(rawSubmissions.map((submission) => submission.submitted_at)),
        submissions: renderedSubmissions,
      };
    });
}

function buildTeamSummaries(
  phases: HackathonProgramPhase[],
  activities: HackathonAdminActivityRow[],
  enrollments: HackathonTeamProgramEnrollment[],
  teams: HackathonTeam[],
  teamMembers: HackathonAdminTeamMemberRow[],
  participants: HackathonAdminParticipantRow[],
  submissions: HackathonAdminSubmissionRow[],
  teamSubmissions: HackathonAdminTeamSubmissionRow[],
  scores: HackathonAdminTeamScoreRow[],
  nowMs: number,
  currentPhaseId: string | null,
): {
  teams: HackathonAdminTeamSummary[];
  completedRequiredSlots: number;
  totalRequiredSlots: number;
  latestSubmissionCount24h: number;
} {
  const teamById = new Map<string, HackathonTeam>();
  for (const team of teams) {
    if (team?.id) teamById.set(team.id, team);
  }

  const participantById = new Map<string, HackathonAdminParticipantRow>();
  for (const participant of participants) {
    if (participant?.id) participantById.set(participant.id, participant);
  }

  const teamMembersByTeamId = new Map<string, string[]>();
  const teamIdByParticipantId = new Map<string, string>();
  for (const member of teamMembers) {
    if (!member?.team_id || !member?.participant_id) continue;
    const current = teamMembersByTeamId.get(member.team_id) ?? [];
    current.push(member.participant_id);
    teamMembersByTeamId.set(member.team_id, current);
    if (!teamIdByParticipantId.has(member.participant_id)) {
      teamIdByParticipantId.set(member.participant_id, member.team_id);
    }
  }

  const scoreRows: TeamScoreRow[] = scores.map((score) => ({
    team_id: score.team_id,
    total_score: score.total_score,
  }));
  const teamIds = teams.map((team) => team.id).filter(Boolean);

  const phaseById = buildPhaseMap(phases);
  const currentPhase = currentPhaseId ? phaseById.get(currentPhaseId) ?? null : null;
  const requiredActivities = currentPhase
    ? activities.filter(
        (activity) =>
          activity.phase_id === currentPhase.id &&
          isRequiredActivity(activity),
      )
    : [];

  const submissionsByActivityId = new Map<string, HackathonAdminSubmissionRow[]>();
  const allSubmissions: HackathonAdminSubmissionRow[] = [
    ...submissions,
    ...teamSubmissions,
  ];

  for (const submission of allSubmissions) {
    const current = submissionsByActivityId.get(submission.activity_id) ?? [];
    current.push(submission);
    submissionsByActivityId.set(submission.activity_id, current);
  }

  const latestSubmissionCount24h = allSubmissions.filter((submission) => {
    const submittedAt = toMillis(submission.submitted_at);
    return submittedAt !== null && nowMs - submittedAt <= DAY_MS;
  }).length;

  let completedRequiredSlots = 0;
  const totalRequiredSlots = requiredActivities.length * teams.length;

  const teamSummaries = teams
    .slice()
    .sort((left, right) => {
      const leftScore = scoreRows.find((row) => row.team_id === left.id)?.total_score ?? 0;
      const rightScore = scoreRows.find((row) => row.team_id === right.id)?.total_score ?? 0;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return (left.name ?? left.team_name ?? left.id).localeCompare(
        right.name ?? right.team_name ?? right.id,
      );
    })
    .map((team) => {
      const memberIds = teamMembersByTeamId.get(team.id) ?? [];
      const members: HackathonAdminTeamMember[] = memberIds.map((participantId) => {
        const participant = participantById.get(participantId);
        return {
          participantId,
          name: getParticipantLabel(participant),
          avatarUrl: participant?.avatar_url ?? null,
          teamEmoji: participant?.team_emoji ?? null,
        };
      });

      const enrollment = enrollments.find((row) => row.team_id === team.id) ?? null;
      const resolvedPhaseId = enrollment?.current_phase_id ?? currentPhaseId;
      const teamCurrentPhase = resolvedPhaseId ? phaseById.get(resolvedPhaseId) ?? null : null;
      const teamCurrentPhaseActivities = teamCurrentPhase
        ? activities.filter(
            (activity) =>
              activity.phase_id === teamCurrentPhase.id &&
              isRequiredActivity(activity),
          )
        : [];
      const memberIdSet = new Set(memberIds);
      let completedRequiredActivities = 0;
      for (const activity of teamCurrentPhaseActivities) {
        const submissionsForActivity = submissionsByActivityId.get(activity.id) ?? [];
        if (getActivityScope(activity) === "team") {
          if (
            submissionsForActivity.some((submission) => {
              const teamId = getValueString(submission.team_id);
              if (teamId) return teamId === team.id;
              const participantId = getValueString(submission.participant_id);
              return participantId ? memberIdSet.has(participantId) : false;
            })
          ) {
            completedRequiredActivities += 1;
          }
          continue;
        }

        if (
          memberIds.length > 0 &&
          memberIds.every((participantId) =>
            submissionsForActivity.some(
              (submission) => getValueString(submission.participant_id) === participantId,
            ),
          )
        ) {
          completedRequiredActivities += 1;
        }
      }
      const missingRequiredActivities = Math.max(
        0,
        teamCurrentPhaseActivities.length - completedRequiredActivities,
      );
      completedRequiredSlots += completedRequiredActivities;

      const memberSubmissionTimes = allSubmissions
        .filter((submission) => {
          const teamId = getValueString(submission.team_id);
          if (teamId) return teamId === team.id;
          const participantId = getValueString(submission.participant_id);
          return participantId ? teamIdByParticipantId.get(participantId) === team.id : false;
        })
        .map((submission) => submission.submitted_at);

      const latestSubmittedAt = latestIso(memberSubmissionTimes);
      const recentSubmission = memberSubmissionTimes.some((timestamp) => {
        const submittedAt = toMillis(timestamp);
        return submittedAt !== null && nowMs - submittedAt <= CURRENT_PHASE_FRESHNESS_MS;
      });
      const isOnTrack =
        teamCurrentPhase !== null &&
        (missingRequiredActivities === 0 || recentSubmission);
      const offTrackReason = isOnTrack
        ? null
        : !teamCurrentPhase
          ? "no_current_phase"
          : missingRequiredActivities > 0
            ? "missing_required_activities"
            : "no_recent_submission";
      const scoreRow = scoreRows.find((row) => row.team_id === team.id) ?? null;

      return {
        ...team,
        name: team.name ?? null,
        team_name: team.team_name ?? team.name ?? null,
        members,
        currentPhase: teamCurrentPhase
          ? {
              ...teamCurrentPhase,
              isCurrent: teamCurrentPhase.id === currentPhaseId,
              activityCount: teamCurrentPhaseActivities.filter((activity) => !activity.is_draft).length,
              requiredActivityCount: teamCurrentPhaseActivities.length,
              completedRequiredActivityCount: completedRequiredActivities,
              completionRate:
                teamCurrentPhaseActivities.length > 0
                  ? Math.round((completedRequiredActivities / teamCurrentPhaseActivities.length) * 100)
                  : 0,
            }
          : null,
        completedRequiredActivities,
        totalRequiredActivities: teamCurrentPhaseActivities.length,
        missingRequiredActivities,
        latestSubmittedAt,
        score: scoreRow?.total_score ?? null,
        rank: computeTeamRank(team.id, teamIds, scoreRows),
        onTrack: isOnTrack,
        offTrackReason,
      } satisfies HackathonAdminTeamSummary;
    });

  return {
    teams: teamSummaries,
    completedRequiredSlots,
    totalRequiredSlots,
    latestSubmissionCount24h,
  };
}

export type HackathonAdminDashboardRows = {
  program: HackathonAdminProgramRow | null;
  phases: HackathonProgramPhase[];
  activities: HackathonAdminActivityRow[];
  enrollments: HackathonTeamProgramEnrollment[];
  teams: HackathonTeam[];
  members: HackathonAdminTeamMemberRow[];
  participants: HackathonAdminParticipantRow[];
  submissions: HackathonAdminSubmissionRow[];
  teamSubmissions: HackathonAdminTeamSubmissionRow[];
  scores: HackathonAdminTeamScoreRow[];
  referenceTime?: string | Date;
};

const EMPTY_DASHBOARD: HackathonAdminDashboard = {
  overview: {
    participantCount: 0,
    teamCount: 0,
    assignedParticipantCount: 0,
    unassignedParticipantCount: 0,
    submissionsLast24h: 0,
    currentPhaseSubmissionRate: 0,
    stuckTeamCount: 0,
    teamsOnTrackCount: 0,
    currentPhaseId: null,
  },
  phases: [],
  activities: [],
  teams: [],
};

export function buildHackathonAdminDashboardFromRows(
  rows: HackathonAdminDashboardRows,
): HackathonAdminDashboard {
  const nowMs = toMillis(rows.referenceTime ?? new Date()) ?? Date.now();
  const phases = rows.phases.filter(Boolean).slice().sort((left, right) => left.phase_number - right.phase_number);
  const activities = rows.activities.filter(Boolean);
  const enrollments = rows.enrollments.filter(Boolean);
  const teams = rows.teams.filter(Boolean);
  const teamMembers = rows.members.filter(Boolean);
  const participants = rows.participants.filter(Boolean);
  const submissions = rows.submissions.filter(Boolean);
  const teamSubmissions = rows.teamSubmissions.filter(Boolean);
  const scores = rows.scores.filter(Boolean);

  const participantById = new Map<string, HackathonAdminParticipantRow>();
  for (const participant of participants) {
    participantById.set(participant.id, participant);
  }

  const teamById = new Map<string, HackathonTeam>();
  for (const team of teams) {
    teamById.set(team.id, team);
  }

  const teamIdByParticipantId = new Map<string, string>();
  for (const member of teamMembers) {
    if (!teamIdByParticipantId.has(member.participant_id)) {
      teamIdByParticipantId.set(member.participant_id, member.team_id);
    }
  }

  const currentPhaseId = resolveCurrentPhaseId(phases, enrollments);
  const teamProgress = buildTeamSummaries(
    phases,
    activities,
    enrollments,
    teams,
    teamMembers,
    participants,
    submissions,
    teamSubmissions,
    scores,
    nowMs,
    currentPhaseId,
  );

  const activitySummaries = buildActivitySummaries(
    phases,
    activities,
    enrollments,
    teams.map((team) => team.id),
    teamIdByParticipantId,
    participantById,
    teamById,
    submissions,
    teamSubmissions,
    nowMs,
  );

  const phaseSummaries = buildPhaseSummaries(
    phases,
    activities,
    teamProgress.teams,
    currentPhaseId,
  );

  const currentPhaseSummary =
    phaseSummaries.find((phase) => phase.id === currentPhaseId) ?? null;

  const participantIds = unique([
    ...participants.map((participant) => participant.id),
    ...teamMembers.map((member) => member.participant_id),
    ...submissions
      .map((submission) => getValueString(submission.participant_id))
      .filter((id): id is string => Boolean(id)),
    ...teamSubmissions
      .map((submission) => getValueString(submission.submitted_by))
      .filter((id): id is string => Boolean(id)),
  ]);
  const assignedParticipantIds = unique(teamMembers.map((member) => member.participant_id));
  const participantCount = participantIds.length;
  const assignedParticipantCount = assignedParticipantIds.length;
  const teamCount = teams.length;

  const submissionsLast24h = [...submissions, ...teamSubmissions].filter((submission) => {
    const submittedAt = toMillis(submission.submitted_at);
    return submittedAt !== null && nowMs - submittedAt <= DAY_MS;
  }).length;

  const currentPhaseSubmissionRate = currentPhaseSummary
    ? currentPhaseSummary.completionRate
    : 0;

  const stuckTeamCount = teamProgress.teams.filter(
    (team) => !team.onTrack,
  ).length;
  const teamsOnTrackCount = teamProgress.teams.filter((team) => team.onTrack).length;

  return {
    overview: {
      participantCount,
      teamCount,
      assignedParticipantCount,
      unassignedParticipantCount: Math.max(0, participantCount - assignedParticipantCount),
      submissionsLast24h,
      currentPhaseSubmissionRate,
      stuckTeamCount,
      teamsOnTrackCount,
      currentPhaseId,
    },
    phases: phaseSummaries,
    activities: activitySummaries,
    teams: teamProgress.teams,
  };
}

async function getSupabaseClient() {
  const mod = await import("./supabase");
  return mod.supabase;
}

function getQueryErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown Supabase error");
}

async function loadList<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>) {
  const { data, error } = await query;
  if (error) throw new Error(getQueryErrorMessage(error));
  if (!data) return [];
  return data.filter(Boolean) as T[];
}

export async function getHackathonAdminDashboard(
  programSlug = "super-seed-hackathon",
): Promise<HackathonAdminDashboard> {
  const supabase = await getSupabaseClient();

  const { data: program, error: programError } = await supabase
    .from("hackathon_programs")
    .select("*")
    .eq("slug", programSlug)
    .maybeSingle();

  if (programError) {
    throw new Error(getQueryErrorMessage(programError));
  }

  if (!program) {
    return EMPTY_DASHBOARD;
  }

  const phases = await loadList<HackathonProgramPhase>(
    supabase
      .from("hackathon_program_phases")
      .select("*")
      .eq("program_id", program.id)
      .order("phase_number", { ascending: true }),
  );

  if (phases.length === 0) {
    return buildHackathonAdminDashboardFromRows({
      program,
      phases: [],
      activities: [],
      enrollments: [],
      teams: [],
      members: [],
      participants: [],
      submissions: [],
      teamSubmissions: [],
      scores: [],
    });
  }

  const phaseIds = phases.map((phase) => phase.id).filter(Boolean);
  const [activities, enrollments] = await Promise.all([
    loadList<HackathonAdminActivityRow>(
      supabase
        .from("hackathon_phase_activities")
        .select("*")
        .in("phase_id", phaseIds)
        .order("display_order", { ascending: true }),
    ),
    loadList<HackathonTeamProgramEnrollment>(
      supabase
        .from("hackathon_team_program_enrollments")
        .select("*")
        .eq("program_id", program.id)
        .order("created_at", { ascending: true }),
    ),
  ]);

  const activityIds = activities.map((activity) => activity.id).filter(Boolean);
  const [submissions, teamSubmissions, teams, members, scores, participantRows] = await Promise.all([
    activityIds.length
      ? loadList<HackathonAdminSubmissionRow>(
          supabase
            .from("hackathon_phase_activity_submissions")
            .select("*")
            .in("activity_id", activityIds)
            .order("submitted_at", { ascending: false }),
        )
      : Promise.resolve([]),
    activityIds.length
      ? loadList<HackathonAdminTeamSubmissionRow>(
          supabase
            .from("hackathon_phase_activity_team_submissions")
            .select("*")
            .in("activity_id", activityIds)
            .order("submitted_at", { ascending: false }),
        )
      : Promise.resolve([]),
    loadList<HackathonTeam>(
      supabase
        .from("hackathon_teams")
        .select("*")
        .order("created_at", { ascending: true }),
    ),
    loadList<HackathonAdminTeamMemberRow>(
      supabase
        .from("hackathon_team_members")
        .select("*")
        .order("team_id", { ascending: true }),
    ),
    loadList<HackathonAdminTeamScoreRow>(
      supabase
        .from("hackathon_team_scores")
        .select("*")
        .order("total_score", { ascending: false }),
    ),
    loadList<HackathonAdminParticipantRow>(
      supabase
        .from("hackathon_participants")
        .select("*")
        .order("id", { ascending: true }),
    ),
  ]);

  return buildHackathonAdminDashboardFromRows({
    program,
    phases,
    activities,
    enrollments,
    teams,
    members,
    participants: participantRows,
    submissions,
    teamSubmissions,
    scores,
  });
}

export function deriveSubmissionInbox(
  dashboard: HackathonAdminDashboard,
): HackathonAdminInboxItem[] {
  const phaseById = new Map(dashboard.phases.map((p) => [p.id, p]));
  const items: HackathonAdminInboxItem[] = [];

  for (const activity of dashboard.activities) {
    const phase = phaseById.get(activity.phaseId);
    for (const sub of activity.submissions) {
      items.push({
        submissionId: sub.id,
        activityId: activity.id,
        activityTitle: activity.title,
        phaseId: activity.phaseId,
        phaseNumber: activity.phaseNumber,
        phaseTitle: phase?.title ?? `Phase ${activity.phaseNumber}`,
        participantId: sub.participantId,
        participantName: sub.participantName,
        teamId: sub.teamId,
        teamName: sub.teamName,
        submittedAt: sub.submittedAt,
        scope: activity.submissionScope,
        textAnswer: sub.textAnswer,
        imageUrl: sub.imageUrl,
        fileUrls: sub.fileUrls,
        status: sub.status,
      });
    }
  }

  items.sort((a, b) => {
    const aTime = new Date(a.submittedAt).getTime();
    const bTime = new Date(b.submittedAt).getTime();
    return bTime - aTime;
  });

  return items;
}

export function deriveAttentionQueue(
  dashboard: HackathonAdminDashboard,
): HackathonAdminAttentionItem[] {
  return dashboard.teams
    .filter((t) => !t.onTrack)
    .sort((a, b) => b.missingRequiredActivities - a.missingRequiredActivities)
    .map((team) => ({
      type: "team" as const,
      id: team.id,
      name: team.name ?? team.team_name ?? "Unnamed team",
      reason:
        team.offTrackReason === "missing_required_activities"
          ? `Missing ${team.missingRequiredActivities} required`
          : team.offTrackReason === "no_recent_submission"
            ? "No recent submissions"
            : "No current phase",
      severity:
        team.missingRequiredActivities > 1
          ? ("critical" as const)
          : ("warning" as const),
      missingCount: team.missingRequiredActivities,
      lastActiveAt: team.latestSubmittedAt,
      score: team.score,
      rank: team.rank,
    }));
}

export function deriveStudentDirectory(
  dashboard: HackathonAdminDashboard,
): HackathonAdminStudentRow[] {
  const participantStats = new Map<
    string,
    { count: number; latest: string | null }
  >();

  for (const activity of dashboard.activities) {
    for (const sub of activity.submissions) {
      if (!sub.participantId) continue;
      const existing = participantStats.get(sub.participantId) ?? {
        count: 0,
        latest: null,
      };
      existing.count++;
      if (!existing.latest || sub.submittedAt > existing.latest) {
        existing.latest = sub.submittedAt;
      }
      participantStats.set(sub.participantId, existing);
    }
  }

  const seen = new Set<string>();
  const rows: HackathonAdminStudentRow[] = [];

  for (const team of dashboard.teams) {
    for (const member of team.members) {
      if (seen.has(member.participantId)) continue;
      seen.add(member.participantId);
      const stats = participantStats.get(member.participantId) ?? {
        count: 0,
        latest: null,
      };
      rows.push({
        participantId: member.participantId,
        name: member.name,
        teamId: team.id,
        teamName: team.name ?? team.team_name ?? null,
        teamEmoji: member.teamEmoji,
        avatarUrl: member.avatarUrl,
        submissionCount: stats.count,
        latestSubmittedAt: stats.latest,
      });
    }
  }

  rows.sort((a, b) => {
    const aTime = a.latestSubmittedAt
      ? new Date(a.latestSubmittedAt).getTime()
      : 0;
    const bTime = b.latestSubmittedAt
      ? new Date(b.latestSubmittedAt).getTime()
      : 0;
    return bTime - aTime;
  });

  return rows;
}
