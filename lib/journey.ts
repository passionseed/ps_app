import { supabase } from "./supabase";
import type {
  StudentJourney,
  CreateJourneyInput,
  UpdateJourneyInput,
} from "../types/journey";

/**
 * Get all journeys for the current user.
 */
export async function getStudentJourneys(): Promise<StudentJourney[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentJourney[];
}

/**
 * Get active journeys only.
 */
export async function getActiveJourneys(): Promise<StudentJourney[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("student_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentJourney[];
}

/**
 * Get a single journey by ID.
 */
export async function getJourneyById(
  journeyId: string
): Promise<StudentJourney | null> {
  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("id", journeyId)
    .single();

  if (error) return null;
  return data as StudentJourney;
}

/**
 * Create a new journey.
 */
export async function createJourney(
  input: CreateJourneyInput
): Promise<StudentJourney> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("student_journeys")
    .insert({
      student_id: user.id,
      title: input.title,
      career_goal: input.career_goal,
      source: input.source,
      steps: input.steps,
      scores: input.scores ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudentJourney;
}

/**
 * Update an existing journey.
 */
export async function updateJourney(
  journeyId: string,
  input: UpdateJourneyInput
): Promise<StudentJourney> {
  const { data, error } = await supabase
    .from("student_journeys")
    .update(input)
    .eq("id", journeyId)
    .select()
    .single();

  if (error) throw error;
  return data as StudentJourney;
}

/**
 * Delete a journey.
 */
export async function deleteJourney(journeyId: string): Promise<void> {
  const { error } = await supabase
    .from("student_journeys")
    .delete()
    .eq("id", journeyId);

  if (error) throw error;
}
