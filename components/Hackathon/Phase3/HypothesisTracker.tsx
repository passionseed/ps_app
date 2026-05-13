import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";
import type { Phase3CycleTrackerEntry } from "../../types/hackathon-phase3";

const BG = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const RED = "#FF6B6B";
const GREEN = "#4ECDC4";
const YELLOW = "#FFA500";

interface HypothesisTrackerProps {
  cycles: Phase3CycleTrackerEntry[];
  activeCycleNumber?: number;
  onCyclePress?: (cycleNumber: number) => void;
}

export default function HypothesisTracker({
  cycles,
  activeCycleNumber,
  onCyclePress,
}: HypothesisTrackerProps) {
  return (
    <View style={styles.container}>
      <AppText variant="bold" style={styles.title}>
        Hypothesis Evolution
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cycles.map((cycle, index) => {
          const isActive = cycle.cycleNumber === activeCycleNumber;

          return (
            <Pressable
              key={cycle.cycleNumber}
              style={[
                styles.cycleCard,
                isActive && styles.cycleCardActive,
              ]}
              onPress={() => onCyclePress?.(cycle.cycleNumber)}
            >
              {/* Connector line */}
              {index > 0 && <View style={styles.connector} />}

              {/* Cycle number badge */}
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <AppText
                  variant="bold"
                  style={[styles.badgeText, isActive && styles.badgeTextActive]}
                >
                  {cycle.cycleNumber}
                </AppText>
              </View>

              {/* Hypothesis */}
              <AppText style={styles.hypothesis} numberOfLines={2}>
                {cycle.hypothesis || "No hypothesis"}
              </AppText>

              {/* Result */}
              {cycle.result && (
                <View
                  style={[
                    styles.resultBadge,
                    {
                      borderColor:
                        cycle.result === "confirmed"
                          ? GREEN
                          : cycle.result === "killed"
                          ? RED
                          : YELLOW,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      cycle.result === "confirmed"
                        ? "checkmark-circle"
                        : cycle.result === "killed"
                        ? "close-circle"
                        : "help-circle"
                    }
                    size={12}
                    color={
                      cycle.result === "confirmed"
                        ? GREEN
                        : cycle.result === "killed"
                        ? RED
                        : YELLOW
                    }
                  />
                  <AppText
                    style={[
                      styles.resultText,
                      {
                        color:
                          cycle.result === "confirmed"
                            ? GREEN
                            : cycle.result === "killed"
                            ? RED
                            : YELLOW,
                      },
                    ]}
                  >
                    {cycle.result}
                  </AppText>
                </View>
              )}

              {/* Variable */}
              {cycle.variableChanged && (
                <AppText style={styles.variable} numberOfLines={1}>
                  → {cycle.variableChanged}
                </AppText>
              )}

              {/* Score */}
              {cycle.score !== null && cycle.score !== undefined && (
                <View style={styles.scoreBadge}>
                  <AppText style={styles.scoreText}>{cycle.score}/15</AppText>
                </View>
              )}

              {/* Status indicator for active */}
              {isActive && (
                <View style={styles.activeIndicator}>
                  <AppText style={styles.activeText}>Active</AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: { color: WHITE, fontSize: 16, marginBottom: 12 },
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  cycleCard: {
    width: 200,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    position: "relative",
  },
  cycleCardActive: {
    borderColor: CYAN,
    backgroundColor: CYAN20,
  },
  connector: {
    position: "absolute",
    left: -12,
    top: 30,
    width: 12,
    height: 2,
    backgroundColor: CYAN45,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CYAN20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  badgeActive: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  badgeText: { color: WHITE, fontSize: 12 },
  badgeTextActive: { color: BG },
  hypothesis: { color: WHITE75, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  resultText: { fontSize: 11 },
  variable: { color: WHITE55, fontSize: 11, marginBottom: 6, fontStyle: "italic" },
  scoreBadge: {
    backgroundColor: CYAN20,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  scoreText: { color: CYAN, fontSize: 11 },
  activeIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: CYAN,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeText: { color: BG, fontSize: 10 },
});
