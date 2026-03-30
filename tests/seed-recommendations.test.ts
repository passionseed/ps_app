import { describe, expect, it } from "vitest";
import type { SeedWithEnrollment } from "../types/seeds";
import {
  buildSeedRecommendationSections,
  getRecommendationCacheStatus,
  hydrateRecommendationSeedMedia,
  isRecommendationPayloadFresh,
  type SeedRecommendation,
  type SeedRecommendationsPayload,
} from "../lib/seedRecommendations";

function makeSeed(
  id: string,
  title: string,
  recommendationScore: number,
  overrides: Partial<SeedRecommendation> = {},
): SeedRecommendation {
  const baseSeed: SeedWithEnrollment = {
    id,
    map_id: "map-1",
    title,
    description: `${title} description`,
    slogan: `${title} slogan`,
    cover_image_url: null,
    cover_image_blurhash: null,
    cover_image_key: null,
    cover_image_updated_at: null,
    category_id: null,
    created_by: null,
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
    path: {
      id: `path-${id}`,
      total_days: 5,
    },
    enrollment: null,
  };

  return {
    ...baseSeed,
    affinityScore: recommendationScore,
    gapScore: 100 - recommendationScore,
    recommendationScore,
    bucket: "recommended",
    reasons: [
      {
        code: "career_match",
        label: "Career match",
        detail: `${title} matches stated interests`,
      },
    ],
    coverage: {
      daysCompleted: 0,
      hasExplored: false,
      reflectionCount: 0,
      totalDays: 5,
    },
    ...overrides,
  };
}

describe("seed recommendations", () => {
  it("splits recommendations into stable discover sections", () => {
    const payload: SeedRecommendationsPayload = {
      version: 1,
      computedAt: "2026-03-29T12:00:00.000Z",
      source: "fresh",
      coverage: {
        activeCount: 1,
        exploredCount: 2,
        completedCount: 1,
        totalCount: 4,
        completionPercent: 50,
      },
      seeds: [
        makeSeed("continue", "Continue Seed", 95, {
          bucket: "continue",
          enrollment: {
            id: "enrollment-1",
            current_day: 2,
            status: "active",
            isDoneToday: false,
          },
          coverage: {
            daysCompleted: 1,
            hasExplored: true,
            reflectionCount: 1,
            totalDays: 5,
          },
        }),
        makeSeed("recommended", "Recommended Seed", 92),
        makeSeed("explore", "Explore Seed", 60, {
          bucket: "explore_more",
        }),
        makeSeed("deprioritized", "Deprioritized Seed", 20, {
          bucket: "deprioritized",
        }),
      ],
    };

    const sections = buildSeedRecommendationSections(payload.seeds);

    expect(sections.continue.map((seed) => seed.id)).toEqual(["continue"]);
    expect(sections.recommended.map((seed) => seed.id)).toEqual(["recommended"]);
    expect(sections.exploreMore.map((seed) => seed.id)).toEqual(["explore"]);
    expect(sections.deprioritized.map((seed) => seed.id)).toEqual(["deprioritized"]);
  });

  it("treats payloads inside ttl as fresh", () => {
    const now = new Date("2026-03-29T12:30:00.000Z").getTime();
    const payload: SeedRecommendationsPayload = {
      version: 1,
      computedAt: "2026-03-29T12:00:00.000Z",
      source: "fresh",
      coverage: {
        activeCount: 0,
        exploredCount: 0,
        completedCount: 0,
        totalCount: 1,
        completionPercent: 0,
      },
      seeds: [makeSeed("recommended", "Recommended Seed", 92)],
    };

    expect(isRecommendationPayloadFresh(payload, now, 60 * 60 * 1000)).toBe(true);
  });

  it("marks expired payloads as stale but usable", () => {
    const now = new Date("2026-03-29T14:30:00.000Z").getTime();
    const payload: SeedRecommendationsPayload = {
      version: 1,
      computedAt: "2026-03-29T12:00:00.000Z",
      source: "cache",
      coverage: {
        activeCount: 0,
        exploredCount: 0,
        completedCount: 0,
        totalCount: 1,
        completionPercent: 0,
      },
      seeds: [makeSeed("recommended", "Recommended Seed", 92)],
    };

    expect(isRecommendationPayloadFresh(payload, now, 60 * 60 * 1000)).toBe(false);
    expect(getRecommendationCacheStatus(payload, now, 60 * 60 * 1000)).toEqual({
      isFresh: false,
      isUsableWhileRevalidating: true,
    });
  });

  it("hydrates stale recommendation media from the live seed list", () => {
    const payload: SeedRecommendationsPayload = {
      version: 1,
      computedAt: "2026-03-29T12:00:00.000Z",
      source: "cache",
      coverage: {
        activeCount: 0,
        exploredCount: 0,
        completedCount: 0,
        totalCount: 1,
        completionPercent: 0,
      },
      seeds: [
        makeSeed("seed-1", "Baascii Experience", 92, {
          cover_image_url: null,
          cover_image_key: null,
          cover_image_updated_at: null,
        }),
      ],
    };

    const hydrated = hydrateRecommendationSeedMedia(payload, [
      {
        ...makeSeed("seed-1", "Baascii Experience", 50),
        cover_image_url: "https://cdn.example.com/baascii.png",
        cover_image_key: "seed-1.png",
        cover_image_updated_at: "2026-03-29T13:00:00.000Z",
      },
    ]);

    expect(hydrated.seeds[0].cover_image_url).toBe(
      "https://cdn.example.com/baascii.png",
    );
    expect(hydrated.seeds[0].cover_image_key).toBe("seed-1.png");
    expect(hydrated.seeds[0].cover_image_updated_at).toBe(
      "2026-03-29T13:00:00.000Z",
    );
    expect(hydrated.seeds[0].recommendationScore).toBe(92);
  });
});
