import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PathDayBundle } from "./pathlab";
import type { SeedWithEnrollment } from "../types/seeds";

export const SEED_RECOMMENDATION_SCHEMA_VERSION = 1;
export const SEED_RECOMMENDATION_CACHE_TTL_MS = 60 * 60 * 1000;
export const SEED_RECOMMENDATION_CACHE_KEY = "seed-recommendations/v1";
export const PATH_DAY_BUNDLE_CACHE_PREFIX = "path-day-bundle/v1";

export type RecommendationReasonCode =
  | "career_match"
  | "interest_match"
  | "active_path"
  | "coverage_gap"
  | "momentum"
  | "reflection_signal";

export interface RecommendationReason {
  code: RecommendationReasonCode;
  label: string;
  detail: string;
}

export interface SeedCoverageSnapshot {
  daysCompleted: number;
  hasExplored: boolean;
  reflectionCount: number;
  totalDays: number;
}

export type RecommendationBucket =
  | "continue"
  | "recommended"
  | "explore_more"
  | "deprioritized";

export interface SeedRecommendation extends SeedWithEnrollment {
  affinityScore: number;
  gapScore: number;
  recommendationScore: number;
  bucket: RecommendationBucket;
  reasons: RecommendationReason[];
  coverage: SeedCoverageSnapshot;
}

export interface SeedCoverageSummary {
  activeCount: number;
  exploredCount: number;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
}

export interface SeedRecommendationsPayload {
  version: number;
  computedAt: string;
  source: "fresh" | "cache" | "fallback";
  coverage: SeedCoverageSummary;
  seeds: SeedRecommendation[];
}

export interface RecommendationSections {
  continue: SeedRecommendation[];
  recommended: SeedRecommendation[];
  exploreMore: SeedRecommendation[];
  deprioritized: SeedRecommendation[];
}

export function buildFallbackRecommendations(
  seeds: SeedWithEnrollment[],
): SeedRecommendationsPayload {
  const recommendations = [...seeds]
    .sort((a, b) => {
      const aActive = ["active", "paused"].includes(a.enrollment?.status ?? "")
        ? 1
        : 0;
      const bActive = ["active", "paused"].includes(b.enrollment?.status ?? "")
        ? 1
        : 0;
      return bActive - aActive;
    })
    .map<SeedRecommendation>((seed, index) => {
      const isActive = ["active", "paused"].includes(seed.enrollment?.status ?? "");
      const explored = Boolean(seed.enrollment);
      const recommendationScore = Math.max(20, 100 - index * 7);

      return {
        ...seed,
        affinityScore: recommendationScore,
        gapScore: explored ? 20 : 75,
        recommendationScore,
        bucket: isActive
          ? "continue"
          : recommendationScore >= 65
            ? "recommended"
            : recommendationScore >= 40
              ? "explore_more"
              : "deprioritized",
        reasons: [
          isActive
            ? {
                code: "active_path",
                label: "Continue momentum",
                detail: `You're already on day ${seed.enrollment?.current_day ?? 1}.`,
              }
            : {
                code: "coverage_gap",
                label: "Explore a new path",
                detail: "Recommendation service unavailable, showing available paths.",
              },
        ],
        coverage: {
          daysCompleted: Math.max(0, (seed.enrollment?.current_day ?? 1) - 1),
          hasExplored: explored,
          reflectionCount: 0,
          totalDays: seed.path?.total_days ?? 0,
        },
      };
    });

  const exploredCount = recommendations.filter((seed) => seed.coverage.hasExplored).length;
  const completedCount = recommendations.filter(
    (seed) => seed.enrollment?.status === "explored",
  ).length;
  const activeCount = recommendations.filter((seed) =>
    ["active", "paused"].includes(seed.enrollment?.status ?? ""),
  ).length;

  return {
    version: SEED_RECOMMENDATION_SCHEMA_VERSION,
    computedAt: new Date().toISOString(),
    source: "fallback",
    coverage: {
      activeCount,
      exploredCount,
      completedCount,
      totalCount: recommendations.length,
      completionPercent:
        recommendations.length === 0
          ? 0
          : Math.round((exploredCount / recommendations.length) * 100),
    },
    seeds: recommendations,
  };
}

export function buildSeedRecommendationSections(
  seeds: SeedRecommendation[],
): RecommendationSections {
  const ordered = [...seeds].sort(
    (a, b) => b.recommendationScore - a.recommendationScore,
  );

  return ordered.reduce<RecommendationSections>(
    (sections, seed) => {
      if (seed.bucket === "continue") {
        sections.continue.push(seed);
      } else if (seed.bucket === "recommended") {
        sections.recommended.push(seed);
      } else if (seed.bucket === "explore_more") {
        sections.exploreMore.push(seed);
      } else {
        sections.deprioritized.push(seed);
      }

      return sections;
    },
    {
      continue: [],
      recommended: [],
      exploreMore: [],
      deprioritized: [],
    },
  );
}

export function isRecommendationPayloadFresh(
  payload: SeedRecommendationsPayload,
  now = Date.now(),
  ttlMs = SEED_RECOMMENDATION_CACHE_TTL_MS,
): boolean {
  const computedAt = new Date(payload.computedAt).getTime();
  if (!Number.isFinite(computedAt)) return false;
  return now - computedAt <= ttlMs;
}

export function getRecommendationCacheStatus(
  payload: SeedRecommendationsPayload | null,
  now = Date.now(),
  ttlMs = SEED_RECOMMENDATION_CACHE_TTL_MS,
) {
  const isFresh = payload
    ? isRecommendationPayloadFresh(payload, now, ttlMs)
    : false;

  return {
    isFresh,
    isUsableWhileRevalidating: Boolean(payload),
  };
}

export async function readCachedSeedRecommendations(): Promise<SeedRecommendationsPayload | null> {
  const raw = await AsyncStorage.getItem(SEED_RECOMMENDATION_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SeedRecommendationsPayload;
    if (parsed.version !== SEED_RECOMMENDATION_SCHEMA_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedSeedRecommendations(
  payload: SeedRecommendationsPayload,
): Promise<void> {
  await AsyncStorage.setItem(
    SEED_RECOMMENDATION_CACHE_KEY,
    JSON.stringify(payload),
  );
}

function getPathDayBundleCacheKey(enrollmentId: string) {
  return `${PATH_DAY_BUNDLE_CACHE_PREFIX}/${enrollmentId}`;
}

export async function readCachedPathDayBundle(
  enrollmentId: string,
): Promise<PathDayBundle | null> {
  const raw = await AsyncStorage.getItem(getPathDayBundleCacheKey(enrollmentId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PathDayBundle;
  } catch {
    return null;
  }
}

export async function writeCachedPathDayBundle(
  enrollmentId: string,
  bundle: PathDayBundle,
): Promise<void> {
  await AsyncStorage.setItem(
    getPathDayBundleCacheKey(enrollmentId),
    JSON.stringify(bundle),
  );
}
