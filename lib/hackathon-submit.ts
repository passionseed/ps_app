import { readHackathonParticipant } from "./hackathon-mode";
import { computeTeamRank } from "./hackathonRanking";
import { supabase } from "./supabase";

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
  // 1. Get activity scope and assessment points in parallel
  const [{ data: activity }, { data: assessment }] = await Promise.all([
    supabase
      .from("hackathon_phase_activities")
      .select("submission_scope")
      .eq("id", activityId)
      .maybeSingle(),
    supabase
      .from("hackathon_phase_activity_assessments")
      .select("points_possible")
      .eq("id", assessmentId)
      .maybeSingle(),
  ]);

  const pointsPossible = assessment?.points_possible ?? 0;
  if (pointsPossible <= 0) return; // nothing to award

  // 2. Find the team this participant belongs to
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!membership?.team_id) return; // not on a team

  // 3. Calculate points to award
  const scope = activity?.submission_scope ?? "individual";
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
    // Duplicate submission — score already awarded, skip
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

  if (error) throw new Error(error.message);

  // Award score immediately after submit (non-blocking)
  awardScore(data.id, activityId, assessmentId, participant.id).catch((e) =>
    console.warn("[score] awardScore failed", e)
  );

  return { submissionId: data.id, url: null };
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

  if (error || !data) return [];
  return data as SubmissionRecord[];
}

export async function fetchTeammateActivitySubmissions(
  activityId: string
): Promise<TeammateSubmissionRecord[]> {
  const participant = await readHackathonParticipant();
  if (!participant) return [];

  const { data: membership, error: membershipError } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (membershipError || !membership?.team_id) return [];

  const { data: members, error: membersError } = await supabase
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", membership.team_id);

  if (membersError || !members) return [];

  const teammateIds = members
    .filter(Boolean)
    .map((member) => member.participant_id)
    .filter((id): id is string => Boolean(id) && id !== participant.id);

  if (teammateIds.length === 0) return [];

  const { data: submissions, error: submissionsError } = await supabase
    .from("hackathon_phase_activity_submissions")
    .select("id, participant_id, assessment_id, text_answer, image_url, file_urls, submitted_at")
    .in("participant_id", teammateIds)
    .eq("activity_id", activityId)
    .order("submitted_at", { ascending: false });

  if (submissionsError || !submissions) return [];

  const { data: participants, error: participantsError } = await supabase
    .from("hackathon_participants")
    .select("id, name")
    .in("id", teammateIds);

  if (participantsError || !participants) return [];

  const participantNameMap = new Map(
    participants.filter(Boolean).map((row) => [row.id, row.name ?? "Teammate"])
  );

  return submissions.filter(Boolean).map((submission) => ({
    ...(submission as SubmissionRecord),
    participant_id: submission.participant_id,
    participant_name: participantNameMap.get(submission.participant_id) ?? "Teammate",
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

export async function submitFile(
  activityId: string,
  assessmentId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<SubmitResult> {
  const participant = await readHackathonParticipant();
  if (!participant) throw new Error("Not logged in");

  const ext = fileName.split('.').pop() ?? "bin";
  const path = `${participant.id}/${activityId}/${Date.now()}.${ext}`;

  // Use arrayBuffer() instead of blob() — more reliable on React Native
  // where Blob polyfill has limited/intermittent support
  const res = await fetch(fileUri);
  if (!res.ok) {
    throw new Error(`Failed to read file: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("hackathon_submissions")
    .upload(path, arrayBuffer, { contentType: mimeType });

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage
    .from("hackathon_submissions")
    .getPublicUrl(path);
    
  const fileUrl = publicUrlData.publicUrl;
  const isImage = mimeType.startsWith("image/");

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

  if (error) throw new Error(error.message);

  // Award score immediately after submit (non-blocking)
  awardScore(data.id, activityId, assessmentId, participant.id).catch((e) =>
    console.warn("[score] awardScore failed", e)
  );

  return { submissionId: data.id, url: fileUrl };
}

// ---------------------------------------------------------------------------
// Public score reader
// ---------------------------------------------------------------------------

/** Returns the team's current total score, or 0 if not found. */
export async function fetchTeamScore(teamId: string): Promise<number> {
  const { data } = await supabase
    .from("hackathon_team_scores")
    .select("total_score")
    .eq("team_id", teamId)
    .maybeSingle();
  return data?.total_score ?? 0;
}

export type TeamImpact = {
  activitiesCompleted: number;
  score: number;
  rank: number | null; // e.g. 1 means "#1", null if no score yet
};

/**
 * Fetches team impact stats in parallel:
 * - activitiesCompleted: distinct activities submitted by any team member
 * - score: total_score from hackathon_team_scores
 * - rankPercent: percentile rank among all teams with a score (top X%)
 */
export async function fetchTeamImpact(teamId: string): Promise<TeamImpact> {
  const participant = await readHackathonParticipant();

  const [scoreResult, submissionsResult, allScoresResult, allTeamsResult] = await Promise.all([
    // Team score
    supabase
      .from("hackathon_team_scores")
      .select("total_score")
      .eq("team_id", teamId)
      .maybeSingle(),

    // Distinct activities completed by any member of this team
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

    // All team scores for rank computation
    supabase
      .from("hackathon_team_scores")
      .select("team_id, total_score")
      .order("total_score", { ascending: false }),

    // All teams so teams with no score yet still receive a visible rank
    supabase
      .from("hackathon_teams")
      .select("id"),
  ]);

  const score = scoreResult.data?.total_score ?? 0;

  // Count distinct activity_ids
  const submissions = ((submissionsResult as any).data ?? []).filter(Boolean);
  const uniqueActivities = new Set(submissions.filter(Boolean).map((s: any) => s?.activity_id).filter(Boolean));
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

  return { activitiesCompleted, score, rank };
}
