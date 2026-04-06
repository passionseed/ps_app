import { readHackathonParticipant } from "./hackathon-mode";
import { supabase } from "./supabase";

export type SubmitResult = {
  submissionId: string;
  url: string | null;
};

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
  return { submissionId: data.id, url: null };
}

export type ActivitySubmissionStatus = {
  activity_id: string;
  status: string;
};

export type SubmissionRecord = {
  id: string;
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
    .select("id, text_answer, image_url, file_urls, submitted_at")
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
    .map((member) => member.participant_id)
    .filter((id): id is string => Boolean(id) && id !== participant.id);

  if (teammateIds.length === 0) return [];

  const { data: submissions, error: submissionsError } = await supabase
    .from("hackathon_phase_activity_submissions")
    .select("id, participant_id, text_answer, image_url, file_urls, submitted_at")
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
    participants.map((row) => [row.id, row.name ?? "Teammate"])
  );

  return submissions.map((submission) => ({
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

  const res = await fetch(fileUri);
  const blob = await res.blob();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("hackathon_submissions")
    .upload(path, blob, { contentType: mimeType });

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
  return { submissionId: data.id, url: fileUrl };
}
