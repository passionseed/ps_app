// types/tcas.ts

export interface TcasUniversity {
  id: string;
  university_id: string;
  university_name: string;
  university_name_en: string | null;
  university_type: string | null;
  file_paths: Record<string, string>;
}

export interface TcasProgram {
  id: string;
  university_id: string;
  program_id: string;
  faculty_name: string | null;
  faculty_name_en: string | null;
  field_name: string | null;
  field_name_en: string | null;
  program_name: string;
  program_name_en: string | null;
  program_type: string | null;
  program_type_name: string | null;
  total_seats: number | null;
  cost: string | null;
  degree_level?: string | null;
  embedding: number[] | null;
  projection_2d: number[] | null;
  // Joined/computed fields from RPC results
  university_name?: string;
  similarity?: number;
  rank?: number;
}

export interface TcasAdmissionRound {
  id: string;
  program_id: string;
  university_id: string;
  round_type: string;
  round_number: number | null;
  project_name: string | null;
  receive_seats: number | null;
  quota?: number | null;
  min_gpax: number | null;
  min_total_score: number | null;
  score_weights: Record<string, number> | null;
  link: string | null;
  description: string | null;
}

export interface TcasProgramWithRounds extends TcasProgram {
  university: TcasUniversity;
  admission_rounds: TcasAdmissionRound[];
}

// RPC result type for find_eligible_rounds
export interface EligibleRound {
  round_id: string;
  program_id: string;
  program_name: string;
  faculty_name: string;
  university_name: string;
  university_id: string;
  round_number: number;
  project_name: string | null;
  receive_seats: number | null;
  min_gpax: number | null;
  score_weights: Record<string, number> | null;
  link: string | null;
}

// RPC result type for search_programs (vector search)
export interface ProgramSearchResult {
  program_id: string;
  program_name: string;
  program_name_en: string | null;
  faculty_name: string;
  university_name: string;
  university_id: string;
  similarity: number;
}

// RPC result type for search_programs_text
export interface ProgramTextSearchResult {
  program_id: string;
  program_name: string;
  program_name_en: string | null;
  faculty_name: string;
  faculty_name_en: string | null;
  university_name: string;
  university_id: string;
  rank: number;
  round_numbers?: number[];
}

export type PlannerDeadlineStatus = "open" | "soon" | "expired" | "unknown";

export interface ProgramPlannerRoundSummary {
  round_id: string | null;
  round_number: number | null;
  round_type: string | null;
  project_name: string | null;
  receive_seats: number | null;
  min_gpax: number | null;
  folio_closed_date: string | null;
  link: string | null;
  has_requirements: boolean;
  is_eligible: boolean | null;
  deadline_status: PlannerDeadlineStatus;
  days_until_deadline: number | null;
}

export interface ProgramPlannerScoreBreakdown {
  exact: number;
  prefix: number;
  text: number;
  semantics: number;
  availability: number;
  profile: number;
  penalties: number;
  total: number;
}

export interface ProgramPlannerCandidate {
  program_id: string;
  program_name: string;
  program_name_en: string | null;
  faculty_name: string | null;
  faculty_name_en: string | null;
  field_name: string | null;
  field_name_en: string | null;
  program_type: string | null;
  program_type_name: string | null;
  university_id: string;
  university_name: string;
  university_name_en?: string | null;
  description_th: string | null;
  total_seats: number | null;
  cost: string | null;
  degree_level?: string | null;
  has_embedding: boolean;
  has_requirements: boolean;
  round_numbers: number[];
  best_round: ProgramPlannerRoundSummary | null;
  score_breakdown: ProgramPlannerScoreBreakdown;
  rationale: string;
  tradeoff_summary: string;
}

export interface ProgramPlannerSection {
  key: "best-matches" | "hidden-gems" | "prestige-vs-fit" | "search-results";
  title: string;
  subtitle: string;
  items: ProgramPlannerCandidate[];
}
