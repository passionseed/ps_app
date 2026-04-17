/**
 * Hackathon Inbox Types
 *
 * Type definitions for the hackathon participant inbox system.
 * This includes inbox items, metadata, and related interfaces.
 */

// =============================================================================
// Core Types
// =============================================================================

export type InboxItemType =
  | "assessment_review"
  | "mentor_comment"
  | "admin_announcement"
  | "system";

export interface InboxItem {
  id: string;
  participant_id: string;
  type: InboxItemType;
  title: string;
  body: string;
  action_url: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxItemWithUnread extends InboxItem {
  isUnread: boolean;
}

export interface InboxPreview {
  unreadCount: number;
  recentItems: InboxItemWithUnread[];
  totalCount: number;
}

// =============================================================================
// Metadata Types for Different Item Types
// =============================================================================

export interface AssessmentReviewMetadata {
  submission_id: string;
  review_id: string;
  activity_title?: string;
  score_awarded?: number;
  points_possible?: number;
  reviewer_name?: string;
}

export interface MentorCommentMetadata {
  comment_id: string;
  activity_id: string;
  activity_title?: string;
  mentor_name?: string;
  mentor_avatar_url?: string;
}

export interface AdminAnnouncementMetadata {
  announcement_id: string;
  priority?: "low" | "medium" | "high";
  category?: string;
}

export interface SystemNotificationMetadata {
  notification_type: string;
  related_entity_id?: string;
  deadline?: string;
}

// =============================================================================
// API Input/Output Types
// =============================================================================

export interface GetInboxItemsOptions {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface InboxItemsResponse {
  items: InboxItemWithUnread[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

// =============================================================================
// UI Component Props Types
// =============================================================================

export interface InboxCardProps {
  preview: InboxPreview | null;
  onPress: () => void;
  loading?: boolean;
}

export interface InboxItemRowProps {
  item: InboxItemWithUnread;
  onPress: (item: InboxItemWithUnread) => void;
}

export interface InboxFilter {
  label: string;
  value: "all" | "unread" | "mentions";
}
