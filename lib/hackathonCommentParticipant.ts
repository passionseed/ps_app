import type { CommentParticipant } from "../types/hackathon-comments";

type ParticipantBadge =
  | { type: "emoji"; value: string }
  | { type: "avatar"; value: string }
  | { type: "initial"; value: string };

export function getCommentParticipantBadge(
  participant: CommentParticipant,
): ParticipantBadge {
  const emoji = participant.team_emoji?.trim();
  if (emoji) {
    return { type: "emoji", value: emoji };
  }

  const avatarUrl = participant.avatar_url?.trim();
  if (avatarUrl) {
    return { type: "avatar", value: avatarUrl };
  }

  const displayName = participant.display_name.trim();
  const initial = displayName.charAt(0).toUpperCase() || "?";
  return { type: "initial", value: initial };
}
