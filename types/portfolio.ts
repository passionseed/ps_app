// types/portfolio.ts

export type PortfolioItemType = 'project' | 'award' | 'activity' | 'course' | 'other';
export type FitConfidence = 'low' | 'medium' | 'high';

export interface StudentPortfolioItem {
  id: string;
  user_id: string;
  item_type: PortfolioItemType;
  title: string;
  description: string | null;
  date_from: string | null;   // ISO date string 'YYYY-MM-DD'
  date_to: string | null;
  tags: string[];
  embedding: number[] | null;
  source: 'manual' | 'pathlab_auto';
  pathlab_journey_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewPortfolioItem {
  item_type: PortfolioItemType;
  title: string;
  description?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

export interface ProgramRequirements {
  id: string;
  round_id: string;
  program_id: string;
  what_they_seek: string | null;
  portfolio_criteria: string[] | null;
  program_vision: string | null;
  sample_keywords: string[] | null;
  source_urls: string[] | null;
  enrichment_version: number;
  enriched_at: string;
}

export interface FitGap {
  gap: string;           // e.g. "community impact"
  suggestion: string;    // e.g. "Add your volunteer work or group projects"
}

export interface ProgramFitScore {
  id: string;
  user_id: string;
  round_id: string;
  program_id: string;
  eligibility_pass: boolean;
  fit_score: number;     // 0-100
  confidence: FitConfidence;
  narrative: string | null;
  gaps: FitGap[] | null;
  portfolio_snapshot: Record<string, unknown> | null;
  scored_at: string;
  score_version: number;
}

// Returned by edge function — includes program info for display
export interface FitScoreResult extends ProgramFitScore {
  program_name: string;
  program_name_en: string | null;
  faculty_name: string;
  university_name: string;
  university_id: string;
  round_type: string;
  round_number: number;
  project_name: string | null;
  receive_seats: number | null;
  min_gpax: number | null;
  folio_closed_date: string | null;
  link: string | null;
}
