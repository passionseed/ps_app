// lib/tcas.ts

import { supabase } from "./supabase";
import type {
  TcasProgram,
  TcasUniversity,
  TcasProgramWithRounds,
  TcasAdmissionRound,
  EligibleRound,
  ProgramSearchResult,
  ProgramTextSearchResult,
} from "../types/tcas";

/**
 * Full-text search for TCAS programs (Thai + English).
 */
export async function searchPrograms(
  query: string,
  limit = 20
): Promise<ProgramTextSearchResult[]> {
  const { data, error } = await supabase.rpc("search_programs_text", {
    query,
    match_count: limit,
  });
  if (error) throw error;
  return (data ?? []) as ProgramTextSearchResult[];
}

/**
 * Vector similarity search using a pre-computed embedding.
 */
export async function matchProgramsByInterest(
  queryEmbedding: number[],
  limit = 20,
  threshold = 0.3
): Promise<ProgramSearchResult[]> {
  const { data, error } = await supabase.rpc("search_programs", {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  });
  if (error) throw error;
  return (data ?? []) as ProgramSearchResult[];
}

/**
 * Find rounds eligible for a student's GPAX.
 */
export async function getEligibleRounds(
  gpax: number,
  roundNumber?: number,
  universityId?: string,
  limit = 50
): Promise<EligibleRound[]> {
  const { data, error } = await supabase.rpc("find_eligible_rounds", {
    user_gpax: gpax,
    user_round: roundNumber ?? null,
    user_university_id: universityId ?? null,
    result_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as EligibleRound[];
}

/**
 * Get a single program with its university and all admission rounds.
 */
export async function getProgramDetail(
  programId: string
): Promise<TcasProgramWithRounds | null> {
  const { data: program, error: pErr } = await supabase
    .from("tcas_programs")
    .select("*")
    .eq("program_id", programId)
    .single();
  if (pErr || !program) return null;

  const [uniResult, roundsResult] = await Promise.all([
    supabase
      .from("tcas_universities")
      .select("*")
      .eq("university_id", program.university_id)
      .single(),
    supabase
      .from("tcas_admission_rounds")
      .select("*")
      .eq("program_id", programId)
      .order("round_type"),
  ]);

  return {
    ...program,
    university: uniResult.data as TcasUniversity,
    admission_rounds: (roundsResult.data ?? []) as TcasAdmissionRound[],
  } as TcasProgramWithRounds;
}

/**
 * Get all programs for a specific university.
 */
export async function getUniversityPrograms(
  universityId: string
): Promise<TcasProgram[]> {
  const { data, error } = await supabase
    .from("tcas_programs")
    .select("*")
    .eq("university_id", universityId)
    .order("faculty_name");
  if (error) throw error;
  return (data ?? []) as TcasProgram[];
}

/**
 * Get all universities (for dropdowns).
 */
export async function getAllUniversities(): Promise<TcasUniversity[]> {
  const { data, error } = await supabase
    .from("tcas_universities")
    .select("*")
    .order("university_name");
  if (error) throw error;
  return (data ?? []) as TcasUniversity[];
}
