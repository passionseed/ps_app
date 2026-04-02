import { readHackathonToken } from "./hackathon-mode";

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL ?? "https://pseed.vercel.app";

export type SubmitResult = {
  submissionId: string;
  url: string | null;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await readHackathonToken();
  if (!token) throw new Error("Not logged in");
  return { Authorization: `Bearer ${token}` };
}

export async function submitTextAnswer(
  activityId: string,
  assessmentId: string,
  textAnswer: string
): Promise<SubmitResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WEB_API_URL}/api/hackathon/submit`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ activityId, assessmentId, textAnswer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Submit failed (${res.status})`);
  }
  return res.json();
}

export type ActivitySubmissionStatus = {
  activity_id: string;
  status: string;
};

export async function fetchActivitySubmissionStatuses(
  activityIds: string[]
): Promise<Record<string, string>> {
  if (activityIds.length === 0) return {};
  const token = await readHackathonToken();
  if (!token) return {};
  const params = activityIds.join(",");
  const res = await fetch(
    `${WEB_API_URL}/api/hackathon/submissions?activityIds=${encodeURIComponent(params)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return {};
  const json = await res.json();
  const map: Record<string, string> = {};
  for (const s of json.submissions ?? []) {
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
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("activityId", activityId);
  formData.append("assessmentId", assessmentId);
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await fetch(`${WEB_API_URL}/api/hackathon/submit`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Upload failed (${res.status})`);
  }
  return res.json();
}
