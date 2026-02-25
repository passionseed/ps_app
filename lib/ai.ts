import { supabase } from "./supabase";
import { UserProfile } from "./auth";

export type SmartGradeResult = {
  score: number;
  scores: {
    specific: number;
    measurable: number;
    achievable: number;
    relevant: number;
    time_bound: number;
  };
  tips: {
    specific: string | null;
    measurable: string | null;
    achievable: string | null;
    relevant: string | null;
    time_bound: string | null;
  };
};

export type GoalParseResult = {
  frequencyCount: number | null;
  frequencyUnit: "day" | "week" | "month" | null;
  durationValue: string | null;
  humanReadable: string | null;
};

export type RealityCheckResult = {
  likelihood: number;
  pitfalls: string[];
  suggestions: string[];
};

export type OnboardingMessage = {
  topic: string;
  answer: string;
  followUpAnswer: string;
};

export type ExtractedProfile = {
  lifeAreas: string[];
  direction: string;
  values: string;
  blockers: string;
  weeklyHours: number;
};

export async function gradeGoal(params: {
  goalText: string;
  proofTypes?: string[];
  proofDescription?: string;
  userProfile?: Pick<UserProfile, "life_areas" | "direction" | "values"> | null;
  parsedFrequency?: string | null;
}): Promise<SmartGradeResult> {
  const { data, error } = await supabase.functions.invoke("smart-grade", {
    body: {
      goalText: params.goalText,
      proofTypes: params.proofTypes ?? [],
      proofDescription: params.proofDescription ?? "",
      userProfile: params.userProfile
        ? {
            lifeAreas: params.userProfile.life_areas,
            direction: params.userProfile.direction,
            values: params.userProfile.values,
          }
        : null,
      parsedFrequency: params.parsedFrequency ?? null,
    },
  });
  if (error) throw error;
  return data as SmartGradeResult;
}

export async function parseGoal(goalText: string): Promise<GoalParseResult> {
  const { data, error } = await supabase.functions.invoke("goal-parse", {
    body: { goalText },
  });
  if (error) throw error;
  return data as GoalParseResult;
}

export async function realityCheck(params: {
  goalText: string;
  proofTypes: string[];
  parsedFrequency: string | null;
}): Promise<RealityCheckResult> {
  const { data, error } = await supabase.functions.invoke("reality-check", {
    body: params,
  });
  if (error) throw error;
  return data as RealityCheckResult;
}

export async function onboardingFollowUp(
  topic: string,
  answer: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("onboarding-followup", {
    body: { topic, answer },
  });
  if (error) throw error;
  return (data as { followUp: string }).followUp;
}

export async function onboardingExtract(
  messages: OnboardingMessage[]
): Promise<ExtractedProfile> {
  const { data, error } = await supabase.functions.invoke("onboarding-extract", {
    body: { messages },
  });
  if (error) throw error;
  return data as ExtractedProfile;
}
