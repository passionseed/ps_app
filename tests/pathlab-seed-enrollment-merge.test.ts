import { describe, expect, it } from "vitest";
import type { SeedWithEnrollment } from "../types/seeds";
import { mergeSeedEnrollmentState } from "../lib/seedEnrollmentMerge";

function makeSeed(
  id: string,
  enrollment: SeedWithEnrollment["enrollment"],
): SeedWithEnrollment {
  return {
    id,
    map_id: "map-1",
    title: `Seed ${id}`,
    description: null,
    slogan: null,
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
    enrollment,
  };
}

describe("mergeSeedEnrollmentState", () => {
  it("keeps the previous enrollment when refresh data omits it", () => {
    const previous = [
      makeSeed("seed-1", {
        id: "enrollment-1",
        current_day: 3,
        status: "active",
        isDoneToday: true,
      }),
    ];
    const next = [
      makeSeed("seed-1", null),
    ];

    expect(mergeSeedEnrollmentState(previous, next)).toEqual(previous);
  });

  it("prefers fresh enrollment data when both snapshots have it", () => {
    const previous = [
      makeSeed("seed-1", {
        id: "enrollment-1",
        current_day: 3,
        status: "active",
        isDoneToday: false,
      }),
    ];
    const next = [
      makeSeed("seed-1", {
        id: "enrollment-1",
        current_day: 4,
        status: "paused",
        isDoneToday: true,
      }),
    ];

    expect(mergeSeedEnrollmentState(previous, next)).toEqual(next);
  });
});
