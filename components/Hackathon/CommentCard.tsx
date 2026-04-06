import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ViewStyle,
} from "react-native";
import { CommentWithReplies } from "../../types/hackathon-comments";
import { AppText } from "../AppText";

interface CommentCardProps {
  comment: CommentWithReplies;
  currentParticipantId: string;
  isAdmin?: boolean;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onExpand: () => void;
  isExpanded: boolean;
}

/**
 * Formats a timestamp into a relative time string
 * e.g., "just now", "5 mins ago", "2 hours ago", "1 day ago"
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  }

  if (diffMins < 60) {
    return diffMins === 1 ? "1 min ago" : `${diffMins} mins ago`;
  }

  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  if (diffDays < 30) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  currentParticipantId,
  isAdmin = false,
  onEdit,
  onDelete,
  onExpand,
  isExpanded,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const canEditOrDelete =
    currentParticipantId === comment.participant_id || isAdmin;

  const handleEditPress = useCallback(() => {
    setIsEditing(true);
    setEditContent(comment.content);
  }, [comment.content]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(comment.content);
  }, [comment.content]);

  const handleSaveEdit = useCallback(() => {
    const trimmedContent = editContent.trim();
    if (trimmedContent && trimmedContent !== comment.content) {
      onEdit(comment.id, trimmedContent);
    }
    setIsEditing(false);
  }, [comment.id, comment.content, editContent, onEdit]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(comment.id),
        },
      ]
    );
  }, [comment.id, onDelete]);

  const handleCardPress = useCallback(() => {
    if (!isEditing) {
      onExpand();
    }
  }, [isEditing, onExpand]);

  const replyCount = comment.replies?.length || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleCardPress}
      style={[styles.container, isExpanded && styles.containerExpanded]}
    >
      {/* Header: Avatar, Name, Timestamp */}
      <View style={styles.header}>
        {comment.participant.avatar_url ? (
          <Image
            source={{ uri: comment.participant.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <AppText style={styles.avatarInitial}>
              {comment.participant.display_name.charAt(0).toUpperCase()}
            </AppText>
          </View>
        )}
        <View style={styles.headerInfo}>
          <AppText variant="bold" style={styles.authorName}>
            {comment.participant.display_name}
          </AppText>
          <AppText style={styles.timestamp}>
            {formatRelativeTime(comment.created_at)}
          </AppText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <View style={styles.editInput}>
              <AppText style={styles.editInputText}>{editContent}</AppText>
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.editButton}
              >
                <AppText style={styles.editButtonText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={[styles.editButton, styles.saveButton]}
              >
                <AppText style={[styles.editButtonText, styles.saveButtonText]}>
                  Save
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <AppText style={styles.content}>{comment.content}</AppText>
        )}
      </View>

      {/* Footer: Edited indicator, Reply count, Actions */}
      {!isEditing && (
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {comment.is_edited && (
              <AppText style={styles.editedIndicator}>Edited</AppText>
            )}
            {replyCount > 0 && (
              <TouchableOpacity onPress={onExpand} style={styles.replyBadge}>
                <AppText style={styles.replyCount}>
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </AppText>
              </TouchableOpacity>
            )}
          </View>

          {canEditOrDelete && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleEditPress}
                style={styles.actionButton}
              >
                <AppText style={styles.actionText}>Edit</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeletePress}
                style={styles.actionButton}
              >
                <AppText style={[styles.actionText, styles.deleteText]}>
                  Delete
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(7, 12, 20, 0.94)",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.1)",
  } as ViewStyle,
  containerExpanded: {
    borderColor: "rgba(145, 196, 227, 0.3)",
    shadowColor: "#91C4E3",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(145, 196, 227, 0.2)",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(145, 196, 227, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#91C4E3",
    fontSize: 16,
    fontWeight: "600",
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  timestamp: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  contentContainer: {
    marginBottom: 12,
  },
  content: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  editedIndicator: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    fontStyle: "italic",
  },
  replyBadge: {
    backgroundColor: "rgba(145, 196, 227, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  replyCount: {
    color: "#91C4E3",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    color: "#91C4E3",
    fontSize: 13,
  },
  deleteText: {
    color: "rgba(255, 100, 100, 0.9)",
  },
  editContainer: {
    gap: 12,
  },
  editInput: {
    backgroundColor: "rgba(145, 196, 227, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.3)",
    minHeight: 80,
  },
  editInputText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: "rgba(145, 196, 227, 0.2)",
  },
  saveButtonText: {
    color: "#91C4E3",
  },
});

export default CommentCard;
