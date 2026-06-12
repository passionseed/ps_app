/**
 * PathLab React Query hooks.
 *
 * Wraps the existing lib/pathlab.ts API functions with TanStack Query
 * for automatic caching, background refetching, and cache invalidation
 * on mutations.
 *
 * Pattern follows lib/hooks/useHackathon.ts.
 */

import { supabase } from "../supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, staleTimes } from "../queryClient";
import {
  getSeedById,
  getPathDays,
  getEnrollmentDayBundle,
  getAvailableSeeds,
  enrollInPath,
  submitDailyReflection,
  updateActivityProgress,
} from "../pathlab";
import type { PathEnrollment } from "../../types/pathlab";
import type { Seed, SeedWithEnrollment } from "../../types/seeds";
import type { PathDay } from "../../types/pathlab";
import type { PathDayBundle } from "../pathlab";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch a single seed by ID.
 * Cache: 30 minutes (reference data, rarely changes).
 */
export function useSeed(seedId: string | null | undefined) {
  return useQuery({
    queryKey: seedId
      ? queryKeys.pathlab.seed(seedId)
      : ["pathlab", "seed", "null"],
    queryFn: async (): Promise<Seed | null> => {
      if (!seedId) return null;
      return getSeedById(seedId);
    },
    staleTime: staleTimes.reference,
    enabled: !!seedId,
  });
}

/**
 * Fetch the ordered list of days for a path.
 * Cache: 30 minutes (reference data, rarely changes).
 */
export function usePathDays(pathId: string | null | undefined) {
  return useQuery({
    queryKey: pathId
      ? [...queryKeys.pathlab.all, "pathDays", pathId]
      : ["pathlab", "pathDays", "null"],
    queryFn: async (): Promise<Pick<PathDay, "id" | "day_number" | "title">[]> => {
      if (!pathId) return [];
      return getPathDays(pathId);
    },
    staleTime: staleTimes.reference,
    enabled: !!pathId,
  });
}

/**
 * Fetch a single enrollment by its ID.
 * Cache: 2 minutes (user content, may change via mutations).
 */
export function useEnrollment(enrollmentId: string | null | undefined) {
  return useQuery({
    queryKey: enrollmentId
      ? queryKeys.pathlab.enrollment(enrollmentId)
      : ["pathlab", "enrollment", "null"],
    queryFn: async (): Promise<PathEnrollment | null> => {
      if (!enrollmentId) return null;
      const { data, error } = await supabase
        .from("path_enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: staleTimes.userContent,
    enabled: !!enrollmentId,
  });
}

/**
 * Fetch the complete day bundle for an enrollment (enrollment + day + activities).
 * Cache: 2 minutes (user content, may change via mutations).
 */
export function useEnrollmentDayBundle(
  enrollmentId: string | null | undefined,
) {
  return useQuery({
    queryKey: enrollmentId
      ? queryKeys.pathlab.dayBundle(enrollmentId)
      : ["pathlab", "dayBundle", "null"],
    queryFn: async (): Promise<PathDayBundle | null> => {
      if (!enrollmentId) return null;
      return getEnrollmentDayBundle(enrollmentId);
    },
    staleTime: staleTimes.userContent,
    enabled: !!enrollmentId,
  });
}

/**
 * Fetch the list of available (visible/featured) seeds for the Discover screen.
 * Cache: 5 minutes (progressive data, accumulates slowly).
 */
export function useAvailableSeeds(userId?: string) {
  return useQuery({
    queryKey: queryKeys.pathlab.seeds(userId),
    queryFn: async (): Promise<SeedWithEnrollment[]> => {
      return getAvailableSeeds({ userId });
    },
    staleTime: staleTimes.progressive,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Enroll in a PathLab seed.
 * Invalidates pathlab and seeds caches on success.
 */
export function useEnrollInSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrollInPath,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pathlab.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.seeds.all });
    },
  });
}

/**
 * Submit a daily reflection.
 * Invalidates pathlab caches on success so day bundle and enrollment
 * data refresh to reflect the new day/status.
 */
export function useSubmitReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitDailyReflection,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pathlab.all });
      // Also invalidate the specific enrollment that was updated
      queryClient.invalidateQueries({
        queryKey: queryKeys.pathlab.enrollment(variables.enrollmentId),
      });
    },
  });
}

/**
 * Update activity progress (in_progress / completed / skipped).
 * Invalidates pathlab caches on success.
 */
export function useUpdateActivityProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateActivityProgress,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pathlab.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pathlab.enrollment(variables.enrollmentId),
      });
    },
  });
}
