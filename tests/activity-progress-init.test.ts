import { describe, expect, it, vi } from "vitest";

import type { PathActivityProgress } from "../types/pathlab-content";
import { ensureActivityHasProgress } from "../lib/activityProgress";

describe("ensureActivityHasProgress", () => {
  it("attaches ensured progress when the activity is missing progress", async () => {
    const progress: PathActivityProgress = {
      id: "progress-1",
      enrollment_id: "enrollment-1",
      activity_id: "activity-1",
      status: "in_progress",
      started_at: "2026-03-29T00:00:00.000Z",
      completed_at: null,
      time_spent_seconds: null,
      created_at: "2026-03-29T00:00:00.000Z",
      updated_at: "2026-03-29T00:00:00.000Z",
    };
    const ensureProgress = vi.fn().mockResolvedValue(progress);
    const activity = { id: "activity-1", title: "NPC chat" };

    const resolvedActivity = await ensureActivityHasProgress(activity, {
      enrollmentId: "enrollment-1",
      activityId: "activity-1",
      ensureProgress,
    });

    expect(ensureProgress).toHaveBeenCalledWith("enrollment-1", "activity-1");
    expect(resolvedActivity).toEqual({
      ...activity,
      progress,
    });
  });

  it("does not re-fetch progress when the activity already has it", async () => {
    const progress: PathActivityProgress = {
      id: "progress-1",
      enrollment_id: "enrollment-1",
      activity_id: "activity-1",
      status: "in_progress",
      started_at: "2026-03-29T00:00:00.000Z",
      completed_at: null,
      time_spent_seconds: null,
      created_at: "2026-03-29T00:00:00.000Z",
      updated_at: "2026-03-29T00:00:00.000Z",
    };
    const ensureProgress = vi.fn();
    const activity = { id: "activity-1", progress };

    const resolvedActivity = await ensureActivityHasProgress(activity, {
      enrollmentId: "enrollment-1",
      activityId: "activity-1",
      ensureProgress,
    });

    expect(ensureProgress).not.toHaveBeenCalled();
    expect(resolvedActivity).toBe(activity);
  });

  it("leaves the activity unchanged when enrollment context is missing", async () => {
    const ensureProgress = vi.fn();
    const activity = { id: "activity-1", title: "NPC chat" };

    const resolvedActivity = await ensureActivityHasProgress(activity, {
      enrollmentId: undefined,
      activityId: "activity-1",
      ensureProgress,
    });

    expect(ensureProgress).not.toHaveBeenCalled();
    expect(resolvedActivity).toBe(activity);
  });
});
