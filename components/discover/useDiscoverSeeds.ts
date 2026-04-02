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
import { getEmptySeedSocialProof } from "../../lib/seedSocialProof";
import type { SeedWithEnrollment } from "../../types/seeds";

type UseDiscoverSeedsArgs = {
  isGuest: boolean;
  userId: string | undefined;
  /** Wait until false so `userId` matches the session used by `getAvailableSeeds` (avoids a duplicate fetch). */
  authLoading: boolean;
};

async function hydrateSeedSocialProof(
  seeds: SeedWithEnrollment[],
): Promise<SeedWithEnrollment[]> {
  const pathIds = seeds
    .map((seed) => seed.path?.id)
    .filter((id): id is string => Boolean(id));

  if (pathIds.length === 0) {
    return seeds.map((seed) => ({
      ...seed,
      socialProof: seed.socialProof ?? getEmptySeedSocialProof(),
    }));
  }

  const seedIdByPathId = new Map(
    seeds.flatMap((seed) =>
      seed.path?.id ? [[seed.path.id, seed.id] as const] : [],
    ),
  );
  const { data, error } = await supabase
    .from("path_enrollments")
    .select("path_id, status")
    .in("path_id", pathIds);

  if (error) {
    console.warn("[Discover] Failed to load seed social proof:", error);
    return seeds.map((seed) => ({
      ...seed,
      socialProof: seed.socialProof ?? getEmptySeedSocialProof(),
    }));
  }

  const socialProofBySeedId = new Map<
    string,
    ReturnType<typeof getEmptySeedSocialProof>
  >();

  for (const enrollment of data ?? []) {
    const seedId = seedIdByPathId.get(enrollment.path_id);
    if (!seedId) continue;

    const socialProof =
      socialProofBySeedId.get(seedId) ?? getEmptySeedSocialProof();

    if (enrollment.status === "active" || enrollment.status === "paused") {
      socialProof.exploringCount += 1;
    } else if (enrollment.status === "explored") {
      socialProof.completedCount += 1;
    }

    socialProofBySeedId.set(seedId, socialProof);
  }

  return seeds.map((seed) => ({
    ...seed,
    socialProof:
      socialProofBySeedId.get(seed.id) ??
      seed.socialProof ??
      getEmptySeedSocialProof(),
  }));
}

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
      const seedData = await getAvailableSeeds({
        userId,
        forceRefresh: options?.forceRefresh,
      });
      const data = await hydrateSeedSocialProof(seedData);
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
