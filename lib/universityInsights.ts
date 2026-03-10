import { supabase } from "./supabase";
import type { UniversityInsights } from "../types/university";

// Session-level in-memory cache — prevents duplicate in-flight calls
const sessionCache = new Map<string, UniversityInsights>();

function cacheKey(universityName: string, facultyName: string, careerGoal: string) {
  return `${universityName}|${facultyName}|${careerGoal}`;
}

export function computeQuickMatch(
  passionScore: number | null,
  futureScore: number | null,
  worldScore: number | null,
): number {
  const scores = [passionScore, futureScore, worldScore].filter(
    (s): s is number => s !== null,
  );
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export async function fetchUniversityInsights(params: {
  universityName: string;
  facultyName: string;
  careerGoal: string;
  passionScore: number | null;
  futureScore: number | null;
  worldScore: number | null;
}): Promise<UniversityInsights> {
  const { universityName, facultyName, careerGoal, passionScore, futureScore, worldScore } =
    params;
  const key = cacheKey(universityName, facultyName, careerGoal);

  if (sessionCache.has(key)) {
    return sessionCache.get(key)!;
  }

  const { data, error } = await supabase.functions.invoke("university-insights", {
    body: { universityName, facultyName, careerGoal, passionScore, futureScore, worldScore },
  });

  if (error) throw error;

  const result: UniversityInsights = {
    quickMatchScore: computeQuickMatch(passionScore, futureScore, worldScore),
    ...data,
  };

  sessionCache.set(key, result);
  return result;
}
