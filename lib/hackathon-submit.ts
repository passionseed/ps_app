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
