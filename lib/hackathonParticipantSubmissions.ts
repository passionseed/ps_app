import * as Sentry from "@sentry/react-native";
import { readHackathonParticipant } from "./hackathon-mode";
import { supabase } from "./supabase";

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
  hasAttachment: boolean;
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
  if (rows.length === 0) return [];

  const activityIds = [...new Set(rows.map((r) => r.activity_id).filter(Boolean))];
  const { data: activities, error: actErr } = await supabase
    .from("hackathon_phase_activities")
    .select("id, title, phase_id")
    .in("id", activityIds);

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
      hasAttachment: Boolean(r.image_url || (r.file_urls && r.file_urls.length > 0)),
    }));
  }

  const actList = activities as ActivityRow[];
  const phaseIds = [
    ...new Set(actList.map((a) => a.phase_id).filter(Boolean) as string[]),
  ];

  const { data: phases } = await supabase
    .from("hackathon_program_phases")
    .select("id, title, phase_number")
    .in("id", phaseIds);

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
      hasAttachment: Boolean(r.image_url || (r.file_urls && r.file_urls.length > 0)),
    };
  });
}
