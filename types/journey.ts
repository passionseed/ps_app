// types/journey.ts

export type JourneyStepType = "university" | "internship" | "job";
export type JourneySource = "ai_generated" | "manual";

export interface JourneyStep {
  type: JourneyStepType;
  tcas_program_id: string | null;
  label: string;
  details: {
    university_name?: string;
    faculty_name?: string;
    company_type?: string;
    salary_range?: string;
    description?: string;
  };
}

export interface JourneyScores {
  passion: number;
  future: number;
  world: number;
}

export interface StudentJourney {
  id: string;
  student_id: string;
  title: string;
  career_goal: string;
  source: JourneySource;
  steps: JourneyStep[];
  scores: JourneyScores | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateJourneyInput {
  title: string;
  career_goal: string;
  source: JourneySource;
  steps: JourneyStep[];
  scores?: JourneyScores;
}

export interface UpdateJourneyInput {
  title?: string;
  career_goal?: string;
  steps?: JourneyStep[];
  scores?: JourneyScores;
  is_active?: boolean;
}
