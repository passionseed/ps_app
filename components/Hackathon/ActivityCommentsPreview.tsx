import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { AppText } from "../AppText";
import { getActivityComments } from "../../lib/hackathonComments";
import { CommentWithReplies } from "../../types/hackathon-comments";

interface ActivityCommentsPreviewProps {
  activityId: string;
  participantId: string;
  isAdmin?: boolean;
  onSeeAll: () => void;
}

const MAX_PREVIEW_LENGTH = 100;

/**
 * Truncates text to a maximum length, adding ellipsis if needed
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Preview version of CommentCard that shows truncated content
 * and doesn't allow expansion (just shows reply count)
 */
interface CommentPreviewCardProps {
  comment: CommentWithReplies;
  participantId: string;
  isAdmin?: boolean;
}

const CommentPreviewCard: React.FC<CommentPreviewCardProps> = (props: CommentPreviewCardProps) => {
  const { comment } = props;
  const replyCount = comment.replies?.length || 0;
  const truncatedContent = truncateText(comment.content, MAX_PREVIEW_LENGTH);

  return (
    <View style={styles.previewCard}>
      {/* Header: Avatar placeholder and name */}
      <View style={styles.previewHeader}>
        <View style={styles.previewAvatar}>
          <AppText style={styles.previewAvatarInitial}>
            {comment.participant.display_name.charAt(0).toUpperCase()}
          </AppText>
        </View>
        <AppText variant="bold" style={styles.previewAuthorName}>
          {comment.participant.display_name}
        </AppText>
      </View>

      {/* Truncated Content */}
      <AppText style={styles.previewContent}>{truncatedContent}</AppText>

      {/* Reply count badge */}
      {replyCount > 0 && (
        <View style={styles.replyBadge}>
          <AppText style={styles.replyCount}>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </AppText>
        </View>
      )}
    </View>
  );
};

/**
 * ActivityCommentsPreview - Shows top 3 comments preview on activity screen
 */
export const ActivityCommentsPreview: React.FC<ActivityCommentsPreviewProps> = ({
  activityId,
  participantId,
  isAdmin = false,
  onSeeAll,
}: ActivityCommentsPreviewProps) => {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch top 3 comments sorted by engagement_score DESC
      const fetchedComments = await getActivityComments(activityId, 3);
      setComments(fetchedComments);
      // Total count would ideally come from a separate count query
      // For now, we use the length as an approximation
      setTotalCount(fetchedComments.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = useCallback(() => {
    // Navigate to full comments page where user can add a comment
    onSeeAll();
  }, [onSeeAll]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.divider} />
        <View style={styles.header}>
          <AppText variant="bold" style={styles.headerTitle}>
            💬 Comments
          </AppText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#91C4E3" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.divider} />
        <View style={styles.header}>
          <AppText variant="bold" style={styles.headerTitle}>
            💬 Comments
          </AppText>
        </View>
        <View style={styles.errorContainer}>
          <AppText style={styles.errorText}>{error}</AppText>
          <TouchableOpacity onPress={fetchComments} style={styles.retryButton}>
            <AppText style={styles.retryButtonText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.divider} />
        <View style={styles.header}>
          <AppText variant="bold" style={styles.headerTitle}>
            💬 Comments (0)
          </AppText>
        </View>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>
            No comments yet. Start the discussion!
          </AppText>
          <TouchableOpacity onPress={handleAddComment} style={styles.addButton}>
            <AppText style={styles.addButtonText}>Add Comment</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.header}>
        <AppText variant="bold" style={styles.headerTitle}>
          💬 Comments ({totalCount})
        </AppText>
      </View>

      <View style={styles.commentsList}>
        {comments.map((comment: CommentWithReplies) => (
          <CommentPreviewCard
            key={comment.id}
            comment={comment}
            participantId={participantId}
            isAdmin={isAdmin}
          />
        ))}
      </View>

      <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
        <AppText style={styles.seeAllText}>See All Comments</AppText>
        <AppText style={styles.seeAllArrow}>→</AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  } as ViewStyle,
  divider: {
    height: 1,
    backgroundColor: "rgba(145, 196, 227, 0.2)",
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  loadingContainer: {
    paddingVertical: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    paddingVertical: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "rgba(255, 100, 100, 0.9)",
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "rgba(145, 196, 227, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#91C4E3",
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: "rgba(145, 196, 227, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.3)",
  },
  addButtonText: {
    color: "#91C4E3",
    fontSize: 14,
    fontWeight: "600",
  },
  commentsList: {
    gap: 8,
  },
  previewCard: {
    backgroundColor: "rgba(7, 12, 20, 0.94)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.1)",
  } as ViewStyle,
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  previewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(145, 196, 227, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  previewAvatarInitial: {
    color: "#91C4E3",
    fontSize: 12,
    fontWeight: "600",
  },
  previewAuthorName: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  previewContent: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  replyBadge: {
    backgroundColor: "rgba(145, 196, 227, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  replyCount: {
    color: "#91C4E3",
    fontSize: 11,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 12,
  },
  seeAllText: {
    color: "#91C4E3",
    fontSize: 14,
    fontWeight: "600",
  },
  seeAllArrow: {
    color: "#91C4E3",
    fontSize: 14,
    marginLeft: 4,
  },
});

export default ActivityCommentsPreview;
