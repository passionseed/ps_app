import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { AppText as Text } from "../AppText";
import type { PathStep, StepType } from "../../types/journey";
import { router } from "expo-router";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STEP_THEMES: Record<
  StepType,
  {
    accent: string;
    accentLight: string;
  }
> = {
  university: {
    accent: "#8B5CF6",
    accentLight: "rgba(139, 92, 246, 0.12)",
  },
  internship: {
    accent: "#3B82F6",
    accentLight: "rgba(59, 130, 246, 0.12)",
  },
  job: {
    accent: "#10B981",
    accentLight: "rgba(16, 185, 129, 0.12)",
  },
};

const STATUS_CONFIG: Record<
  PathStep["status"],
  { dotColor: string; label: string }
> = {
  completed: { dotColor: "#10B981", label: "Done" },
  "in-progress": { dotColor: "#F59E0B", label: "Now" },
  upcoming: { dotColor: "#E5E7EB", label: "Soon" },
};

interface PathStepCardProps {
  step: PathStep;
  isLast: boolean;
  index: number;
  pathCareerGoal?: string;
  passionScore?: number | null;
  futureScore?: number | null;
  worldScore?: number | null;
}

export function PathStepCard({
  step,
  isLast,
  index,
  pathCareerGoal,
  passionScore,
  futureScore,
  worldScore,
}: PathStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = STEP_THEMES[step.type];
  const statusConfig = STATUS_CONFIG[step.status];

  const isUniversityTappable =
    step.type === "university" && !!step.universityMeta;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleUniversityPress = () => {
    if (!step.universityMeta) return;
    router.push({
      pathname: `/university/${encodeURIComponent(step.universityMeta.universityName)}`,
      params: {
        facultyName: step.universityMeta.facultyName,
        careerGoal: pathCareerGoal ?? "",
        passionScore: String(passionScore ?? ""),
        futureScore: String(futureScore ?? ""),
        worldScore: String(worldScore ?? ""),
      },
    });
  };

  const handleRowPress = () => {
    if (isUniversityTappable) {
      handleUniversityPress();
    } else {
      toggleExpand();
    }
  };

  return (
    <View style={styles.stepRow}>
      {/* Timeline connector */}
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.dot,
            { backgroundColor: theme.accentLight, borderColor: theme.accent },
          ]}
        >
          <Text style={styles.dotIcon}>{step.icon}</Text>
        </View>
        {!isLast && (
          <View style={[styles.line, { backgroundColor: "#E5E7EB" }]} />
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.rowCard,
          pressed && styles.rowCardPressed,
        ]}
        onPress={handleRowPress}
      >
        <View style={styles.rowMain}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle}>
              {step.title}
            </Text>
          </View>

          <View style={styles.rowRight}>
            {step.duration ? (
              <Text style={styles.rowDuration}>{step.duration}</Text>
            ) : null}

            <View style={styles.statusWrap}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusConfig.dotColor },
                ]}
              />
              <Text style={styles.statusLabel}>{statusConfig.label}</Text>
            </View>

            {!isUniversityTappable && (
              <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
            )}

            {isUniversityTappable && (
              <Text style={styles.universityArrow}>→</Text>
            )}
          </View>
        </View>

        {expanded && !isUniversityTappable && (
          <View style={styles.expandedBody}>
            {step.subtitle ? (
              <Text style={styles.expandedSubtitle}>{step.subtitle}</Text>
            ) : null}
            {step.detail ? (
              <Text style={styles.expandedDetail}>{step.detail}</Text>
            ) : null}
            <Text style={styles.stepNumber}>Step {index + 1}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineColumn: {
    alignItems: "center",
    width: 32,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  dotIcon: {
    fontSize: 14,
  },
  line: {
    width: 1.5,
    flex: 1,
    minHeight: 8,
    borderRadius: 1,
    marginVertical: 2,
  },
  rowCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rowCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  rowMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    minWidth: 0,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  rowDuration: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  chevron: {
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 2,
  },
  universityArrow: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "600",
    marginLeft: 2,
  },
  expandedBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    gap: 4,
  },
  expandedSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  expandedDetail: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 4,
  },
});
