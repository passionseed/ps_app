import { supabase } from "./supabase";

export type SmartGradeResult = {
  score: number;
  tips: {
    specific: string | null;
    measurable: string | null;
    achievable: string | null;
    relevant: string | null;
    time_bound: string | null;
  };
};

export type RealityCheckResult = {
  likelihood: number;
  pitfalls: string[];
  suggestions: string[];
};

export async function gradeGoal(goalText: string): Promise<SmartGradeResult> {
  const { data, error } = await supabase.functions.invoke("smart-grade", {
    body: { goalText },
  });
  if (error) throw error;
  return data as SmartGradeResult;
}

export async function realityCheck(params: {
  goalText: string;
  measurementTypes: string[];
  frequencyCount: number;
  frequencyUnit: string;
  durationType: string;
  durationValue: string;
}): Promise<RealityCheckResult> {
  const { data, error } = await supabase.functions.invoke("reality-check", {
    body: params,
  });
  if (error) throw error;
  return data as RealityCheckResult;
}
