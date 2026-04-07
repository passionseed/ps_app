import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ViewStyle,
} from "react-native";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { AppText } from "../AppText";
import { CommentCard } from "./CommentCard";
import { ReplyCard } from "./ReplyCard";
import { CommentInput } from "./CommentInput";
import { ReplyInput } from "./ReplyInput";
import type { CommentWithReplies, ReplyWithParticipant } from "../../types/hackathon-comments";
import {
  getActivityComments,
  createActivityComment,
  createCommentReply,
  updateComment,
  updateReply,
  deleteComment,
  deleteReply,
  subscribeToActivityComments,
  unsubscribeFromActivityComments,
} from "../../lib/hackathonComments";

interface ActivityCommentsFullProps {
  activityId: string;
  participantId: string;
  isAdmin?: boolean;
}

export const ActivityCommentsFull: React.FC<ActivityCommentsFullProps> = ({
  activityId,
  participantId,
  isAdmin = false,
}) => {
  // State
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch comments on mount
  const fetchComments = useCallback(async () => {
    try {
      setError(null);
      const data = await getActivityComments(activityId);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Subscribe to real-time updates
  useEffect(() => {
    let isMounted = true;

    const setupSubscription = async () => {
      try {
        const channel = await subscribeToActivityComments(activityId, (updatedComments) => {
          if (isMounted) {
            setComments(updatedComments);
          }
        });
        channelRef.current = channel;
      } catch (err) {
        console.error("Failed to subscribe to comments:", err);
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        unsubscribeFromActivityComments(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activityId]);

  // Handlers
  const handleAddComment = useCallback(async (content: string) => {
    try {
      // Optimistically add comment to UI immediately
      const tempComment: CommentWithReplies = {
        id: `temp-${Date.now()}`,
        activity_id: activityId,
        participant_id: participantId,
        content,
        engagement_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        deleted_at: null,
        replies: [],
        participant: {
          id: participantId,
          display_name: "You",
          avatar_url: undefined,
        },
      };
      setComments((prev) => [tempComment, ...prev]);

      // Actually create the comment
      await createActivityComment(activityId, participantId, content);
      // Real-time subscription will update with actual data
    } catch (err) {
      // Remove temp comment on error
      setComments((prev) => prev.filter((c) => !c.id.startsWith("temp-")));
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add comment"
      );
    }
  }, [activityId, participantId]);

  const handleEditComment = useCallback(async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, participantId, content);
      // Real-time subscription will update the list
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update comment"
      );
    }
  }, [participantId]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteComment(commentId, participantId, isAdmin);
      // Real-time subscription will update the list
      if (expandedCommentId === commentId) {
        setExpandedCommentId(null);
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to delete comment"
      );
    }
  }, [participantId, isAdmin, expandedCommentId]);

  const handleAddReply = useCallback(async (commentId: string, content: string) => {
    try {
      // Optimistically add reply to UI immediately
      const tempReply: ReplyWithParticipant = {
        id: `temp-${Date.now()}`,
        comment_id: commentId,
        participant_id: participantId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        deleted_at: null,
        participant: {
          id: participantId,
          display_name: "You",
          avatar_url: undefined,
        },
      };
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: [...c.replies, tempReply] }
            : c
        )
      );
      setReplyingToCommentId(null);
      // Ensure the comment stays expanded to show the new reply
      setExpandedCommentId(commentId);

      // Actually create the reply
      await createCommentReply(commentId, participantId, content);
      // Real-time subscription will update with actual data
    } catch (err) {
      // Remove temp reply on error
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: c.replies.filter((r) => !r.id.startsWith("temp-")) }
            : c
        )
      );
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add reply"
      );
    }
  }, [participantId]);

  const handleEditReply = useCallback(async (replyId: string, content: string) => {
    try {
      await updateReply(replyId, participantId, content);
      // Real-time subscription will update the list
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update reply"
      );
    }
  }, [participantId]);

  const handleDeleteReply = useCallback(async (replyId: string) => {
    try {
      await deleteReply(replyId, participantId, isAdmin);
      // Real-time subscription will update the list
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to delete reply"
      );
    }
  }, [participantId, isAdmin]);

  const handleExpandComment = useCallback((commentId: string) => {
    setExpandedCommentId((prev) => (prev === commentId ? null : commentId));
    // Close reply input when collapsing
    if (expandedCommentId === commentId) {
      setReplyingToCommentId(null);
    }
  }, [expandedCommentId]);

  const handleStartReply = useCallback((commentId: string) => {
    setReplyingToCommentId(commentId);
    setExpandedCommentId(commentId);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingToCommentId(null);
  }, []);

  // Render helpers
  const renderLoadingSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonText} />
          </View>
          <View style={styles.skeletonContent} />
          <View style={styles.skeletonFooter} />
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <AppText style={styles.emptyIcon}>💬</AppText>
      <AppText style={styles.emptyTitle}>No comments yet</AppText>
      <AppText style={styles.emptySubtitle}>
        Start the discussion!
      </AppText>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <AppText style={styles.errorIcon}>⚠️</AppText>
      <AppText style={styles.errorText}>{error}</AppText>
      <AppText style={styles.errorRetry} onPress={fetchComments}>
        Tap to retry
      </AppText>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <CommentInput
            onSubmit={() => {}}
            placeholder="Add a comment..."
          />
        </View>
        {renderLoadingSkeleton()}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <CommentInput
            onSubmit={handleAddComment}
            placeholder="Add a comment..."
          />
        </View>
        {renderError()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Add Comment Input */}
        <View style={styles.inputContainer}>
          <CommentInput
            onSubmit={handleAddComment}
            placeholder="Add a comment..."
          />
        </View>

        {/* Comments List */}
        {comments.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.commentsList}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentWrapper}>
                <CommentCard
                  comment={comment}
                  currentParticipantId={participantId}
                  isAdmin={isAdmin}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onExpand={() => handleExpandComment(comment.id)}
                  isExpanded={expandedCommentId === comment.id}
                />

                {/* Expanded Replies */}
                {expandedCommentId === comment.id && (
                  <View style={styles.repliesContainer}>
                    {/* Replies List */}
                    {comment.replies && comment.replies.length > 0 && (
                      <View style={styles.repliesList}>
                        {comment.replies.map((reply) => (
                          <ReplyCard
                            key={reply.id}
                            reply={reply as ReplyWithParticipant}
                            currentParticipantId={participantId}
                            isAdmin={isAdmin}
                            onEdit={handleEditReply}
                            onDelete={handleDeleteReply}
                          />
                        ))}
                      </View>
                    )}

                    {/* Reply Input */}
                    {replyingToCommentId === comment.id ? (
                      <ReplyInput
                        commentId={comment.id}
                        replyToAuthor={comment.participant.display_name}
                        onSubmit={(content) => handleAddReply(comment.id, content)}
                        onCancel={handleCancelReply}
                      />
                    ) : (
                      <View style={styles.replyButtonContainer}>
                        <AppText
                          style={styles.replyButton}
                          onPress={() => handleStartReply(comment.id)}
                        >
                          Reply to {comment.participant.display_name}
                        </AppText>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  } as ViewStyle,
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentWrapper: {
    marginBottom: 8,
  },
  repliesContainer: {
    marginTop: 4,
  },
  repliesList: {
    marginTop: 4,
  },
  replyButtonContainer: {
    marginLeft: 36,
    marginTop: 8,
    marginBottom: 8,
  },
  replyButton: {
    color: "#91C4E3",
    fontSize: 13,
    paddingVertical: 8,
  },
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  // Error State
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255, 100, 100, 0.9)",
    textAlign: "center",
    marginBottom: 12,
  },
  errorRetry: {
    fontSize: 14,
    color: "#91C4E3",
    textDecorationLine: "underline",
  },
  // Loading Skeleton
  skeletonContainer: {
    paddingHorizontal: 16,
  },
  skeletonCard: {
    backgroundColor: "rgba(7, 12, 20, 0.94)",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.1)",
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(145, 196, 227, 0.15)",
  },
  skeletonText: {
    flex: 1,
    height: 16,
    backgroundColor: "rgba(145, 196, 227, 0.1)",
    borderRadius: 4,
    marginLeft: 12,
  },
  skeletonContent: {
    height: 60,
    backgroundColor: "rgba(145, 196, 227, 0.08)",
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonFooter: {
    height: 20,
    backgroundColor: "rgba(145, 196, 227, 0.05)",
    borderRadius: 4,
    width: "40%",
  },
});

export default ActivityCommentsFull;
