import { describe, expect, it } from "vitest";

import {
  buildSeedAnalyticsPayload,
  getCompletedSeedMilestone,
} from "../lib/seedVelocityAnalytics";

describe("seed velocity analytics helpers", () => {
  it("builds stable seed analytics payloads from seed metadata", () => {
    expect(
      buildSeedAnalyticsPayload({
        seed: {
          id: "seed-1",
          title: "UX Designer Discovery",
          category_id: "category-tech",
          tags: ["ux", "design"],
        },
        pathId: "path-1",
      }),
    ).toEqual({
      seed_id: "seed-1",
      path_id: "path-1",
      seed_title: "UX Designer Discovery",
      category_id: "category-tech",
      tags: ["ux", "design"],
    });
  });

  it("normalizes missing optional seed analytics fields", () => {
    expect(
      buildSeedAnalyticsPayload({
        seed: {
          id: "seed-2",
          title: "Mystery Seed",
          category_id: null,
          tags: [],
        },
        pathId: null,
      }),
    ).toEqual({
      seed_id: "seed-2",
      path_id: null,
      seed_title: "Mystery Seed",
      category_id: null,
      tags: [],
    });
  });

  it("flags only the required completed-seed milestones", () => {
    expect(getCompletedSeedMilestone(0)).toBeNull();
    expect(getCompletedSeedMilestone(1)).toBe(1);
    expect(getCompletedSeedMilestone(2)).toBe(2);
    expect(getCompletedSeedMilestone(3)).toBe(3);
    expect(getCompletedSeedMilestone(4)).toBeNull();
    expect(getCompletedSeedMilestone(5)).toBe(5);
    expect(getCompletedSeedMilestone(8)).toBeNull();
  });
});
