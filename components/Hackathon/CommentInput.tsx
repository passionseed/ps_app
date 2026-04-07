import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  TextInput as RNTextInput,
} from "react-native";
import { AppText } from "../AppText";
import { Space, Radius } from "../../lib/theme";

const CYAN = "#91C4E3";
const WHITE = "#FFFFFF";
const WHITE_50 = "rgba(255,255,255,0.5)";
const WHITE_60 = "rgba(255,255,255,0.6)";
const RED = "#EF4444";
const INPUT_BG = "rgba(7,12,20,0.94)";
const INPUT_BG_ALT = "#03050a";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  initialValue?: string;
  isEdit?: boolean;
  placeholder?: string;
}

const MAX_CHARS = 500;

export function CommentInput({
  onSubmit,
  onCancel,
  initialValue = "",
  isEdit = false,
  placeholder = "Add a comment...",
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const inputRef = useRef<RNTextInput>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = content.trim().length === 0;
  const isSubmitDisabled = isEmpty || isOverLimit;

  // Show counter when approaching limit (within 50 chars)
  const showCounter = charCount >= 450;

  useEffect(() => {
    // Auto-focus on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (isSubmitDisabled) return;

    const trimmedContent = content.trim();
    onSubmit(trimmedContent);

    // Clear input after submit unless in edit mode
    if (!isEdit) {
      setContent("");
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder={placeholder}
        placeholderTextColor={WHITE_50}
        multiline
        maxLength={MAX_CHARS + 50} // Allow typing over limit to show validation
        numberOfLines={4}
        textAlignVertical="top"
      />

      <View style={styles.footer}>
        <View style={styles.counterContainer}>
          {showCounter && (
            <AppText
              style={[
                styles.counter,
                isOverLimit && styles.counterOverLimit,
              ]}
            >
              {charCount}/{MAX_CHARS}
            </AppText>
          )}
        </View>

        <View style={styles.buttons}>
          {isEdit && onCancel && (
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
            disabled={isSubmitDisabled}
            style={[
              styles.submitButton,
              isSubmitDisabled && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <AppText style={styles.submitButtonText}>Submit</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: INPUT_BG,
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "transparent",
  },
  input: {
    backgroundColor: INPUT_BG_ALT,
    color: WHITE,
    fontSize: 16,
    lineHeight: 22,
    padding: Space.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    minHeight: 80,
    maxHeight: 120,
    fontFamily: "BaiJamjuree_400Regular",
  },
  inputFocused: {
    borderColor: CYAN,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Space.md,
  },
  counterContainer: {
    flex: 1,
  },
  counter: {
    fontSize: 12,
    color: WHITE_60,
  },
  counterOverLimit: {
    color: RED,
  },
  buttons: {
    flexDirection: "row",
    gap: Space.sm,
  },
  cancelButton: {
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
  },
  cancelButtonText: {
    color: CYAN,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: CYAN,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "600",
  },
});
