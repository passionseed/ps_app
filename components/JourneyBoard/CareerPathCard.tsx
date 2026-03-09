import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DonutScore } from "./DonutScore";
import { PathStepCard } from "./PathStepCard";
import type { CareerPath } from "../../lib/mockPathData";
import { Ionicons } from "@expo/vector-icons";

// Get screen width for horizontal paging
const SCREEN_WIDTH = Dimensions.get("window").width;

interface CareerPathCardProps {
  path: CareerPath;
  isActive: boolean; // Retained for compatibility, though we'll render all in ScrollView
}

export function CareerPathCard({ path }: CareerPathCardProps) {
  const [showScores, setShowScores] = useState(false);

  const sortedSteps = [...path.steps].sort((a, b) => a.order - b.order);
  const totalSteps = sortedSteps.length;
  const completedSteps = sortedSteps.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <View style={styles.cardOuter}>
      {/* Path Header — Career Goal Badge */}
      <View style={styles.header}>
        <View style={styles.goalBadge}>
          <LinearGradient
            colors={["rgb(16, 24, 39)", "rgb(31, 41, 55)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.goalGradient}
          >
            <View style={styles.goalHighlightEdge} />
            <Text style={styles.goalIcon}>{path.careerGoalIcon}</Text>
            <Text style={styles.goalText}>{path.careerGoal}</Text>
            {/* Pill label for Plan A/B/C */}
            <View style={styles.planLabelPill}>
              <Text style={styles.planLabelText}>{path.label}</Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Collapsible Combined Scores Section */}
      <View style={styles.scoresOuter}>
        <Pressable
          style={styles.scoresHeader}
          onPress={() => setShowScores(!showScores)}
        >
          <View style={styles.scoresHeaderLeft}>
            <Text style={styles.journeyLabel}>Journey Score</Text>
            <View style={styles.journeyValueRow}>
              <Text style={styles.journeyValue}>
                {path.journeyScore ?? "—"}
              </Text>
              {path.confidence !== "low" && (
                <View
                  style={[
                    styles.confidenceDot,
                    path.confidence === "high" && {
                      backgroundColor: "#10B981",
                    },
                    path.confidence === "medium" && {
                      backgroundColor: "#FBBF24",
                    },
                  ]}
                />
              )}
            </View>
          </View>

          <View style={styles.scoresHeaderRight}>
            <Text style={styles.expandText}>
              {showScores ? "Less details" : "See why"}
            </Text>
            <Ionicons
              name={showScores ? "chevron-up" : "chevron-down"}
              size={16}
              color="#6B7280"
            />
          </View>
        </Pressable>

        {showScores && (
          <View style={styles.scoresBody}>
            <View style={styles.scoresRow}>
              <DonutScore
                score={path.passionScore}
                label="Passion"
                icon="🔥"
                color="#F97316"
                size={64}
                strokeWidth={5}
              />
              <DonutScore
                score={path.futureScore}
                label="Future"
                icon="🚀"
                color="#8B5CF6"
                size={64}
                strokeWidth={5}
              />
              <DonutScore
                score={path.worldScore}
                label="World"
                icon="🌍"
                color="#10B981"
                size={64}
                strokeWidth={5}
              />
            </View>

            {path.journeyScore === null && (
              <View style={styles.lowConfidenceRow}>
                <Text style={styles.lowConfidenceText}>
                  Need more data to calculate a reliable score…
                </Text>
              </View>
            )}

            {path.explanations && (
              <View style={styles.explanationsWrap}>
                <View style={styles.explainDivider} />

                <View style={styles.explainItem}>
                  <Text style={styles.explainLabel}>🔥 Passion</Text>
                  <Text style={styles.explainText}>
                    {path.explanations.passion}
                  </Text>
                </View>

                <View style={styles.explainItem}>
                  <Text style={styles.explainLabel}>🚀 Future</Text>
                  <Text style={styles.explainText}>
                    {path.explanations.future}
                  </Text>
                </View>

                <View style={styles.explainItem}>
                  <Text style={styles.explainLabel}>🌍 World</Text>
                  <Text style={styles.explainText}>
                    {path.explanations.world}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Timeline Steps */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Your Roadmap</Text>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              {completedSteps} / {totalSteps} completed
            </Text>
          </View>
        </View>
        {sortedSteps.map((step, idx) => (
          <PathStepCard
            key={step.id}
            step={step}
            isLast={idx === sortedSteps.length - 1}
            index={idx}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: SCREEN_WIDTH - 48, // leaving 24px padding on each side for the scroller
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
    borderBottomColor: "rgba(0,0,0,0.1)",
    marginRight: 16,
    // Premium 2.5D solid feel
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  // Header
  header: {
    marginBottom: 16,
  },
  goalBadge: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  goalGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderBottomColor: "rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
    position: "relative",
  },
  goalHighlightEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  goalIcon: {
    fontSize: 20,
  },
  goalText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    flex: 1,
  },
  planLabelPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Orbit_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Collapsible Scores
  scoresOuter: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 1.5,
    borderColor: "rgba(0,0,0,0.05)",
    borderBottomColor: "rgba(0,0,0,0.08)",
    marginBottom: 24,
    overflow: "hidden",
  },
  scoresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  scoresHeaderLeft: {
    flexDirection: "column",
  },
  journeyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    fontFamily: "Orbit_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  journeyValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  journeyValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    fontFamily: "Orbit_400Regular",
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  scoresHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    fontFamily: "Orbit_400Regular",
  },
  scoresBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    paddingTop: 16,
  },
  scoresRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  lowConfidenceRow: {
    marginTop: 12,
    alignItems: "center",
  },
  lowConfidenceText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#9CA3AF",
    fontFamily: "Orbit_400Regular",
  },
  explanationsWrap: {
    marginTop: 16,
    gap: 12,
  },
  explainDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginBottom: 4,
  },
  explainItem: {
    gap: 4,
  },
  explainLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    fontFamily: "Orbit_400Regular",
  },
  explainText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    fontFamily: "Orbit_400Regular",
  },

  // Timeline
  timelineContainer: {
    gap: 12,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    fontFamily: "Orbit_400Regular",
  },
  progressPill: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    fontFamily: "Orbit_400Regular",
  },
});
