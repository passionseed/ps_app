import { describe, expect, it } from "vitest";

import { getCommentParticipantBadge } from "../lib/hackathonCommentParticipant";

describe("getCommentParticipantBadge", () => {
  it("prefers the participant emoji over avatar and initial", () => {
    expect(
      getCommentParticipantBadge({
        id: "p1",
        display_name: "Alex",
        avatar_url: "https://example.com/avatar.png",
        team_emoji: "🚀",
      }),
    ).toEqual({ type: "emoji", value: "🚀" });
  });

  it("falls back to the avatar when no emoji is set", () => {
    expect(
      getCommentParticipantBadge({
        id: "p1",
        display_name: "Alex",
        avatar_url: "https://example.com/avatar.png",
        team_emoji: null,
      }),
    ).toEqual({ type: "avatar", value: "https://example.com/avatar.png" });
  });

  it("falls back to the display-name initial when emoji and avatar are missing", () => {
    expect(
      getCommentParticipantBadge({
        id: "p1",
        display_name: " alex ",
        avatar_url: null,
        team_emoji: "   ",
      }),
    ).toEqual({ type: "initial", value: "A" });
  });

  it("uses a question mark when the display name is blank", () => {
    expect(
      getCommentParticipantBadge({
        id: "p1",
        display_name: "   ",
        avatar_url: null,
        team_emoji: null,
      }),
    ).toEqual({ type: "initial", value: "?" });
  });
});
