const COMMENT_MODERATOR_ROLES = new Set(["admin", "mentor", "organizer"]);

export function isCommentModeratorRole(role?: string | null): boolean {
  return role ? COMMENT_MODERATOR_ROLES.has(role) : false;
}
