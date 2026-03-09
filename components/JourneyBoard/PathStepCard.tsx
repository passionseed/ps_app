import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { PathStep, StepType } from "../../lib/mockPathData";
import { LinearGradient } from "expo-linear-gradient";

const STEP_THEMES: Record<
  StepType,
  { bg: string; border: string; borderBottom: string; accent: string }
> = {
  university: {
    bg: "#1E1B4B", // solid deep color instead of gradient
    border: "rgba(139, 92, 246, 0.3)",
    borderBottom: "rgba(139, 92, 246, 0.6)",
    accent: "#8B5CF6",
  },
  internship: {
    bg: "#102A43",
    border: "rgba(99, 141, 255, 0.3)",
    borderBottom: "rgba(99, 141, 255, 0.6)",
    accent: "#3B82F6",
  },
  job: {
    bg: "#064E3B",
    border: "rgba(52, 211, 153, 0.3)",
    borderBottom: "rgba(52, 211, 153, 0.6)",
    accent: "#10B981",
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
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <Text style={styles.dotIcon}>{step.icon}</Text>
        </View>
        {!isLast && (
          <View
            style={[styles.line, { backgroundColor: theme.accent + "25" }]}
          />
        )}
      </View>

      {/* Card content */}
      <View style={styles.cardOuter}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
              borderBottomColor: theme.borderBottom,
            },
          ]}
        >
          {/* Inner highlight edge */}
          <View style={styles.innerHighlight} />

          {/* Step type badge */}
          <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{stepLabel}</Text>
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
            <Text style={styles.duration}>⏱ {step.duration}</Text>
            <Text style={styles.statusText}>
              {step.status === "completed"
                ? "✓ Done"
                : step.status === "in-progress"
                  ? "● Now"
                  : `Step ${index + 1}`}
            </Text>
          </View>
        </View>
      </View>
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
    width: 36,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dotIcon: {
    fontSize: 16,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    borderRadius: 1,
  },
  cardOuter: {
    flex: 1,
    marginBottom: 8,
    borderRadius: 14,
    // Subtle lift — 2.5d grounded feel
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderBottomWidth: 1.5,
    overflow: "hidden",
    position: "relative",
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)", // softer highlight for solid bg
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Orbit_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.7)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: "#34D399",
  },
  statusInProgress: {
    backgroundColor: "#FCD34D",
  },
  statusUpcoming: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Orbit_400Regular",
    marginBottom: 4,
  },
  detailRow: {
    marginBottom: 8,
  },
  cardDetail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Orbit_400Regular",
    lineHeight: 17,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  duration: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Orbit_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Orbit_400Regular",
  },
});
