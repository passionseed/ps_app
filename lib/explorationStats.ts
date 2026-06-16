// lib/explorationStats.ts
//
// Live exploration metrics for the profile card. Unlike onboarding career
// goals / interests (static), these reflect what the user has actually done:
// seeds explored, total days progressed, reflections written.
//
// Fail-soft: any query error returns zeroed stats so the profile still renders.

import { supabase } from "./supabase";

export interface ExplorationStats {
  /** Number of path enrollments (seeds the user has started exploring). */
  seedsExplored: number;
  /** Sum of current_day across enrollments — total days progressed. */
  daysDeep: number;
  /** Number of daily reflections written. */
  reflections: number;
}

export const EMPTY_EXPLORATION_STATS: ExplorationStats = {
  seedsExplored: 0,
  daysDeep: 0,
  reflections: 0,
};

export async function fetchExplorationStats(
  userId: string,
): Promise<ExplorationStats> {
  try {
    const { data: enrollments, error } = await supabase
      .from("path_enrollments")
      .select("id,current_day")
      .eq("user_id", userId);

    if (error || !enrollments || enrollments.length === 0) {
      return EMPTY_EXPLORATION_STATS;
    }

    const enrollmentIds = enrollments.map((e: any) => e.id);
    const daysDeep = enrollments.reduce(
      (sum: number, e: any) => sum + (e.current_day || 0),
      0,
    );

    const { count: reflectionCount } = await supabase
      .from("path_reflections")
      .select("id", { count: "exact", head: true })
      .in("enrollment_id", enrollmentIds);

    return {
      seedsExplored: enrollments.length,
      daysDeep,
      reflections: reflectionCount ?? 0,
    };
  } catch {
    return EMPTY_EXPLORATION_STATS;
  }
}
