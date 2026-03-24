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
