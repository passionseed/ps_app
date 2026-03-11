// types/journey.ts

export type JourneyStepType = "university" | "internship" | "job";

// ---------------------------------------------------------------------------
// UI-layer types for the JourneyBoard card components
// These are the display-ready shapes produced by adapting StudentJourney data.
// ---------------------------------------------------------------------------

export type StepType = "university" | "internship" | "job";

export interface PathStep {
  id: string;
  order: number;
  type: StepType;
  title: string;
  subtitle: string;
  detail: string;
  duration: string;
  icon: string;
  status: "completed" | "in-progress" | "upcoming";
  universityMeta?: {
    universityName: string;
    facultyName: string;
  };
}

export interface CareerPath {
  id: string;
  label: string;
  careerGoal: string;
  careerGoalIcon: string;
  passionScore: number | null;
  futureScore: number | null;
  worldScore: number | null;
  journeyScore: number | null;
  explanations: {
    passion: string;
    future: string;
    world: string;
  };
  confidence: "low" | "medium" | "high";
  steps: PathStep[];
}
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
