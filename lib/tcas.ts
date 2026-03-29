// lib/tcas.ts

import { supabase } from "./supabase";
import type {
  PlannerDeadlineStatus,
  ProgramPlannerCandidate,
  ProgramPlannerRoundSummary,
  TcasProgram,
  TcasUniversity,
  TcasProgramWithRounds,
  TcasAdmissionRound,
  EligibleRound,
  ProgramSearchResult,
  ProgramTextSearchResult,
} from "../types/tcas";
import {
  buildPlannerReason,
  buildPlannerSections,
  buildTradeoffSummary,
  rankPlannerCandidates,
} from "./tcasPlanner";

type SearchProgramsOptions = {
  userGpax?: number | null;
};

type PlannerProgramRow = {
  id: string;
  program_id: string;
  university_id: string;
  program_name: string;
  program_name_en: string | null;
  faculty_name: string | null;
  faculty_name_en: string | null;
  field_name: string | null;
  field_name_en: string | null;
  program_type: string | null;
  program_type_name: string | null;
  total_seats: number | null;
  cost: string | null;
  search_text: string | null;
  embedding: number[] | null;
  university?: {
    university_name: string;
    university_name_en: string | null;
  } | null;
};

type PlannerRoundRow = {
  id: string;
  program_id: string;
  round_number: number | null;
  round_type: string | null;
  project_name: string | null;
  receive_seats: number | null;
  min_gpax: number | null;
  folio_closed_date: string | null;
  link: string | null;
};

type PlannerRequirementRow = {
  program_id: string;
  round_id: string;
};

function sanitizeForIlike(query: string): string {
  return query.replace(/[%_,]/g, " ").trim();
}

function getDeadlineStatus(
  folioClosedDate: string | null,
): { deadlineStatus: PlannerDeadlineStatus; daysUntilDeadline: number | null } {
  if (!folioClosedDate) {
    return { deadlineStatus: "unknown", daysUntilDeadline: null };
  }

  const now = Date.now();
  const deadline = new Date(folioClosedDate).getTime();
  if (Number.isNaN(deadline)) {
    return { deadlineStatus: "unknown", daysUntilDeadline: null };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const daysUntilDeadline = Math.ceil((deadline - now) / dayMs);
  if (daysUntilDeadline < 0) {
    return { deadlineStatus: "expired", daysUntilDeadline };
  }
  if (daysUntilDeadline <= 14) {
    return { deadlineStatus: "soon", daysUntilDeadline };
  }
  return { deadlineStatus: "open", daysUntilDeadline };
}

function chooseBestRound(
  rounds: PlannerRoundRow[],
  requirementRoundIds: Set<string>,
  userGpax?: number | null,
): ProgramPlannerRoundSummary | null {
  if (rounds.length === 0) return null;

  const sorted = [...rounds].sort((left, right) => {
    const leftEligibility =
      userGpax == null || left.min_gpax == null || userGpax >= left.min_gpax ? 1 : 0;
    const rightEligibility =
      userGpax == null || right.min_gpax == null || userGpax >= right.min_gpax ? 1 : 0;
    if (rightEligibility !== leftEligibility) return rightEligibility - leftEligibility;

    const leftDeadline = getDeadlineStatus(left.folio_closed_date).daysUntilDeadline ?? 9999;
    const rightDeadline = getDeadlineStatus(right.folio_closed_date).daysUntilDeadline ?? 9999;
    if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;

    const leftRound = left.round_number ?? 99;
    const rightRound = right.round_number ?? 99;
    if (leftRound !== rightRound) return leftRound - rightRound;

    return (right.receive_seats ?? 0) - (left.receive_seats ?? 0);
  });

  const best = sorted[0];
  if (!best) return null;

  const { deadlineStatus, daysUntilDeadline } = getDeadlineStatus(best.folio_closed_date);
  const isEligible =
    userGpax == null || best.min_gpax == null ? null : userGpax >= best.min_gpax;

  return {
    round_id: best.id,
    round_number: best.round_number,
    round_type: best.round_type,
    project_name: best.project_name,
    receive_seats: best.receive_seats,
    min_gpax: best.min_gpax,
    folio_closed_date: best.folio_closed_date,
    link: best.link,
    has_requirements: requirementRoundIds.has(best.id),
    is_eligible: isEligible,
    deadline_status: deadlineStatus,
    days_until_deadline: daysUntilDeadline,
  };
}

function toPlannerCandidate(
  program: PlannerProgramRow,
  rounds: PlannerRoundRow[],
  requirementRows: PlannerRequirementRow[],
  userGpax?: number | null,
): ProgramPlannerCandidate {
  const requirementRoundIds = new Set(requirementRows.map((row) => row.round_id));
  const bestRound = chooseBestRound(rounds, requirementRoundIds, userGpax);

  return {
    program_id: program.program_id,
    program_name: program.program_name,
    program_name_en: program.program_name_en,
    faculty_name: program.faculty_name,
    faculty_name_en: program.faculty_name_en,
    field_name: program.field_name,
    field_name_en: program.field_name_en,
    program_type: program.program_type,
    program_type_name: program.program_type_name,
    university_id: program.university_id,
    university_name: program.university?.university_name ?? "",
    university_name_en: program.university?.university_name_en ?? null,
    description_th: program.search_text,
    total_seats: program.total_seats,
    cost: program.cost,
    degree_level: null,
    has_embedding: !!program.embedding,
    has_requirements: requirementRows.length > 0,
    round_numbers: Array.from(
      new Set(rounds.map((round) => round.round_number).filter((value): value is number => value != null)),
    ).sort((left, right) => left - right),
    best_round: bestRound,
    score_breakdown: {
      exact: 0,
      prefix: 0,
      text: 0,
      semantics: 0,
      availability: 0,
      profile: 0,
      penalties: 0,
      total: 0,
    },
    rationale: "",
    tradeoff_summary: "",
  };
}

async function fetchPlannerProgramsDirect(
  query: string,
  limit: number,
): Promise<PlannerProgramRow[]> {
  const selectFields = `
    id,
    program_id,
    university_id,
    program_name,
    program_name_en,
    faculty_name,
    faculty_name_en,
    field_name,
    field_name_en,
    program_type,
    program_type_name,
    total_seats,
    cost,
    search_text,
    embedding,
    university:tcas_universities (
      university_name,
      university_name_en
    )
  `;

  let dbQuery = supabase.from("tcas_programs").select(selectFields);
  if (query.trim()) {
    const safe = sanitizeForIlike(query);
    dbQuery = dbQuery.or(
      [
        `program_name.ilike.*${safe}*`,
        `program_name_en.ilike.*${safe}*`,
        `faculty_name.ilike.*${safe}*`,
        `faculty_name_en.ilike.*${safe}*`,
        `field_name.ilike.*${safe}*`,
        `field_name_en.ilike.*${safe}*`,
        `program_type_name.ilike.*${safe}*`,
        `search_text.ilike.*${safe}*`,
      ].join(","),
    );
  }

  const { data, error } = await dbQuery.limit(query.trim() ? Math.max(limit * 3, 60) : 80);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const universityValue = row.university;
    const university = Array.isArray(universityValue) ? universityValue[0] : universityValue;

    return {
      ...(row as unknown as PlannerProgramRow),
      university: university as PlannerProgramRow["university"],
    };
  });
}

async function decoratePlannerCandidates(
  programs: PlannerProgramRow[],
  query: string,
  options: SearchProgramsOptions = {},
): Promise<ProgramPlannerCandidate[]> {
  if (programs.length === 0) return [];

  const programIds = programs.map((program) => program.program_id);
  const [{ data: roundData, error: roundError }, { data: requirementData, error: requirementError }] =
    await Promise.all([
      supabase
        .from("tcas_admission_rounds")
        .select("id, program_id, round_number, round_type, project_name, receive_seats, min_gpax, folio_closed_date, link")
        .in("program_id", programIds),
      supabase
        .from("program_requirements")
        .select("program_id, round_id")
        .in("program_id", programIds),
    ]);

  if (roundError) throw roundError;
  if (requirementError) {
    console.warn("program_requirements unavailable for planner candidates", requirementError.message);
  }

  const roundsByProgram = new Map<string, PlannerRoundRow[]>();
  for (const round of (roundData ?? []) as PlannerRoundRow[]) {
    const existing = roundsByProgram.get(round.program_id) ?? [];
    existing.push(round);
    roundsByProgram.set(round.program_id, existing);
  }

  const requirementsByProgram = new Map<string, PlannerRequirementRow[]>();
  for (const requirement of (requirementData ?? []) as PlannerRequirementRow[]) {
    const existing = requirementsByProgram.get(requirement.program_id) ?? [];
    existing.push(requirement);
    requirementsByProgram.set(requirement.program_id, existing);
  }

  const ranked = rankPlannerCandidates(
    programs.map((program) =>
      toPlannerCandidate(
        program,
        roundsByProgram.get(program.program_id) ?? [],
        requirementsByProgram.get(program.program_id) ?? [],
        options.userGpax,
      ),
    ),
    query,
    { userGpax: options.userGpax },
  );

  return ranked.map((candidate) => ({
    ...candidate,
    rationale: buildPlannerReason(candidate, true),
    tradeoff_summary: buildTradeoffSummary(candidate, true),
  }));
}

/**
 * Full-text search for TCAS programs (Thai + English).
 */
export async function searchPrograms(
  query: string,
  limit = 20,
  options: SearchProgramsOptions = {},
): Promise<ProgramPlannerCandidate[]> {
  try {
    const { data, error } = await supabase.rpc("search_programs_planner", {
      query_text: query,
      user_gpax: options.userGpax ?? null,
      match_count: limit,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      const ranked = rankPlannerCandidates(
        (data as ProgramPlannerCandidate[]).map((candidate) => ({
          ...candidate,
          rationale: "",
          tradeoff_summary: "",
        })),
        query,
        { userGpax: options.userGpax },
      );

      return ranked.slice(0, limit).map((candidate) => ({
        ...candidate,
        rationale: buildPlannerReason(candidate, true),
        tradeoff_summary: buildTradeoffSummary(candidate, true),
      }));
    }
  } catch (error) {
    console.warn("search_programs_planner RPC unavailable, using direct fallback", error);
  }

  const programs = await fetchPlannerProgramsDirect(query, limit);
  const candidates = await decoratePlannerCandidates(programs, query, options);
  return candidates.slice(0, limit);
}

export function buildProgramPlannerSections(
  candidates: ProgramPlannerCandidate[],
  query: string,
  options: { userGpax?: number | null; isThai: boolean },
) {
  return buildPlannerSections(candidates, query, options);
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
