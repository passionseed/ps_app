import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText as Text } from "../AppText";
import type { PathStep, StepType } from "../../types/journey";
import { router } from "expo-router";
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
    bgEnd: "#fdfcff",
    border: "rgba(139, 92, 246, 0.15)",
    accent: "#8B5CF6",
    accentLight: "rgba(139, 92, 246, 0.1)",
    shadow: "#000",
  },
  internship: {
    bgStart: "#ffffff",
    bgEnd: "#fcfdff",
    border: "rgba(59, 130, 246, 0.15)",
    accent: "#3B82F6",
    accentLight: "rgba(59, 130, 246, 0.1)",
    shadow: "#000",
  },
  job: {
    bgStart: "#ffffff",
    bgEnd: "#fcfefd",
    border: "rgba(16, 185, 129, 0.15)",
    accent: "#10B981",
    accentLight: "rgba(16, 185, 129, 0.1)",
    shadow: "#000",
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
  const theme = STEP_THEMES[step.type];
  const stepLabel = STEP_LABELS[step.type];

  const isUniversityTappable =
    step.type === "university" && !!step.universityMeta;

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

  const cardContent = (
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
      {isUniversityTappable && (
        <View style={styles.exploreHint}>
          <Text style={styles.exploreHintText}>ดูรายละเอียด →</Text>
        </View>
      )}
    </LinearGradient>
  );

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
            style={[styles.line, { backgroundColor: "#E5E7EB" }]}
          />
        )}
      </View>

      {/* Card content — Pressable for university steps, View otherwise */}
      {isUniversityTappable ? (
        <Pressable
          style={({ pressed }) => [
            styles.cardOuter,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleUniversityPress}
        >
          {cardContent}
        </Pressable>
      ) : (
        <View style={styles.cardOuter}>
          {cardContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    gap: 16,
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
    borderWidth: 1.5,
  },
  dotIcon: {
    fontSize: 16,
  },
  line: {
    width: 1.5,
    flex: 1,
    minHeight: 16,
    borderRadius: 1,
    marginVertical: 4,
  },
  cardOuter: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    backgroundColor: "#fff",
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: "#10B981",
  },
  statusInProgress: {
    backgroundColor: "#F59E0B",
  },
  statusUpcoming: {
    backgroundColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  detailRow: {
    marginBottom: 16,
  },
  cardDetail: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  durationPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  duration: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  exploreHint: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  exploreHintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B5CF6",
  },
});
