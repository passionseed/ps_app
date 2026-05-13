import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";
import type { AICoachResponse, AICoachFlag } from "../../types/hackathon-phase3";

const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const RED = "#FF6B6B";
const YELLOW = "#FFA500";

interface AICoachProps {
  feedback: AICoachResponse | null;
  onFlagPress?: (flag: AICoachFlag) => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export default function AICoach({
  feedback,
  onFlagPress,
  onDismiss,
  compact = false,
}: AICoachProps) {
  if (!feedback) return null;

  const blockingCount = feedback.flags.filter(
    (f: any) => f.severity === "blocking"
  ).length;
  const warningCount = feedback.flags.filter(
    (f: any) => f.severity === "warning"
  ).length;
  const infoCount = feedback.flags.filter((f: any) => f.severity === "info").length;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={compact ? 14 : 16} color={CYAN} />
          <AppText
            variant="bold"
            style={[styles.title, compact && styles.titleCompact]}
          >
            AI Coach
          </AppText>
        </View>
        <View style={styles.headerRight}>
          {blockingCount > 0 && (
            <View style={[styles.badge, styles.badgeBlocking]}>
              <AppText style={styles.badgeText}>{blockingCount}</AppText>
            </View>
          )}
          {warningCount > 0 && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <AppText style={styles.badgeText}>{warningCount}</AppText>
            </View>
          )}
          {infoCount > 0 && (
            <View style={[styles.badge, styles.badgeInfo]}>
              <AppText style={styles.badgeText}>{infoCount}</AppText>
            </View>
          )}
          {onDismiss && (
            <Pressable onPress={onDismiss} style={styles.dismissButton}>
              <Ionicons name="close" size={16} color={WHITE55} />
            </Pressable>
          )}
        </View>
      </View>

      {feedback.flags.length > 0 && (
        <View style={styles.flagsContainer}>
            {feedback.flags.map((flag: any, i: number) => (
            <Pressable
              key={i}
              style={[
                styles.flagRow,
                flag.severity === "blocking" && styles.flagBlocking,
                flag.severity === "warning" && styles.flagWarning,
                flag.severity === "info" && styles.flagInfo,
              ]}
              onPress={() => onFlagPress?.(flag)}
            >
              <Ionicons
                name={
                  flag.severity === "blocking"
                    ? "close-circle"
                    : flag.severity === "warning"
                    ? "warning"
                    : "information-circle"
                }
                size={16}
                color={
                  flag.severity === "blocking"
                    ? RED
                    : flag.severity === "warning"
                    ? YELLOW
                    : CYAN
                }
              />
              <View style={styles.flagContent}>
                <AppText style={styles.flagMessage}>{flag.message}</AppText>
                {flag.suggestion && (
                  <AppText style={styles.flagSuggestion}>
                    {flag.suggestion}
                  </AppText>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {feedback.response && (
        <View style={styles.responseContainer}>
          <AppText style={styles.responseText}>{feedback.response}</AppText>
        </View>
      )}

      {feedback.linked_module && (
        <View style={styles.moduleLink}>
          <Ionicons name="book" size={14} color={CYAN} />
          <AppText style={styles.moduleLinkText}>
            Related: {feedback.linked_module}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  containerCompact: {
    padding: 10,
    borderRadius: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: { color: CYAN, fontSize: 14 },
  titleCompact: { fontSize: 12 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeBlocking: { backgroundColor: "rgba(255,107,107,0.2)" },
  badgeWarning: { backgroundColor: "rgba(255,165,0,0.2)" },
  badgeInfo: { backgroundColor: CYAN20 },
  badgeText: { color: WHITE, fontSize: 11, fontWeight: "600" },
  dismissButton: {
    padding: 4,
  },
  flagsContainer: {
    gap: 6,
    marginBottom: 10,
  },
  flagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  flagBlocking: {
    backgroundColor: "rgba(255,107,107,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.2)",
  },
  flagWarning: {
    backgroundColor: "rgba(255,165,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.2)",
  },
  flagInfo: {
    backgroundColor: "rgba(145,196,227,0.08)",
    borderWidth: 1,
    borderColor: CYAN20,
  },
  flagContent: {
    flex: 1,
    gap: 4,
  },
  flagMessage: { color: WHITE75, fontSize: 13, lineHeight: 18 },
  flagSuggestion: {
    color: WHITE55,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
  },
  responseContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  responseText: {
    color: WHITE75,
    fontSize: 13,
    lineHeight: 20,
  },
  moduleLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  moduleLinkText: { color: CYAN, fontSize: 12 },
});
