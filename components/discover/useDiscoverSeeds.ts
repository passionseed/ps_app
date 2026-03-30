import { useCallback, useEffect, useState } from "react";
import { getAvailableSeeds, getRecommendedSeeds } from "../../lib/pathlab";
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
};

export function useDiscoverSeeds({ isGuest, userId }: UseDiscoverSeedsArgs) {
  const [seeds, setSeeds] = useState<SeedWithEnrollment[]>([]);
  const [recommendations, setRecommendations] =
    useState<SeedRecommendationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSeeds = useCallback(async () => {
    try {
      console.log("[Discover] Loading seeds...");
      const data = await getAvailableSeeds();
      console.log("[Discover] Seeds loaded:", data?.length || 0);

      if (userId && data) {
        const enrolledSeeds = data.filter(s => s.enrollment);

        if (enrolledSeeds.length > 0) {
          const { data: reflections } = await supabase
            .from("path_reflections")
            .select("enrollment_id, day_number, created_at")
            .in("enrollment_id", enrolledSeeds.map(s => s.enrollment!.id));

          const today = new Date().toDateString();
          const reflectionMap = new Map(
            (reflections || []).map(r => [r.enrollment_id, r])
          );

          const enrichedSeeds = data.map(seed => {
            if (!seed.enrollment) return seed;
            const ref = reflectionMap.get(seed.enrollment.id);
            const isDoneToday = ref?.created_at
              ? new Date(ref.created_at).toDateString() === today
              : false;
            return { ...seed, enrollment: { ...seed.enrollment, isDoneToday } };
          });

          setSeeds(enrichedSeeds);
          if (!isGuest && userId) {
            setRecommendations(
              hydrateRecommendationSeedMedia(
                await getRecommendedSeeds(),
                enrichedSeeds,
              ),
            );
          } else {
            setRecommendations(buildFallbackRecommendations(enrichedSeeds));
          }
        } else {
          setSeeds(data);
          setRecommendations(buildFallbackRecommendations(data));
        }
      } else {
        setSeeds(data || []);
        setRecommendations(buildFallbackRecommendations(data || []));
      }
    } catch (error) {
      console.error("[Discover] Failed to load seeds:", error);
      setSeeds([]);
      setRecommendations(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest, userId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("[Discover] Loading timeout - forcing ready state");
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    loadSeeds();
  }, [loadSeeds]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSeeds();
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
