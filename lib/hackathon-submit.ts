import { readHackathonParticipant } from "./hackathon-mode";
import * as Sentry from "@sentry/react-native";
import { computeTeamRank } from "./hackathonRanking";
import { supabase } from "./supabase";
import {
  uploadAssetToSupabase,
  formatUploadError,
  isRetryableUploadError,
} from "./storageUpload";

export type SubmitResult = {
  submissionId: string;
  url: string | null;
};

// ---------------------------------------------------------------------------
// Score helpers
// ---------------------------------------------------------------------------

/**
 * After a submission is inserted, look up the activity's scope + assessment
 * points, then add the appropriate score to the team.
 *
 * Individual: floor(points_possible / team_member_count)
 * Team:       points_possible
 *
 * Fires-and-forgets safely — submission is already persisted before this runs.
 */
async function awardScore(
  submissionId: string,
  activityId: string,
  assessmentId: string,
  participantId: string
): Promise<void> {
  // 1. Get activity scope + all assessments for this activity in parallel
  const [{ data: activity }, { data: allAssessments }, { data: thisAssessment }] = await Promise.all([
    supabase
      .from("hackathon_phase_activities")
      .select("submission_scope")
      .eq("id", activityId)
      .maybeSingle(),
    supabase
      .from("hackathon_phase_activity_assessments")
      .select("points_possible")
      .eq("activity_id", activityId),
    supabase
      .from("hackathon_phase_activity_assessments")
      .select("metadata")
      .eq("id", assessmentId)
      .maybeSingle(),
  ]);

  // Points = sum of all assessments in the activity
  const pointsPossible = (allAssessments ?? []).reduce(
    (sum, a) => sum + (a.points_possible ?? 0),
    0
  );
  if (pointsPossible <= 0) return; // nothing to award

  // 2. Find the team this participant belongs to
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!membership?.team_id) return; // not on a team

  // 3. Calculate points to award
  // is_group_submission in assessment metadata takes priority over activity submission_scope
  const isGroupSubmission = (thisAssessment?.metadata as any)?.is_group_submission === true;
  const scope = isGroupSubmission ? "team" : (activity?.submission_scope ?? "individual");
  let pointsAwarded: number;
  let memberCount = 1;

  if (scope === "individual") {
    const { count } = await supabase
      .from("hackathon_team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", membership.team_id);
    memberCount = count ?? 1;
    pointsAwarded = Math.floor(pointsPossible / memberCount);
  } else {
    // team scope — full points, awarded once per team submission
    pointsAwarded = pointsPossible;
  }

  if (pointsAwarded <= 0) return;

  if (scope === "team") {
    // Check if another team member already submitted any assessment for this activity
    const { data, error: lookupError } = await supabase
      .from("hackathon_phase_activity_team_submissions")
      .select("id")
      .eq("team_id", membership.team_id)
      .eq("activity_id", activityId)
      .not("id", "eq", submissionId)
      .maybeSingle();

    if (!lookupError && data?.id) {
      return;
    }
  }

  // 4. Log the score event (idempotent via UNIQUE on submission_id)
  const { error: eventError } = await supabase
    .from("hackathon_team_score_events")
    .insert({
      team_id: membership.team_id,
      submission_id: submissionId,
      activity_id: activityId,
      participant_id: participantId,
      scope,
      points_possible: pointsPossible,
      member_count: memberCount,
      points_awarded: pointsAwarded,
    });

  if (eventError) {
    // Duplicate submission or previously-scored team activity — skip
    if (eventError.code === "23505") return;
    console.warn("[score] event insert failed", eventError.message);
    return;
  }

  // 5. Upsert the team total
  const { data: existing } = await supabase
    .from("hackathon_team_scores")
    .select("id, total_score")
    .eq("team_id", membership.team_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("hackathon_team_scores")
      .update({ total_score: existing.total_score + pointsAwarded })
      .eq("team_id", membership.team_id);
  } else {
    await supabase
      .from("hackathon_team_scores")
      .insert({ team_id: membership.team_id, total_score: pointsAwarded });
  }
}

export async function submitTextAnswer(
  activityId: string,
  assessmentId: string,
  textAnswer: string
): Promise<SubmitResult> {
  const participant = await readHackathonParticipant();
  if (!participant) throw new Error("Not logged in");

  try {
    // Delete previous submission for this assessment before inserting new one
    const { error: deleteError } = await supabase
      .from("hackathon_phase_activity_submissions")
      .delete()
      .eq("participant_id", participant.id)
      .eq("assessment_id", assessmentId);

    if (deleteError) {
      throw Object.assign(new Error(deleteError.message), { stage: "delete_previous" });
    }

    const { data, error } = await supabase
      .from("hackathon_phase_activity_submissions")
      .insert({
        participant_id: participant.id,
        activity_id: activityId,
        assessment_id: assessmentId,
        text_answer: textAnswer,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { stage: "insert_submission" });
    }

    // Award score immediately after submit (non-blocking)
    awardScore(data.id, activityId, assessmentId, participant.id).catch((e) =>
      console.warn("[score] awardScore failed", e)
    );

    return { submissionId: data.id, url: null };
  } catch (e: any) {
    Sentry.captureException(e, {
      tags: {
        component: "hackathon-submit",
        action: "submitTextAnswer",
        activityId,
        assessmentId,
        stage: e?.stage || "unknown",
      },
      extra: {
        participantId: participant.id,
        textAnswerLength: textAnswer?.length,
        errorMessage: e?.message,
        stage: e?.stage,
      },
    });
    // Mark as captured so screen-level catch can avoid duplicate reporting
    (e as any).__sentryCaptured = true;
    throw e;
  }
}

export type ActivitySubmissionStatus = {
  activity_id: string;
  status: string;
};

export type SubmissionRecord = {
  id: string;
  assessment_id?: string;
  text_answer?: string;
  image_url?: string;
  file_urls?: string[];
  submitted_at: string;
};

export type TeammateSubmissionRecord = SubmissionRecord & {
  participant_id: string;
  participant_name: string;
};

export async function fetchActivitySubmissions(
  activityId: string
): Promise<SubmissionRecord[]> {
  const participant = await readHackathonParticipant();
  if (!participant) return [];

  const { data, error } = await supabase
    .from("hackathon_phase_activity_submissions")
    .select("id, assessment_id, text_answer, image_url, file_urls, submitted_at")
    .eq("participant_id", participant.id)
    .eq("activity_id", activityId)
    .order("submitted_at", { ascending: false });

  if (error) {
    const fetchError = Object.assign(new Error(error.message), {
      stage: "query_submissions",
      code: error.code,
      __sentryCaptured: true,
    });
    Sentry.captureException(fetchError, {
      tags: {
        component: "hackathon-submit",
        action: "fetchActivitySubmissions",
        activityId,
        stage: "query_submissions",
      },
      extra: {
        participantId: participant.id,
        errorCode: error.code,
        errorMessage: error.message,
      },
    });
    throw fetchError;
  }
  return data as SubmissionRecord[];
}

export async function fetchTeammateActivitySubmissions(
  activityId: string
): Promise<TeammateSubmissionRecord[]> {
  const participant = await readHackathonParticipant();
  if (!participant) return [];

  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (!membership?.team_id) return [];

  const { data: teamSub } = await supabase
    .from("hackathon_phase_activity_team_submissions")
    .select("id, assessment_id, text_answer, image_url, file_urls, submitted_at, submitted_by")
    .eq("team_id", membership.team_id)
    .eq("activity_id", activityId)
    .order("submitted_at", { ascending: false });

  if (!teamSub || teamSub.length === 0) return [];

  const submitterIds = [...new Set(teamSub.map((s) => s.submitted_by).filter(Boolean))]
    .filter((id) => id !== participant.id);

  if (submitterIds.length === 0) return [];

  const { data: participants } = await supabase
    .from("hackathon_participants")
    .select("id, name")
    .in("id", submitterIds);

  const nameMap = new Map(
    (participants ?? []).map((p) => [p.id, p.name ?? "Teammate"])
  );

  return teamSub
    .filter((s) => s.submitted_by && s.submitted_by !== participant.id)
    .map((s) => ({
      id: s.id,
      assessment_id: s.assessment_id,
      text_answer: s.text_answer,
      image_url: s.image_url,
      file_urls: s.file_urls,
      submitted_at: s.submitted_at,
      participant_id: s.submitted_by,
      participant_name: nameMap.get(s.submitted_by) ?? "Teammate",
    }));
}

export async function fetchActivitySubmissionStatuses(
  activityIds: string[]
): Promise<Record<string, string>> {
  if (activityIds.length === 0) return {};
  const participant = await readHackathonParticipant();
  if (!participant) return {};

  const { data, error } = await supabase
    .from("hackathon_phase_activity_submissions")
    .select("activity_id, status")
    .eq("participant_id", participant.id)
    .in("activity_id", activityIds);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const s of data) {
    map[s.activity_id] = s.status;
  }
  return map;
}

/**
 * Returns team-level submission statuses for activities.
 * Queries the team_submissions table directly by team_id.
 */
export async function fetchTeamActivitySubmissionStatuses(
  activityIds: string[]
): Promise<Record<string, string>> {
  if (activityIds.length === 0) return {};
  const participant = await readHackathonParticipant();
  if (!participant) return {};

  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (!membership?.team_id) return {};

  const { data, error } = await supabase
    .from("hackathon_phase_activity_team_submissions")
    .select("activity_id, status")
    .eq("team_id", membership.team_id)
    .in("activity_id", activityIds);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const s of data) {
    map[s.activity_id] =
      s.status === "passed" || s.status === "submitted" ? "passed" : s.status;
  }
  return map;
}

export async function submitFile(
  activityId: string,
  assessmentId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<SubmitResult> {
  const participant = await readHackathonParticipant();
  if (!participant) throw new Error("Not logged in");

  const ext = fileName.split(".").pop() ?? "bin";

  // Use shared Android-safe upload helper
  let uploadResult;
  try {
    uploadResult = await uploadAssetToSupabase(
      { uri: fileUri, fileName, mimeType },
      "hackathon_submissions",
      () => `${participant.id}/${activityId}/${Date.now()}.${ext}`
    );
  } catch (e: unknown) {
    const formattedMessage = formatUploadError(e);
    const formattedError = new Error(formattedMessage);
    Object.assign(formattedError, { stage: "upload_storage", originalError: e });
    // Capture original error to preserve network failure details, with formatted message as context
    Sentry.captureException(e instanceof Error ? e : new Error(String(e)), {
      tags: {
        component: "hackathon-submit",
        action: "submitFile",
        activityId,
        assessmentId,
        stage: "upload_storage",
      },
      extra: {
        participantId: participant.id,
        fileName,
        mimeType,
        formattedErrorMessage: formattedMessage,
        originalErrorType: e?.constructor?.name,
        originalErrorString: String(e),
      },
    });
    // Mark as captured so screen-level catch can avoid duplicate reporting
    (formattedError as any).__sentryCaptured = true;
    throw formattedError;
  }

  const fileUrl = uploadResult.url;
  const isImage = uploadResult.mimeType.startsWith("image/");

  try {
    // Delete previous submission for this assessment before inserting new one
    const { error: deleteError } = await supabase
      .from("hackathon_phase_activity_submissions")
      .delete()
      .eq("participant_id", participant.id)
      .eq("assessment_id", assessmentId);

    if (deleteError) {
      throw Object.assign(new Error(deleteError.message), { stage: "delete_previous" });
    }

    const { data, error } = await supabase
      .from("hackathon_phase_activity_submissions")
      .insert({
        participant_id: participant.id,
        activity_id: activityId,
        assessment_id: assessmentId,
        image_url: isImage ? fileUrl : null,
        file_urls: isImage ? null : [fileUrl],
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { stage: "insert_submission" });
    }

    // Award score immediately after submit (non-blocking)
    awardScore(data.id, activityId, assessmentId, participant.id).catch((e) =>
      console.warn("[score] awardScore failed", e)
    );

    return { submissionId: data.id, url: fileUrl };
  } catch (e: any) {
    Sentry.captureException(e, {
      tags: {
        component: "hackathon-submit",
        action: "submitFile",
        activityId,
        assessmentId,
        stage: e?.stage || "unknown",
      },
      extra: {
        participantId: participant.id,
        fileName,
        mimeType,
        isImage: uploadResult?.mimeType?.startsWith("image/"),
        fileUrl: uploadResult?.url,
        errorMessage: e?.message,
        stage: e?.stage,
      },
    });
    // Mark as captured so screen-level catch can avoid duplicate reporting
    (e as any).__sentryCaptured = true;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Public score reader
// ---------------------------------------------------------------------------

export type ScoreBreakdownItem = {
  id: string;
  activity_id: string;
  activity_title: string;
  scope: string;
  points_possible: number;
  member_count: number;
  points_awarded: number;
  created_at: string;
  participant_name?: string;
};

type RawScoreEvent = {
  id: string;
  activity_id: string | null;
  participant_id: string | null;
  scope: string;
  points_possible: number;
  member_count: number;
  points_awarded: number;
  created_at: string;
};

/** Fetches the team's score breakdown from score events. */
export async function fetchTeamScoreBreakdown(teamId: string): Promise<ScoreBreakdownItem[]> {
  // 1. Get score events for this team
  const { data: events } = await supabase
    .from("hackathon_team_score_events")
    .select("id, activity_id, participant_id, scope, points_possible, member_count, points_awarded, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (!events || events.length === 0) return [];

  const activityIds = [...new Set(events.map((e: any) => e.activity_id).filter(Boolean))];
  const participantIds = [...new Set(events.map((e: any) => e.participant_id).filter(Boolean))];

  // 2. Fetch activities and participants in parallel
  const [activitiesResult, participantsResult] = await Promise.all([
    activityIds.length > 0
      ? supabase.from("hackathon_phase_activities").select("id, title").in("id", activityIds)
      : { data: [] },
    participantIds.length > 0
      ? supabase.from("hackathon_participants").select("id, name").in("id", participantIds)
      : { data: [] },
  ]);

  const activityMap = new Map((activitiesResult.data ?? []).map((a: any) => [a.id, a]));
  const participantMap = new Map((participantsResult.data ?? []).map((p: any) => [p.id, p.name]));

  // 3. Build breakdown items
  const breakdown: ScoreBreakdownItem[] = [];

  for (const event of events as RawScoreEvent[]) {
    const activity = event.activity_id ? activityMap.get(event.activity_id) : null;

    breakdown.push({
      id: event.id,
      activity_id: event.activity_id ?? "",
      activity_title: activity?.title ?? "Mentor Guide Read",
      scope: event.scope,
      points_possible: event.points_possible,
      member_count: event.member_count,
      points_awarded: event.points_awarded,
      created_at: event.created_at,
      participant_name: event.participant_id ? participantMap.get(event.participant_id) : undefined,
    });
  }

  return breakdown;
}

/** Returns the team's current total score by summing events in real-time. */
export async function fetchTeamScore(teamId: string): Promise<number> {
  const { data } = await supabase
    .from("hackathon_team_score_events")
    .select("points_awarded")
    .eq("team_id", teamId);

  if (!data || data.length === 0) return 0;
  return data.reduce((sum: number, e: any) => sum + (e.points_awarded ?? 0), 0);
}

export type TeamImpact = {
  teamId: string;
  activitiesCompleted: number;
  score: number;
  rank: number | null; // e.g. 1 means "#1", null if no score yet
};

/**
 * Fetches team impact stats in parallel:
 * - activitiesCompleted: distinct activities submitted by any team member
 * - score: real-time sum of points_awarded from hackathon_team_score_events
 * - rank: based on hackathon_team_scores.total_score (pre-computed, kept in sync on each scoring event)
 */
export async function fetchTeamImpact(teamId: string): Promise<TeamImpact> {
  const participant = await readHackathonParticipant();

  const [scoreEventsResult, submissionsResult, teamSubmissionsResult, allScoresResult, allTeamsResult] = await Promise.all([
    // Team score: calculate in real-time from score events
    supabase
      .from("hackathon_team_score_events")
      .select("points_awarded")
      .eq("team_id", teamId),

    // Individual-scope activities completed by any member of this team
    participant?.id
      ? supabase
          .from("hackathon_team_members")
          .select("participant_id")
          .eq("team_id", teamId)
          .then(async ({ data: members }) => {
            const ids = (members ?? []).filter(Boolean).map((m: any) => m.participant_id).filter(Boolean);
            if (ids.length === 0) return { data: [] };
            return supabase
              .from("hackathon_phase_activity_submissions")
              .select("activity_id")
              .in("participant_id", ids)
              .eq("status", "submitted");
          })
      : Promise.resolve({ data: [] }),

    // Team-scope activities completed by this team
    supabase
      .from("hackathon_phase_activity_team_submissions")
      .select("activity_id")
      .eq("team_id", teamId)
      .eq("status", "submitted"),

    // All team scores for rank computation (pre-computed totals)
    supabase
      .from("hackathon_team_scores")
      .select("team_id, total_score")
      .order("total_score", { ascending: false }),

    // All teams so teams with no score yet still receive a visible rank
    supabase
      .from("hackathon_teams")
      .select("id"),
  ]);

  // Calculate score in real-time from events
  const scoreEvents: any[] = (scoreEventsResult.data ?? []).filter(Boolean);
  const score = scoreEvents.reduce((sum: number, e: any) => sum + (e.points_awarded ?? 0), 0);

  // Count distinct activity_ids from both individual and team submissions
  const individualSubs = ((submissionsResult as any).data ?? []).filter(Boolean);
  const teamSubs = (teamSubmissionsResult.data ?? []).filter(Boolean);
  const uniqueActivities = new Set([
    ...individualSubs.map((s: any) => s?.activity_id).filter(Boolean),
    ...teamSubs.map((s: any) => s?.activity_id).filter(Boolean),
  ]);
  const activitiesCompleted = uniqueActivities.size;

  // Rank: 1 + number of teams with a strictly higher score.
  // Teams with the same score share the same rank, including teams still at 0.
  const allScores: { team_id: string; total_score: number }[] =
    ((allScoresResult.data as any) ?? []).filter(Boolean);
  const allTeamIds = ((allTeamsResult.data as Array<{ id: string }> | null) ?? [])
    .filter(Boolean)
    .map((team) => team?.id)
    .filter(Boolean);
  const rank = computeTeamRank(teamId, allTeamIds, allScores);

  return { teamId, activitiesCompleted, score, rank };
}

// ---------------------------------------------------------------------------
// Recalculate all team scores from submissions (ignores grading)
// ---------------------------------------------------------------------------

export async function recalculateAllTeamScores(): Promise<void> {
  // 1. Fetch all assessments with points and activity metadata
  const { data: assessments, error: assessErr } = await supabase
    .from("hackathon_phase_activity_assessments")
    .select("id, activity_id, points_possible, metadata");
  if (assessErr || !assessments) {
    console.error("[recalc] failed to load assessments", assessErr);
    return;
  }

  const assessmentMap = new Map<string, { activityId: string; points: number; isGroup: boolean }>();
  for (const a of assessments) {
    assessmentMap.set(a.id, {
      activityId: a.activity_id,
      points: a.points_possible ?? 0,
      isGroup: (a.metadata as any)?.is_group_submission === true,
    });
  }

  // 2. Fetch all activities to determine scope
  const { data: activities, error: actErr } = await supabase
    .from("hackathon_phase_activities")
    .select("id, submission_scope");
  if (actErr || !activities) {
    console.error("[recalc] failed to load activities", actErr);
    return;
  }

  const scopeMap = new Map<string, string>();
  for (const a of activities) {
    scopeMap.set(a.id, a.submission_scope ?? "individual");
  }

  // 3. Fetch all individual submissions + team submissions
  const [{ data: indSubs }, { data: teamSubs }] = await Promise.all([
    supabase.from("hackathon_phase_activity_submissions").select("id, participant_id, assessment_id, activity_id"),
    supabase.from("hackathon_phase_activity_team_submissions").select("id, team_id, assessment_id, activity_id"),
  ]);

  if (!indSubs && !teamSubs) {
    console.error("[recalc] failed to load submissions");
    return;
  }

  // 4. Build team score map
  const teamScoreMap = new Map<string, number>();

  // Fetch all team memberships
  const { data: memberships } = await supabase
    .from("hackathon_team_members")
    .select("participant_id, team_id");
  const memberTeamMap = new Map<string, string>();
  for (const m of memberships ?? []) {
    memberTeamMap.set(m.participant_id, m.team_id);
  }

  // Count team sizes
  const teamSizeMap = new Map<string, number>();
  for (const m of memberships ?? []) {
    teamSizeMap.set(m.team_id, (teamSizeMap.get(m.team_id) ?? 0) + 1);
  }

  const teamScoreCache = new Map<string, Set<string>>();

  function getScope(a: { activityId: string; isGroup: boolean }): string {
    if (a.isGroup) return "team";
    return scopeMap.get(a.activityId) ?? "individual";
  }

  for (const sub of indSubs ?? []) {
    if (!sub.assessment_id) continue;
    const a = assessmentMap.get(sub.assessment_id);
    if (!a || a.points <= 0) continue;

    const scope = getScope(a);
    const teamId = memberTeamMap.get(sub.participant_id);
    if (!teamId) continue;

    if (scope === "individual") {
      const memberCount = teamSizeMap.get(teamId) ?? 1;
      const pts = Math.floor(a.points / memberCount);
      teamScoreMap.set(teamId, (teamScoreMap.get(teamId) ?? 0) + pts);
    } else {
      if (!teamScoreCache.has(teamId)) teamScoreCache.set(teamId, new Set());
      const set = teamScoreCache.get(teamId)!;
      if (set.has(a.activityId)) continue;
      set.add(a.activityId);
      teamScoreMap.set(teamId, (teamScoreMap.get(teamId) ?? 0) + a.points);
    }
  }

  for (const sub of teamSubs ?? []) {
    if (!sub.assessment_id || !sub.team_id) continue;
    const a = assessmentMap.get(sub.assessment_id);
    if (!a || a.points <= 0) continue;

    const scope = getScope(a);

    if (scope === "individual") {
      const memberCount = teamSizeMap.get(sub.team_id) ?? 1;
      const pts = Math.floor(a.points / memberCount);
      teamScoreMap.set(sub.team_id, (teamScoreMap.get(sub.team_id) ?? 0) + pts);
    } else {
      if (!teamScoreCache.has(sub.team_id)) teamScoreCache.set(sub.team_id, new Set());
      const set = teamScoreCache.get(sub.team_id)!;
      if (set.has(a.activityId)) continue;
      set.add(a.activityId);
      teamScoreMap.set(sub.team_id, (teamScoreMap.get(sub.team_id) ?? 0) + a.points);
    }
  }

  // 5. Upsert all team scores
  let updated = 0;
  let created = 0;
  for (const [teamId, score] of teamScoreMap) {
    const { data: existingTeamScore } = await supabase
      .from("hackathon_team_scores")
      .select("id")
      .eq("team_id", teamId)
      .maybeSingle();

    if (existingTeamScore?.id) {
      const { error } = await supabase
        .from("hackathon_team_scores")
        .update({ total_score: score })
        .eq("team_id", teamId);
      if (error) {
        console.warn("[recalc] failed to update team", teamId, error);
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase
        .from("hackathon_team_scores")
        .insert({ team_id: teamId, total_score: score });
      if (error) {
        console.warn("[recalc] failed to insert team", teamId, error);
      } else {
        created++;
      }
    }
  }

  console.log(`[recalc] Updated ${updated} teams, created ${created} teams`);
}
