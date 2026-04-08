/**
 * Activity Comments System Types
 *
 * Type definitions for the activity comments and replies system,
 * including push notification tokens.
 */

// =============================================================================
// Core Database Record Types
// =============================================================================

/**
 * Represents a comment on an activity in the database
 */
export interface CommentRecord {
  id: string;
  activity_id: string;
  participant_id: string;
  content: string;
  engagement_score: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  deleted_at?: string | null;
}

/**
 * Represents a reply to a comment in the database
 */
export interface ReplyRecord {
  id: string;
  comment_id: string;
  participant_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  deleted_at?: string | null;
}

/**
 * Represents a push notification token for a participant
 */
export interface PushTokenRecord {
  id: string;
  participant_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Extended Types with Relations
// =============================================================================

/**
 * Basic participant info for display in comments/replies
 */
export interface CommentParticipant {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  team_emoji?: string | null;
}

/**
 * Comment with its replies and participant info
 */
export interface CommentWithReplies extends CommentRecord {
  replies: ReplyRecord[];
  participant: CommentParticipant;
}

/**
 * Reply with participant info
 */
export interface ReplyWithParticipant extends ReplyRecord {
  participant: CommentParticipant;
}

// =============================================================================
// API Input Types
// =============================================================================

/**
 * Input for creating a new comment
 */
export interface CreateCommentInput {
  activity_id: string;
  participant_id: string;
  content: string;
}

/**
 * Input for creating a new reply to a comment
 */
export interface CreateReplyInput {
  comment_id: string;
  participant_id: string;
  content: string;
}

/**
 * Input for updating an existing comment
 */
export interface UpdateCommentInput {
  comment_id: string;
  participant_id: string;
  content: string;
}
