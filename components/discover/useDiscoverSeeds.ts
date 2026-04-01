import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAvailableSeeds,
  getCachedAvailableSeeds,
  getCachedRecommendedSeeds,
  getRecommendedSeeds,
} from "../../lib/pathlab";
import { mergeSeedEnrollmentState } from "../../lib/seedEnrollmentMerge";
import { supabase } from "../../lib/supabase";
import {
  buildFallbackRecommendations,
  hydrateRecommendationSeedMedia,
  type SeedRecommendationsPayload,
} from "../../lib/seedRecommendations";
import type { SeedWithEnrollment } from "../../types/seeds";

type UseDiscoverSeedsArgs = {
  isGuest: boolean;
  userId: string | undefined;
  /** Wait until false so `userId` matches the session used by `getAvailableSeeds` (avoids a duplicate fetch). */
  authLoading: boolean;
};

export function useDiscoverSeeds({
  isGuest,
  userId,
  authLoading,
}: UseDiscoverSeedsArgs) {
  const [seeds, setSeeds] = useState<SeedWithEnrollment[]>(
    () => getCachedAvailableSeeds(userId) ?? [],
  );
  const [recommendations, setRecommendations] =
    useState<SeedRecommendationsPayload | null>(
      () =>
        getCachedRecommendedSeeds(userId) ??
        (() => {
          const cachedSeeds = getCachedAvailableSeeds(userId);
          return cachedSeeds ? buildFallbackRecommendations(cachedSeeds) : null;
        })(),
    );
  const [loading, setLoading] = useState(
    () => getCachedAvailableSeeds(userId) == null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const fetchGenerationRef = useRef(0);
  const bootstrappedForUserRef = useRef<string | null>(null);
  const seedsRef = useRef<SeedWithEnrollment[]>(
    getCachedAvailableSeeds(userId) ?? [],
  );
  const restrictRecommendationsToSeeds = useCallback(
    (
      payload: SeedRecommendationsPayload,
      allowedSeeds: SeedWithEnrollment[],
    ): SeedRecommendationsPayload => {
      const allowedIds = new Set(allowedSeeds.map((seed) => seed.id));
      return {
        ...payload,
        seeds: payload.seeds.filter((seed) => allowedIds.has(seed.id)),
      };
    },
    [],
  );

  const loadSeeds = useCallback(async (options?: {
    forceRefresh?: boolean;
    showLoader?: boolean;
  }) => {
    const generation = ++fetchGenerationRef.current;
    const isStale = () => generation !== fetchGenerationRef.current;
    try {
      if (options?.showLoader) {
        setLoading(true);
      }
      console.log("[Discover] Loading seeds...");
      const data = await getAvailableSeeds({
        userId,
        forceRefresh: options?.forceRefresh,
      });
      if (isStale()) return;
      console.log("[Discover] Seeds loaded:", data?.length || 0, "userId:", userId);

      const previousSeeds = seedsRef.current;

      if (userId && data) {
        // RADICAL: Fetch reflections for ALL seeds in the data list if we have a userId
        // to ensure we never miss an enrollment due to filtering.
        const seedsWithEnrollments = data.filter((s) => s.enrollment);
        let reflectionMap = new Map();

        if (seedsWithEnrollments.length > 0) {
          const { data: reflections } = await supabase
            .from("path_reflections")
            .select("enrollment_id, day_number, created_at")
            .in(
              "enrollment_id",
              seedsWithEnrollments.map((s) => s.enrollment!.id)
            );

          if (isStale()) return;

          (reflections || []).forEach((r) => {
            reflectionMap.set(`${r.enrollment_id}-${r.day_number}`, r);
          });
        }

        const today = new Date().toDateString();
        const enrichedSeeds = data.map((seed) => {
          if (!seed.enrollment) return seed;
          const key = `${seed.enrollment.id}-${seed.enrollment.current_day}`;
          const ref = reflectionMap.get(key);
          const isDoneToday = ref?.created_at
            ? new Date(ref.created_at).toDateString() === today
            : false;
          return { ...seed, enrollment: { ...seed.enrollment, isDoneToday } };
        });

        const mergedSeeds = mergeSeedEnrollmentState(previousSeeds, enrichedSeeds);
        seedsRef.current = mergedSeeds;

        if (!isGuest && userId) {
          const recPayload = await getRecommendedSeeds({
            fallbackSeeds: mergedSeeds,
            forceRefresh: options?.forceRefresh,
            userId,
          });
          if (isStale()) return;
          setSeeds(mergedSeeds);
          setRecommendations(
            restrictRecommendationsToSeeds(
              hydrateRecommendationSeedMedia(recPayload, mergedSeeds),
              mergedSeeds,
            ),
          );
        } else {
          setSeeds(mergedSeeds);
          setRecommendations(buildFallbackRecommendations(mergedSeeds));
        }
      } else {
        const mergedSeeds = mergeSeedEnrollmentState(previousSeeds, data || []);
        seedsRef.current = mergedSeeds;
        setSeeds(mergedSeeds);
        setRecommendations(buildFallbackRecommendations(mergedSeeds));
      }
    } catch (error) {
      console.error("[Discover] Failed to load seeds:", error);
      if (generation === fetchGenerationRef.current) {
        if (seedsRef.current.length === 0) {
          setSeeds([]);
          setRecommendations(null);
        }
      }
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isGuest, restrictRecommendationsToSeeds, userId]);

  useEffect(() => {
    seedsRef.current = seeds;
  }, [seeds]);

  useEffect(() => {
    if (authLoading) return;
    const userKey = userId ?? "__public__";
    if (bootstrappedForUserRef.current === userKey) return;
    bootstrappedForUserRef.current = userKey;

    const cachedSeeds = getCachedAvailableSeeds(userId);
    const cachedRecommendations = getCachedRecommendedSeeds(userId);

    if (cachedSeeds) {
      setSeeds(cachedSeeds);
      setRecommendations(
        cachedRecommendations
          ? restrictRecommendationsToSeeds(cachedRecommendations, cachedSeeds)
          : buildFallbackRecommendations(cachedSeeds),
      );
      setLoading(false);
      // One background revalidation after hydrating from cache.
      void loadSeeds({ showLoader: false });
      return;
    }

    void loadSeeds({ showLoader: true });
  }, [authLoading, loadSeeds, restrictRecommendationsToSeeds, userId]);

  useEffect(() => {
    if (authLoading || !loading) return;
    const timeoutId = setTimeout(() => {
      console.log("[Discover] Loading timeout - forcing ready state");
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [authLoading, loading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSeeds({ forceRefresh: true, showLoader: seeds.length === 0 });
  }, [loadSeeds]);

  return {
    seeds,
    recommendations,
    loading,
    refreshing,
    loadSeeds,
    onRefresh,
  };
}
