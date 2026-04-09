import { storage } from "./storage";
import type { PathDayBundle } from "./pathlab";
import type { SeedWithEnrollment } from "../types/seeds";
import type { AffinityProfile } from "./userSignals";

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
  affinity: AffinityProfile | null = null,
): SeedRecommendationsPayload {
  const recommendations = [...seeds]
    .sort((a, b) => {
      const aStatus = a.enrollment?.status;
      const bStatus = b.enrollment?.status;
      const aActive = aStatus === "active" || aStatus === "paused" ? 1 : 0;
      const bActive = bStatus === "active" || bStatus === "paused" ? 1 : 0;
      return bActive - aActive;
    })
    .map<SeedRecommendation>((seed, index) => {
      const enrollment = seed.enrollment;
      const status = enrollment?.status;
      const isActive = status === "active" || status === "paused";
      const explored = Boolean(enrollment);

      // Compute affinity boost from user event signals
      let affinityBoost = 0;
      const matchedReasonLabels: RecommendationReason[] = [];
      if (affinity && seed.tags && seed.tags.length > 0) {
        const seedTagSet = new Set(seed.tags);
        for (const tag of affinity.tags) {
          if (seedTagSet.has(tag)) {
            affinityBoost += 12;
            const reasonLabel = affinity.reasons[tag];
            if (reasonLabel && matchedReasonLabels.length < 2) {
              matchedReasonLabels.push({
                code: "interest_match",
                label: reasonLabel,
                detail: `Your interest in ${tag} matches this path.`,
              });
            }
          }
        }
        affinityBoost = Math.min(affinityBoost, 40);
      }

      const recommendationScore = Math.min(100, Math.max(20, 100 - index * 7) + affinityBoost);

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
        reasons:
          matchedReasonLabels.length > 0
            ? matchedReasonLabels
            : [
                isActive
                  ? {
                      code: "active_path" as const,
                      label: "Continue momentum",
                      detail: `You're already on day ${seed.enrollment?.current_day ?? 1}.`,
                    }
                  : {
                      code: "coverage_gap" as const,
                      label: "Explore a new path",
                      detail: "Based on available paths.",
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
  const activeCount = recommendations.filter((seed) => {
    const s = seed.enrollment?.status;
    return s === "active" || s === "paused";
  }).length;

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

  const sections = ordered.reduce<RecommendationSections>(
    (sections, seed) => {
      const status = seed.enrollment?.status;
      const shouldBeInContinue =
        seed.bucket === "continue" ||
        (!!seed.enrollment && status !== "explored" && status !== "quit");

      if (shouldBeInContinue) {
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
    { continue: [], recommended: [], exploreMore: [], deprioritized: [] }
  );

  console.log(
    "[Recommendations] Section counts -> Continue:",
    sections.continue.length,
    "Recommended:",
    sections.recommended.length,
    "Explore More:",
    sections.exploreMore.length
  );

  return sections;
}

export function hydrateRecommendationSeedMedia(
  payload: SeedRecommendationsPayload,
  liveSeeds: SeedWithEnrollment[],
): SeedRecommendationsPayload {
  const liveSeedsById = new Map(liveSeeds.map((seed) => [seed.id, seed]));

  const updatedSeeds = payload.seeds.map((seed) => {
    const liveSeed = liveSeedsById.get(seed.id);

    if (!liveSeed) return seed;

    const enrollment = liveSeed.enrollment ?? seed.enrollment;
    const path = liveSeed.path ?? seed.path;
    const s = enrollment?.status;
    const isActive = s === "active" || s === "paused";

    return {
      ...seed,
      enrollment,
      path,
      socialProof: liveSeed.socialProof ?? seed.socialProof ?? null,
      cover_image_url: liveSeed.cover_image_url ?? seed.cover_image_url,
      cover_image_blurhash:
        liveSeed.cover_image_blurhash ?? seed.cover_image_blurhash,
      cover_image_key: liveSeed.cover_image_key ?? seed.cover_image_key,
      cover_image_updated_at:
        liveSeed.cover_image_updated_at ?? seed.cover_image_updated_at,
      bucket: isActive ? ("continue" as const) : seed.bucket,
      coverage: {
        ...seed.coverage,
        daysCompleted: Math.max(0, (enrollment?.current_day ?? 1) - 1),
        hasExplored: Boolean(enrollment),
        totalDays: path?.total_days ?? seed.coverage.totalDays,
      },
    };
  });

  const exploredCount = updatedSeeds.filter((s) => s.coverage.hasExplored)
    .length;
  const completedCount = updatedSeeds.filter(
    (s) => s.enrollment?.status === "explored",
  ).length;
  const activeCount = updatedSeeds.filter((s) => {
    const status = s.enrollment?.status;
    return status === "active" || status === "paused";
  }).length;

  return {
    ...payload,
    coverage: {
      activeCount,
      exploredCount,
      completedCount,
      totalCount: updatedSeeds.length,
      completionPercent:
        updatedSeeds.length === 0
          ? 0
          : Math.round((exploredCount / updatedSeeds.length) * 100),
    },
    seeds: updatedSeeds,
  };
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

export function readCachedSeedRecommendations(): SeedRecommendationsPayload | null {
  const raw = storage.getString(SEED_RECOMMENDATION_CACHE_KEY);
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

export function writeCachedSeedRecommendations(
  payload: SeedRecommendationsPayload,
): void {
  storage.set(
    SEED_RECOMMENDATION_CACHE_KEY,
    JSON.stringify(payload),
  );
}

function getPathDayBundleCacheKey(enrollmentId: string) {
  return `${PATH_DAY_BUNDLE_CACHE_PREFIX}/${enrollmentId}`;
}

export function readCachedPathDayBundle(
  enrollmentId: string,
): PathDayBundle | null {
  const raw = storage.getString(getPathDayBundleCacheKey(enrollmentId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PathDayBundle;
  } catch {
    return null;
  }
}

export function writeCachedPathDayBundle(
  enrollmentId: string,
  bundle: PathDayBundle,
): void {
  storage.set(
    getPathDayBundleCacheKey(enrollmentId),
    JSON.stringify(bundle),
  );
}
