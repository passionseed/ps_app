import * as Sentry from "@sentry/react-native";
import { readHackathonParticipant } from "./hackathon-mode";
import { supabase } from "./supabase";

export type LatestFeedback = {
  body: string;
  type: "assessment_review" | "mentor_comment";
  createdAt: string;
  scoreAwarded?: number;
  pointsPossible?: number;
};

export type ParticipantSubmissionDashboardRow = {
  id: string;
  activityId: string;
  activityTitle: string;
  phaseId: string;
  phaseTitle: string;
  phaseNumber: number | null;
  status: string | null;
  submittedAt: string;
  assessmentId: string | null;
  /** Short preview; full text lives on the activity screen */
  textPreview: string | null;
  /** Full text answer for inline revision */
  fullText: string | null;
  /** Assessment type: text_answer, image_upload, file_upload */
  assessmentType: string | null;
  /** Submitted image URL */
  imageUrl: string | null;
  /** Submitted file URLs */
  fileUrls: string[] | null;
  hasAttachment: boolean;
  commentCount: number;
  latestFeedback: LatestFeedback | null;
};

type RawSub = {
  id: string;
  activity_id: string;
  status: string | null;
  submitted_at: string;
  assessment_id: string | null;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[] | null;
};

type ActivityRow = {
  id: string;
  title: string | null;
  phase_id: string | null;
};

type PhaseRow = {
  id: string;
  title: string | null;
  phase_number: number | null;
};

function previewText(text: string | null | undefined, max = 140): string | null {
  if (!text || !text.trim()) return null;
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * All submission rows for the logged-in hackathon participant, with activity + phase labels.
 */
export async function fetchParticipantSubmissionsDashboard(): Promise<
  ParticipantSubmissionDashboardRow[]
> {
  const participant = await readHackathonParticipant();
  if (!participant) return [];

  const { data: subs, error } = await supabase
    .from("hackathon_phase_activity_submissions")
    .select(
      "id, activity_id, status, submitted_at, assessment_id, text_answer, image_url, file_urls",
    )
    .eq("participant_id", participant.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    Sentry.captureException(
      Object.assign(new Error(error.message), { code: error.code }),
      {
        tags: { component: "hackathonParticipantSubmissions" },
        extra: { participantId: participant.id },
      },
    );
    throw Object.assign(new Error(error.message), { stage: "list_submissions" });
  }

  const rows = (subs ?? []) as RawSub[];

  // Also fetch team-scope submissions for this participant's team
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (membership?.team_id) {
    const { data: teamSubs } = await supabase
      .from("hackathon_phase_activity_team_submissions")
      .select("id, activity_id, status, submitted_at, assessment_id, text_answer, image_url, file_urls")
      .eq("team_id", membership.team_id)
      .order("submitted_at", { ascending: false });

    if (teamSubs) {
      const existingActivityIds = new Set(rows.map((r) => r.activity_id));
      for (const ts of teamSubs as RawSub[]) {
        if (!existingActivityIds.has(ts.activity_id)) {
          rows.push(ts);
        }
      }
    }
  }

  if (rows.length === 0) return [];

  const activityIds = [...new Set(rows.map((r) => r.activity_id).filter(Boolean))];
  const [{ data: activities, error: actErr }, { data: assessments }] = await Promise.all([
    supabase
      .from("hackathon_phase_activities")
      .select("id, title, phase_id")
      .in("id", activityIds),
    supabase
      .from("hackathon_phase_activity_assessments")
      .select("id, activity_id, assessment_type")
      .in("activity_id", activityIds),
  ]);

  // Build assessment type map: assessmentId → assessment_type
  const assessmentTypeMap = new Map<string, string>();
  for (const a of (assessments ?? []) as { id: string; activity_id: string; assessment_type: string }[]) {
    assessmentTypeMap.set(a.id, a.assessment_type);
  }

  if (actErr || !activities) {
    return rows.map((r) => ({
      id: r.id,
      activityId: r.activity_id,
      activityTitle: "Activity",
      phaseId: "",
      phaseTitle: "",
      phaseNumber: null,
      status: r.status,
      submittedAt: r.submitted_at,
      assessmentId: r.assessment_id,
      textPreview: previewText(r.text_answer),
      fullText: r.text_answer?.trim() || null,
      assessmentType: r.assessment_id ? assessmentTypeMap.get(r.assessment_id) ?? null : null,
      imageUrl: r.image_url,
      fileUrls: r.file_urls,
      hasAttachment: Boolean(r.image_url || (r.file_urls && r.file_urls.length > 0)),
      commentCount: 0,
      latestFeedback: null,
    }));
  }

  const actList = activities as ActivityRow[];
  const phaseIds = [
    ...new Set(actList.map((a) => a.phase_id).filter(Boolean) as string[]),
  ];

  // Fetch phases, comment counts, and inbox feedback in parallel
  const [{ data: phases }, commentCountsResult, inboxResult] = await Promise.all([
    supabase
      .from("hackathon_program_phases")
      .select("id, title, phase_number")
      .in("id", phaseIds),
    supabase
      .from("hackathon_activity_comments")
      .select("activity_id")
      .in("activity_id", activityIds)
      .is("deleted_at", null),
    supabase
      .from("hackathon_participant_inbox_items")
      .select("metadata, body, type, created_at")
      .eq("participant_id", participant.id)
      .in("type", ["assessment_review", "mentor_comment"])
      .order("created_at", { ascending: false }),
  ]);

  // Build comment count map: activityId → count
  const commentCountMap = new Map<string, number>();
  for (const c of (commentCountsResult.data ?? []) as { activity_id: string }[]) {
    commentCountMap.set(c.activity_id, (commentCountMap.get(c.activity_id) ?? 0) + 1);
  }

  // Build reverse lookup: submission UUID → activity_id
  const submissionToActivity = new Map(rows.map(r => [r.id, r.activity_id]));

  // Build latest feedback map: activityId → LatestFeedback (first match wins)
  const feedbackMap = new Map<string, LatestFeedback>();
  for (const item of (inboxResult.data ?? []) as {
    metadata: Record<string, unknown>;
    body: string;
    type: string;
    created_at: string;
  }[]) {
    const subId = typeof item.metadata?.submission_id === 'string'
      ? item.metadata.submission_id : undefined;
    const actId = (typeof item.metadata?.activity_id === 'string'
      ? item.metadata.activity_id : undefined)
      ?? (subId ? submissionToActivity.get(subId) : undefined);
    if (!actId || feedbackMap.has(actId)) continue;
    feedbackMap.set(actId, {
      body: item.body,
      type: item.type as LatestFeedback["type"],
      createdAt: item.created_at,
      scoreAwarded: item.metadata?.score_awarded as number | undefined,
      pointsPossible: item.metadata?.points_possible as number | undefined,
    });
  }

  const phaseById = new Map(
    ((phases ?? []) as PhaseRow[]).map((p) => [p.id, p]),
  );
  const activityById = new Map(actList.map((a) => [a.id, a]));

  return rows.map((r) => {
    const act = activityById.get(r.activity_id);
    const ph = act?.phase_id ? phaseById.get(act.phase_id) : undefined;
    return {
      id: r.id,
      activityId: r.activity_id,
      activityTitle: act?.title?.trim() || "Activity",
      phaseId: act?.phase_id ?? "",
      phaseTitle: ph?.title?.trim() || "",
      phaseNumber: ph?.phase_number ?? null,
      status: r.status,
      submittedAt: r.submitted_at,
      assessmentId: r.assessment_id,
      textPreview: previewText(r.text_answer),
      fullText: r.text_answer?.trim() || null,
      assessmentType: r.assessment_id ? assessmentTypeMap.get(r.assessment_id) ?? null : null,
      imageUrl: r.image_url,
      fileUrls: r.file_urls,
      hasAttachment: Boolean(r.image_url || (r.file_urls && r.file_urls.length > 0)),
      commentCount: commentCountMap.get(r.activity_id) ?? 0,
      latestFeedback: feedbackMap.get(r.activity_id) ?? null,
    };
  });
}
