import { describe, expect, it } from "vitest";
import { getSeedSocialProofBadge } from "../lib/seedSocialProof";
import type { SeedWithEnrollment } from "../types/seeds";

function makeSeed(
  overrides: Partial<Pick<SeedWithEnrollment, "enrollment" | "socialProof">> = {},
): SeedWithEnrollment {
  return {
    id: "seed-1",
    map_id: "map-1",
    title: "Seed 1",
    description: null,
    slogan: null,
    cover_image_url: null,
    cover_image_blurhash: null,
    cover_image_key: null,
    cover_image_updated_at: null,
    category_id: null,
    tags: [],
    created_by: null,
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
    path: {
      id: "path-1",
      total_days: 5,
    },
    socialProof: null,
    enrollment: null,
    ...overrides,
  };
}

describe("getSeedSocialProofBadge", () => {
  it("prefers live exploring counts for available cards", () => {
    expect(
      getSeedSocialProofBadge(
        makeSeed({
          socialProof: {
            exploringCount: 12,
            completedCount: 45,
          },
        }),
      ),
    ).toEqual({
      label: "12 students exploring",
      tone: "exploring",
    });
  });

  it("falls back to completed counts when nobody is currently exploring", () => {
    expect(
      getSeedSocialProofBadge(
        makeSeed({
          socialProof: {
            exploringCount: 0,
            completedCount: 45,
          },
        }),
      ),
    ).toEqual({
      label: "45 completed",
      tone: "completed",
    });
  });

  it("suppresses social proof on in-progress cards", () => {
    expect(
      getSeedSocialProofBadge(
        makeSeed({
          enrollment: {
            id: "enrollment-1",
            current_day: 2,
            status: "active",
          },
          socialProof: {
            exploringCount: 12,
            completedCount: 45,
          },
        }),
      ),
    ).toBeNull();
  });
});
