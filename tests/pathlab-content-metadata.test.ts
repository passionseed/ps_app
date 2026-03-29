import { describe, expect, it } from "vitest";

import {
  getActivityBehavior,
  type PathActivityBehavior,
  type PathActivityWithContent,
} from "../types/pathlab-content";

function makeActivity(
  overrides: Partial<PathActivityWithContent> = {},
): PathActivityWithContent {
  return {
    id: "activity-1",
    path_day_id: "day-1",
    title: "Customer discovery activity",
    instructions: null,
    display_order: 1,
    estimated_minutes: 15,
    is_required: true,
    is_draft: false,
    draft_reason: null,
    created_at: "2026-03-29T00:00:00.000Z",
    updated_at: "2026-03-29T00:00:00.000Z",
    path_content: [],
    path_assessment: null,
    ...overrides,
  };
}

describe("getActivityBehavior", () => {
  it("returns safe defaults for legacy activities without hackathon metadata", () => {
    const behavior = getActivityBehavior(makeActivity());

    expect(behavior).toEqual<PathActivityBehavior>({
      scope: "individual",
      artifactKind: "response",
      gateRule: "complete",
      reviewMode: "auto",
      unlockCondition: null,
      minMembersRequired: null,
    });
  });

  it("reads hackathon metadata from the activity first, then assessment, then content", () => {
    const activity = makeActivity({
      metadata: {
        scope: "hybrid",
        artifact_kind: "structured_canvas",
      },
      path_assessment: {
        id: "assessment-1",
        activity_id: "activity-1",
        assessment_type: "text_answer",
        points_possible: null,
        is_graded: true,
        metadata: {
          gate_rule: "mentor_pass",
          review_mode: "auto_then_mentor",
          min_members_required: 3,
        },
        created_at: "2026-03-29T00:00:00.000Z",
        updated_at: "2026-03-29T00:00:00.000Z",
      },
      path_content: [
        {
          id: "content-1",
          activity_id: "activity-1",
          content_type: "text",
          content_title: "Guide",
          content_url: null,
          content_body: "Use your interviews first.",
          display_order: 1,
          metadata: {
            unlock_condition: "all_interviews_uploaded",
          },
          created_at: "2026-03-29T00:00:00.000Z",
        },
      ],
    });

    expect(getActivityBehavior(activity)).toEqual<PathActivityBehavior>({
      scope: "hybrid",
      artifactKind: "structured_canvas",
      gateRule: "mentor_pass",
      reviewMode: "auto_then_mentor",
      unlockCondition: "all_interviews_uploaded",
      minMembersRequired: 3,
    });
  });
});
