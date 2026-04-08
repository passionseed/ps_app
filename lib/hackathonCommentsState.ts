import type { CommentWithReplies } from "../types/hackathon-comments";

export function removeCommentFromList(
  comments: CommentWithReplies[],
  commentId: string
): CommentWithReplies[] {
  return comments.filter((comment) => comment.id !== commentId);
}
