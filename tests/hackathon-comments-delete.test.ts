import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CommentWithReplies } from "../types/hackathon-comments";

const updateMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const invokeMock = vi.hoisted(() => vi.fn());
const readHackathonTokenMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: fromMock,
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock("../lib/hackathon-mode", () => ({
  readHackathonToken: readHackathonTokenMock,
}));

function buildComment(id: string, participantId = "participant-1"): CommentWithReplies {
  return {
    id,
    activity_id: "activity-1",
    participant_id: participantId,
    content: `comment-${id}`,
    engagement_score: 0,
    created_at: "2026-04-08T10:00:00.000Z",
    updated_at: "2026-04-08T10:00:00.000Z",
    is_edited: false,
    deleted_at: null,
    replies: [],
    participant: {
      id: participantId,
      display_name: `Participant ${participantId}`,
      avatar_url: null,
      team_emoji: null,
    },
  };
}

describe("hackathon comment deletion", () => {
  beforeEach(() => {
    fromMock.mockReset();
    updateMock.mockReset();
    eqMock.mockReset();
    invokeMock.mockReset();
    readHackathonTokenMock.mockReset();

    fromMock.mockReturnValue({
      update: updateMock,
    });
    updateMock.mockReturnValue({
      eq: eqMock,
    });

    readHackathonTokenMock.mockResolvedValue(null);
  });

  it("throws when a delete request does not match any comment rows", async () => {
    const selectMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const participantFilterMock = vi.fn().mockReturnValue({
      select: selectMock,
    });

    eqMock.mockReturnValue({
      eq: participantFilterMock,
    });

    const { deleteComment } = await import("../lib/hackathonComments");

    await expect(
      deleteComment("comment-1", "participant-1", false),
    ).rejects.toThrow("Comment could not be deleted");
  });

  it("uses the hackathon bearer token transport when one is available", async () => {
    readHackathonTokenMock.mockResolvedValue("hackathon-token");
    invokeMock.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { deleteComment } = await import("../lib/hackathonComments");

    await deleteComment("comment-1", "participant-1", false);

    expect(invokeMock).toHaveBeenCalledWith("hackathon-comments", {
      body: {
        action: "delete_comment",
        commentId: "comment-1",
        participantId: "participant-1",
        isAdmin: false,
      },
      headers: {
        Authorization: "Bearer hackathon-token",
      },
    });
  });

  it("removes a deleted comment from local state immediately", async () => {
    const { removeCommentFromList } = await import("../lib/hackathonCommentsState");

    expect(
      removeCommentFromList(
        [buildComment("comment-1"), buildComment("comment-2")],
        "comment-1",
      ),
    ).toEqual([buildComment("comment-2")]);
  });

  it("treats mentors as comment moderators", async () => {
    const { isCommentModeratorRole } = await import(
      "../lib/hackathonCommentsPermissions"
    );

    expect(isCommentModeratorRole("mentor")).toBe(true);
    expect(isCommentModeratorRole("admin")).toBe(true);
    expect(isCommentModeratorRole("participant")).toBe(false);
  });
});
