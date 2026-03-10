import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { AppText as Text } from "../AppText";
import { LinearGradient } from "expo-linear-gradient";
import { DonutScore } from "./DonutScore";
import { PathStepCard } from "./PathStepCard";
import type { CareerPath } from "../../lib/mockPathData";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// Get screen width for horizontal paging
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 48;
const SNAP_INTERVAL = CARD_WIDTH + 8;

interface CareerPathCardProps {
  path: CareerPath;
  isActive: boolean; // Retained for compatibility, though we'll render all in ScrollView
  index?: number;
  scrollX?: Animated.Value;
  isLastCard?: boolean;
}

export function CareerPathCard({
  path,
  index = 0,
  scrollX,
  isLastCard = false,
}: CareerPathCardProps) {
  const [showScores, setShowScores] = useState(false);

  const sortedSteps = [...path.steps].sort((a, b) => a.order - b.order);
  const totalSteps = sortedSteps.length;
  const completedSteps = sortedSteps.filter(
    (s) => s.status === "completed",
  ).length;

  const scale = scrollX
    ? scrollX.interpolate({
        inputRange: [
          (index - 1) * SNAP_INTERVAL,
          index * SNAP_INTERVAL,
          (index + 1) * SNAP_INTERVAL,
        ],
        outputRange: [0.95, 1, 0.95],
        extrapolate: "clamp",
      })
    : 1;

  const opacity = scrollX
    ? scrollX.interpolate({
        inputRange: [
          (index - 1) * SNAP_INTERVAL,
          index * SNAP_INTERVAL,
          (index + 1) * SNAP_INTERVAL,
        ],
        outputRange: [0.5, 1, 0.5],
        extrapolate: "clamp",
      })
    : 1;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <LinearGradient
        colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]} // Wow effect: seamless stunning ultra-light tint (White -> Purple tint -> Blue tint)
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardOuter, isLastCard && { marginRight: 0 }]}
      >
        {/* Seamless Header Block (No block separation) */}
        <View style={styles.headerBlock}>
          {/* Top: Career Goal and Score Top Right */}
          <Pressable
            style={styles.headerTopRow}
            onPress={() => setShowScores(!showScores)}
          >
            {/* Left side: Goal & Label */}
            <View style={styles.goalInfo}>
              <Text style={styles.goalIcon}>{path.careerGoalIcon}</Text>
              <View style={styles.goalTextStack}>
                <Text style={styles.goalText}>{path.careerGoal}</Text>
                <View style={styles.labelRow}>
                  <View style={styles.planLabelPill}>
                    <Text style={styles.planLabelText}>{path.label}</Text>
                  </View>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => router.push(`/edit-path/${path.id}`)}
                  >
                    <Ionicons name="pencil" size={12} color="#6B7280" />
                    <Text style={styles.editButtonText}>แก้ไข</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Right side: Score */}
            <View style={styles.scoreTopRight}>
              <View style={styles.journeyValueRow}>
                <Text style={styles.scoreTopRightValue}>
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
              <View style={styles.scoreExpandRow}>
                <Text style={styles.scoreTopRightLabel}>คะแนน</Text>
                <Ionicons
                  name={showScores ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#6B7280"
                />
              </View>
            </View>
          </Pressable>

          {/* Collapsible Details */}
          {showScores && (
            <View style={styles.scoresBody}>
              <View style={styles.scoresRow}>
                <DonutScore
                  score={path.passionScore}
                  label="ความชอบ"
                  icon="🔥"
                  color="#F97316"
                  size={64}
                  strokeWidth={5}
                />
                <DonutScore
                  score={path.futureScore}
                  label="อนาคต"
                  icon="🚀"
                  color="#8B5CF6"
                  size={64}
                  strokeWidth={5}
                />
                <DonutScore
                  score={path.worldScore}
                  label="สอดคล้อง"
                  icon="🌍"
                  color="#10B981"
                  size={64}
                  strokeWidth={5}
                />
              </View>

              {path.journeyScore === null && (
                <View style={styles.lowConfidenceRow}>
                  <Text style={styles.lowConfidenceText}>
                    รอข้อมูลเพิ่มเติมเพื่อคำนวณคะแนนที่แม่นยำ...
                  </Text>
                </View>
              )}

              {path.explanations && (
                <View style={styles.explanationsWrap}>
                  <View style={styles.explainDivider} />

                  <View style={styles.explainItem}>
                    <Text style={styles.explainLabel}>🔥 ความชอบ</Text>
                    <Text style={styles.explainText}>
                      {path.explanations.passion}
                    </Text>
                  </View>

                  <View style={styles.explainItem}>
                    <Text style={styles.explainLabel}>🚀 อนาคต</Text>
                    <Text style={styles.explainText}>
                      {path.explanations.future}
                    </Text>
                  </View>

                  <View style={styles.explainItem}>
                    <Text style={styles.explainLabel}>🌍 โลก</Text>
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
            <Text style={styles.timelineTitle}>เส้นทางของคุณ</Text>
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>
                {completedSteps} / {totalSteps} สำเร็จแล้ว
              </Text>
            </View>
          </View>
          {sortedSteps.map((step, idx) => (
            <PathStepCard
              key={step.id}
              step={step}
              isLast={idx === sortedSteps.length - 1}
              index={idx}
              pathCareerGoal={path.careerGoal}
              passionScore={path.passionScore}
              futureScore={path.futureScore}
              worldScore={path.worldScore}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: CARD_WIDTH, // Match the central synced width
    borderRadius: 32, // significantly more rounded
    padding: 24, // naturally increased padding to support the larger radius smoothly
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    marginRight: 8,
    // Emulated shadow profile
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // Seamless Top Block
  headerBlock: {
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  goalInfo: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    paddingRight: 16,
  },
  goalIcon: {
    fontSize: 32, // slightly larger
    marginTop: 2,
  },
  goalTextStack: {
    flex: 1,
    alignItems: "flex-start",
  },
  goalText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827", // deep slate instead of white
    marginBottom: 4,
  },
  planLabelPill: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
  },
  scoreTopRight: {
    alignItems: "flex-end",
  },
  journeyValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  scoreTopRightValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
  },
  scoreExpandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: -2,
    paddingRight: 2,
  },
  scoreTopRightLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F87171",
  },
  scoresBody: {
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
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
  },
  explainText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
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
  },
});
