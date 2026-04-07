import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  TextInput as RNTextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../AppText";
import { Radius, Space } from "../../lib/theme";

const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_GLOW = "rgba(0,240,255,0.08)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE50 = "rgba(255,255,255,0.5)";
const WHITE30 = "rgba(255,255,255,0.3)";
const MAX_CHARS = 500;

interface ReplyInputProps {
  commentId: string;
  replyToAuthor: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  initialValue?: string;
  isEdit?: boolean;
}

export function ReplyInput({
  replyToAuthor,
  onSubmit,
  onCancel,
  initialValue = "",
  isEdit = false,
}: ReplyInputProps) {
  const [content, setContent] = useState(initialValue);
  const inputRef = useRef<RNTextInput>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = content.trim().length === 0;
  const canSubmit = !isEmpty && !isOverLimit;

  useEffect(() => {
    // Auto-focus on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (!canSubmit) return;

    const trimmedContent = content.trim();
    onSubmit(trimmedContent);

    // Clear after submit unless in edit mode
    if (!isEdit) {
      setContent("");
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#01040A", "#030B17"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowLeft} pointerEvents="none" />

      {/* Context Label */}
      <View style={styles.header}>
        <AppText style={styles.replyingToLabel}>
          Replying to{" "}
          <AppText variant="bold" style={styles.authorName}>
            {replyToAuthor}
          </AppText>
        </AppText>
      </View>

      {/* Text Input */}
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Write a reply..."
        placeholderTextColor={WHITE50}
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={MAX_CHARS + 50} // Allow slight overflow for visual feedback
        textAlignVertical="top"
        autoCapitalize="sentences"
      />

      {/* Footer with counter and buttons */}
      <View style={styles.footer}>
        <AppText
          style={[
            styles.charCount,
            isOverLimit && styles.charCountOverLimit,
          ]}
        >
          {charCount}/{MAX_CHARS}
        </AppText>

        <View style={styles.buttonGroup}>
          {(isEdit || onCancel) && (
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <AppText style={styles.cancelButtonText}>Cancel</AppText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <AppText variant="bold" style={styles.submitButtonText}>
              {isEdit ? "Save" : "Submit"}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    padding: Space.md,
    marginLeft: Space.xl, // Indent to match reply cards
    marginRight: Space.lg,
  },
  glowLeft: {
    position: "absolute",
    left: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CYAN_GLOW,
  },
  header: {
    marginBottom: Space.sm,
  },
  replyingToLabel: {
    fontSize: 12,
    color: WHITE75,
  },
  authorName: {
    fontSize: 12,
    color: CYAN,
  },
  input: {
    fontSize: 14,
    color: WHITE,
    lineHeight: 20,
    minHeight: 60,
    maxHeight: 80, // Max 2-3 lines
    paddingVertical: Space.xs,
    fontFamily: "BaiJamjuree_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Space.sm,
  },
  charCount: {
    fontSize: 11,
    color: WHITE50,
  },
  charCountOverLimit: {
    color: "#FF6B6B",
  },
  buttonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  cancelButton: {
    paddingVertical: Space.xs,
    paddingHorizontal: Space.md,
    borderRadius: Radius.sm,
  },
  cancelButtonText: {
    fontSize: 13,
    color: WHITE75,
  },
  submitButton: {
    backgroundColor: CYAN,
    paddingVertical: Space.xs,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.sm,
  },
  submitButtonDisabled: {
    backgroundColor: WHITE30,
  },
  submitButtonText: {
    fontSize: 13,
    color: "#01040A",
  },
});
