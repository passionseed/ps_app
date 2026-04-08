import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { ReplyWithParticipant } from "../../types/hackathon-comments";
import { AppText } from "../AppText";
import { getCommentParticipantBadge } from "../../lib/hackathonCommentParticipant";

interface ReplyCardProps {
  reply: ReplyWithParticipant;
  currentParticipantId: string;
  isAdmin?: boolean;
  onEdit: (replyId: string, content: string) => void;
  onDelete: (replyId: string) => void;
}

/**
 * Format a date to relative time (e.g., "1h ago", "2d ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

export const ReplyCard: React.FC<ReplyCardProps> = ({
  reply,
  currentParticipantId,
  isAdmin = false,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const canModify =
    currentParticipantId === reply.participant_id || isAdmin;
  const participantBadge = getCommentParticipantBadge(reply.participant);

  const handleEditPress = () => {
    setIsEditing(true);
    setEditContent(reply.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(reply.content);
  };

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    if (trimmedContent && trimmedContent !== reply.content) {
      onEdit(reply.id, trimmedContent);
    }
    setIsEditing(false);
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Reply",
      "Are you sure you want to delete this reply? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(reply.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header: Avatar, Name, Timestamp */}
      <View style={styles.header}>
        {participantBadge.type === "avatar" ? (
          <Image
            source={{ uri: participantBadge.value }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              participantBadge.type === "emoji" && styles.emojiAvatarPlaceholder,
            ]}
          >
            <AppText
              style={[
                styles.avatarInitial,
                participantBadge.type === "emoji" && styles.emojiAvatarText,
              ]}
            >
              {participantBadge.value}
            </AppText>
          </View>
        )}
        <View style={styles.headerInfo}>
          <AppText style={styles.displayName}>
            {reply.participant.display_name}
          </AppText>
          <AppText style={styles.timestamp}>
            {" "}• {formatRelativeTime(reply.created_at)}
          </AppText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
              placeholder="Edit your reply..."
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
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
                <AppText style={styles.saveButtonText}>Save</AppText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <AppText style={styles.content}>{reply.content}</AppText>
        )}
      </View>

      {/* Footer: Edited indicator and Actions */}
      {!isEditing && (reply.is_edited || canModify) && (
        <View style={styles.footer}>
          {reply.is_edited && (
            <AppText style={styles.editedIndicator}>Edited</AppText>
          )}
          {canModify && (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(7,12,20,0.94)",
    borderRadius: 8,
    padding: 10,
    marginLeft: 36,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#91C4E3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarInitial: {
    fontSize: 12,
    color: "#03050a",
    fontWeight: "600",
  },
  emojiAvatarPlaceholder: {
    backgroundColor: "rgba(145,196,227,0.14)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.22)",
  },
  emojiAvatarText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  displayName: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  contentContainer: {
    marginLeft: 32,
  },
  content: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 32,
    marginTop: 6,
  },
  editedIndicator: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 12,
    color: "#91C4E3",
  },
  deleteText: {
    color: "rgba(255,100,100,0.9)",
  },
  editContainer: {
    marginTop: 4,
  },
  editInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: 10,
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  saveButton: {
    backgroundColor: "#91C4E3",
  },
  saveButtonText: {
    fontSize: 12,
    color: "#03050a",
    fontWeight: "600",
  },
});
