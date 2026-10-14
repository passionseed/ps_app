import { supabase } from "./supabase";
import type { ShiftAction, ShiftCohort, ShiftSnapshot } from "../types/shift";

const READ_ONLY = true;

export async function campAction(
  action: ShiftAction,
  cohortId: string | null = null,
  payload: Record<string, unknown> = {},
): Promise<ShiftSnapshot> {
  // E15: the interactive camp is legacy and read-only; only reads may reach the server.
  if (action !== "list" && action !== "snapshot") {
    throw new Error("This camp has ended and is read-only.");
  }
  const { data, error } = await supabase.rpc("shift_camp_action", {
    p_action: action,
    p_cohort_id: cohortId,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The camp could not be loaded. Try again.");
  return data as ShiftSnapshot;
}
export async function listCampCohorts(): Promise<ShiftCohort[]> {
  return (await campAction("list")) as unknown as ShiftCohort[];
}
export async function uploadCampImage(
  cohortId: string,
  projectId: string,
  uri: string,
  mime = "image/jpeg",
): Promise<string> {
  // E15: camp uploads are retired with the read-only camp.
  if (READ_ONLY) throw new Error("This camp has ended and is read-only.");
  const bytes = await (await fetch(uri)).arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024)
    throw new Error("Choose an image smaller than 5 MB.");
  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${cohortId}/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("shift-camp")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
export async function campImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("shift-camp")
    .createSignedUrl(path, 600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
