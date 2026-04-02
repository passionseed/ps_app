import { describe, expect, it } from "vitest";

import {
  getPathlabActivityRoute,
  getPathlabSeedEntryRoute,
  getPathlabSeedDayActivityRoute,
} from "../lib/pathlabNavigation";

describe("PathLab seed navigation", () => {
  it("routes seed continue/start into the PathLab day screen when the day still has work", () => {
    expect(
      getPathlabSeedEntryRoute({
        enrollmentId: "enrollment-123",
        hasIncompleteActivities: true,
      }),
    ).toEqual({
      pathname: "/path/[enrollmentId]",
      params: { enrollmentId: "enrollment-123" },
    });
  });

  it("routes seed continue/start to reflection when the day is already complete", () => {
    expect(
      getPathlabSeedEntryRoute({
        enrollmentId: "enrollment-123",
        hasIncompleteActivities: false,
      }),
    ).toEqual({
      pathname: "/reflection/[enrollmentId]",
      params: { enrollmentId: "enrollment-123" },
    });
  });

  it("keeps current-day seed taps inside the PathLab day screen", () => {
    expect(
      getPathlabSeedDayActivityRoute({
        enrollmentId: "enrollment-123",
        activityId: "activity-abc",
        pageIndex: 1,
        totalPages: 3,
        isCurrentDay: true,
      }),
    ).toEqual({
      pathname: "/path/[enrollmentId]",
      params: { enrollmentId: "enrollment-123" },
    });
  });

  it("still allows direct review for non-current-day PathLab activities", () => {
    expect(
      getPathlabSeedDayActivityRoute({
        enrollmentId: "enrollment-123",
        activityId: "activity-abc",
        pageIndex: 1,
        totalPages: 3,
        isCurrentDay: false,
      }),
    ).toEqual({
      pathname: "/activity/[activityId]",
      params: {
        activityId: "activity-abc",
        enrollmentId: "enrollment-123",
        pageIndex: "1",
        totalPages: "3",
      },
    });
  });

  it("builds an explicit PathLab activity route object", () => {
    expect(
      getPathlabActivityRoute({
        enrollmentId: "enrollment-123",
        activityId: "activity-xyz",
        pageIndex: 2,
        totalPages: 5,
      }),
    ).toEqual({
      pathname: "/activity/[activityId]",
      params: {
        activityId: "activity-xyz",
        enrollmentId: "enrollment-123",
        pageIndex: "2",
        totalPages: "5",
      },
    });
  });
});
