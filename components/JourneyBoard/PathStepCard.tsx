import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText as Text } from "../AppText";
import type { PathStep, StepType } from "../../lib/mockPathData";
import { LinearGradient } from "expo-linear-gradient";

const STEP_THEMES: Record<
  StepType,
  {
    bgStart: string;
    bgEnd: string;
    border: string;
    accent: string;
    accentLight: string;
    shadow: string;
  }
> = {
  university: {
    bgStart: "#ffffff",
    bgEnd: "#fdfcff", // ultra light purple tint
    border: "rgba(139, 92, 246, 0.15)",
    accent: "#8B5CF6",
    accentLight: "rgba(139, 92, 246, 0.08)",
    shadow: "rgba(139, 92, 246, 0.25)",
  },
  internship: {
    bgStart: "#ffffff",
    bgEnd: "#fcfdff", // ultra light blue tint
    border: "rgba(59, 130, 246, 0.15)",
    accent: "#3B82F6",
    accentLight: "rgba(59, 130, 246, 0.08)",
    shadow: "rgba(59, 130, 246, 0.25)",
  },
  job: {
    bgStart: "#ffffff",
    bgEnd: "#fcfefd", // ultra light green tint
    border: "rgba(16, 185, 129, 0.15)",
    accent: "#10B981",
    accentLight: "rgba(16, 185, 129, 0.08)",
    shadow: "rgba(16, 185, 129, 0.25)",
  },
};

const STEP_LABELS: Record<StepType, string> = {
  university: "Education",
  internship: "Experience",
  job: "Destination",
};

interface PathStepCardProps {
  step: PathStep;
  isLast: boolean;
  index: number;
}

export function PathStepCard({ step, isLast, index }: PathStepCardProps) {
  const theme = STEP_THEMES[step.type];
  const stepLabel = STEP_LABELS[step.type];

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
          <View
            style={[styles.line, { backgroundColor: theme.accent + "20" }]}
          />
        )}
      </View>

      {/* Card content */}
      <View style={[styles.cardOuter, { shadowColor: theme.shadow }]}>
        <LinearGradient
          colors={[theme.bgStart, theme.bgEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.card,
            {
              borderColor: theme.border,
            },
          ]}
        >
          {/* Inner highlight edge */}
          <View style={styles.innerHighlight} />

          {/* Step type badge */}
          <View style={styles.cardHeader}>
            <View
              style={[styles.typeBadge, { backgroundColor: theme.accentLight }]}
            >
              <Text style={[styles.typeBadgeText, { color: theme.accent }]}>
                {stepLabel}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                step.status === "completed" && styles.statusCompleted,
                step.status === "in-progress" && styles.statusInProgress,
                step.status === "upcoming" && styles.statusUpcoming,
              ]}
            />
          </View>

          <Text style={styles.cardTitle}>{step.title}</Text>
          <Text style={styles.cardSubtitle}>{step.subtitle}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.cardDetail}>{step.detail}</Text>
          </View>
          <View style={styles.durationRow}>
            <View style={[styles.durationPill, { backgroundColor: "#f3f4f6" }]}>
              <Text style={styles.duration}>⏱ {step.duration}</Text>
            </View>
            <Text style={styles.statusText}>
              {step.status === "completed"
                ? "✓ Done"
                : step.status === "in-progress"
                  ? "● Now"
                  : `Step ${index + 1}`}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    gap: 12, // tighter professional spacing
  },
  timelineColumn: {
    alignItems: "center",
    width: 36,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2, // slightly thicker nice border
  },
  dotIcon: {
    fontSize: 16,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
    borderRadius: 1,
    marginVertical: 4,
  },
  cardOuter: {
    flex: 1,
    marginBottom: 12, // tightened breathing room
    borderRadius: 20, // super crisp rounded corners
    // Innovative glowing shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    borderRadius: 20,
    padding: 14, // refined interior padding
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.7)", // crisp white glass reflection
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: "#10B981", // subtle success
  },
  statusInProgress: {
    backgroundColor: "#F59E0B",
  },
  statusUpcoming: {
    backgroundColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 18, // slightly larger, confident typography
    fontWeight: "800",
    color: "#111827", // bold deep gray
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563", // cool gray
    marginBottom: 8,
  },
  detailRow: {
    marginBottom: 14,
  },
  cardDetail: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18, // professional line-height
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  durationPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  duration: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
