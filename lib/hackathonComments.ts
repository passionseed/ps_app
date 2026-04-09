import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  CommentRecord,
  ReplyRecord,
  CommentWithReplies,
  ReplyWithParticipant,
} from "../types/hackathon-comments";
import { readHackathonToken } from "./hackathon-mode";

async function getSupabaseClient() {
  const mod = await import("./supabase");
  return mod.supabase;
}

async function invokeHackathonCommentMutation(
  body: Record<string, unknown>
): Promise<boolean> {
  const token = await readHackathonToken();

  if (!token) {
    return false;
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.functions.invoke("hackathon-comments", {
    body,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

// =============================================================================
// CRUD Functions
// =============================================================================

/**
 * Create a new comment on an activity
 */
export async function createActivityComment(
  activityId: string,
  participantId: string,
  content: string
): Promise<CommentRecord> {
  const supabase = await getSupabaseClient();
  const trimmedContent = content.trim();

  const { data, error } = await supabase
    .from("hackathon_activity_comments")
    .insert({
      activity_id: activityId,
      participant_id: participantId,
      content: trimmedContent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create comment: ${error.message}`);
  }

  return data as CommentRecord;
}

/**
 * Create a reply to a comment
 */
export async function createCommentReply(
  commentId: string,
  participantId: string,
  content: string
): Promise<ReplyRecord> {
  const supabase = await getSupabaseClient();
  const trimmedContent = content.trim();

  const { data, error } = await supabase
    .from("hackathon_activity_comment_replies")
    .insert({
      comment_id: commentId,
      participant_id: participantId,
      content: trimmedContent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create reply: ${error.message}`);
  }

  return data as ReplyRecord;
}

/**
 * Update an existing comment (only by the author)
 */
export async function updateComment(
  commentId: string,
  participantId: string,
  content: string
): Promise<CommentRecord> {
  const supabase = await getSupabaseClient();
  const trimmedContent = content.trim();

  const { data, error } = await supabase
    .from("hackathon_activity_comments")
    .update({
      content: trimmedContent,
      is_edited: true,
    })
    .eq("id", commentId)
    .eq("participant_id", participantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update comment: ${error.message}`);
  }

  return data as CommentRecord;
}

/**
 * Soft delete a comment (mark as deleted)
 * Admins can delete any comment, participants can only delete their own
 */
export async function deleteComment(
  commentId: string,
  participantId: string,
  isAdmin: boolean
): Promise<void> {
  const usedHackathonTransport = await invokeHackathonCommentMutation({
    action: "delete_comment",
    commentId,
    participantId,
    isAdmin,
  });

  if (usedHackathonTransport) {
    return;
  }

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("hackathon_activity_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);

  if (!isAdmin) {
    query = query.eq("participant_id", participantId);
  }

  const { data, error } = await query.select("id");

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Comment could not be deleted. It may have already been removed or you may not have permission."
    );
  }
}

/**
 * Update an existing reply (only by the author)
 */
export async function updateReply(
  replyId: string,
  participantId: string,
  content: string
): Promise<ReplyRecord> {
  const supabase = await getSupabaseClient();
  const trimmedContent = content.trim();

  const { data, error } = await supabase
    .from("hackathon_activity_comment_replies")
    .update({
      content: trimmedContent,
      is_edited: true,
    })
    .eq("id", replyId)
    .eq("participant_id", participantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update reply: ${error.message}`);
  }

  return data as ReplyRecord;
}

/**
 * Soft delete a reply (mark as deleted)
 * Admins can delete any reply, participants can only delete their own
 */
export async function deleteReply(
  replyId: string,
  participantId: string,
  isAdmin: boolean
): Promise<void> {
  const usedHackathonTransport = await invokeHackathonCommentMutation({
    action: "delete_reply",
    replyId,
    participantId,
    isAdmin,
  });

  if (usedHackathonTransport) {
    return;
  }

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("hackathon_activity_comment_replies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", replyId);

  if (!isAdmin) {
    query = query.eq("participant_id", participantId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to delete reply: ${error.message}`);
  }
}

// =============================================================================
// Fetch Functions
// =============================================================================

/**
 * Get all comments for an activity with participant info and replies
 * Ordered by engagement score (descending), optionally limited
 */
export async function getActivityComments(
  activityId: string,
  limit?: number
): Promise<CommentWithReplies[]> {
  const supabase = await getSupabaseClient();

  let query = supabase
    .from("hackathon_activity_comments")
    .select(
      `
      *,
      hackathon_participants!participant_id(id, display_name, avatar_url, team_emoji),
      hackathon_activity_comment_replies(
        *,
        hackathon_participants!participant_id(id, display_name, avatar_url, team_emoji)
      )
    `
    )
    .eq("activity_id", activityId)
    .is("deleted_at", null)
    .order("engagement_score", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  // Transform data to match expected format and filter deleted replies
  const comments = (data || []).filter(Boolean).map((comment: any) => {
    const filteredReplies = (comment.hackathon_activity_comment_replies || []).filter(Boolean).filter(
      (reply: any) => !reply.deleted_at
    ).map((reply: any) => ({
      ...reply,
      participant: reply.hackathon_participants
    }));
    return {
      ...comment,
      participant: comment.hackathon_participants,
      replies: filteredReplies,
    };
  });

  return comments as CommentWithReplies[];
}

/**
 * Get all replies for a specific comment with participant info
 */
export async function getCommentReplies(
  commentId: string
): Promise<ReplyWithParticipant[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("hackathon_activity_comment_replies")
    .select(
      `
      *,
      hackathon_participants!participant_id(id, display_name, avatar_url, team_emoji)
    `
    )
    .eq("comment_id", commentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch replies: ${error.message}`);
  }

  // Transform data to match expected format
  const replies = (data || []).filter(Boolean).map((reply: any) => ({
    ...reply,
    participant: reply.hackathon_participants
  }));

  return replies as ReplyWithParticipant[];
}

// =============================================================================
// Real-time Subscription
// =============================================================================

/**
 * Subscribe to real-time changes for comments on an activity
 * Returns the channel for cleanup
 */
export async function subscribeToActivityComments(
  activityId: string,
  callback: (comments: CommentWithReplies[]) => void
): Promise<RealtimeChannel> {
  const supabase = await getSupabaseClient();

  // Create a unique channel name for this activity
  const channelName = `activity-comments-${activityId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hackathon_activity_comments",
        filter: `activity_id=eq.${activityId}`,
      },
      async () => {
        // Refetch all comments when any change occurs
        const comments = await getActivityComments(activityId);
        callback(comments);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hackathon_activity_comment_replies",
      },
      async () => {
        // Refetch all comments when any reply changes
        // This will include the updated replies in the nested data
        const comments = await getActivityComments(activityId);
        callback(comments);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a comments channel
 * Call this when the component unmounts to clean up the subscription
 */
export async function unsubscribeFromActivityComments(
  channel: RealtimeChannel
): Promise<void> {
  const supabase = await getSupabaseClient();
  await supabase.removeChannel(channel);
}
