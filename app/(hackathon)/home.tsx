import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Dimensions, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { Space } from "../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { getCurrentHackathonProgramHome } from "../../lib/hackathonProgram";
import type { HackathonProgramPhase } from "../../types/hackathon-program";

const BG = "transparent";
const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN = "#91C4E3";
const CYAN_DIM = "rgba(145,196,227,0.3)";
const AMBER = "#F59E0B";

function getCurrentPhase(phases: HackathonProgramPhase[]): HackathonProgramPhase | null {
  if (phases.length === 0) return null;
  const sorted = [...phases].sort((a, b) => a.phase_number - b.phase_number);
  const now = Date.now();
  // First phase whose due date (or ends_at) is still in the future
  const active = sorted.find((p) => {
    const deadline = p.due_at ?? p.ends_at;
    return deadline ? new Date(deadline).getTime() > now : true;
  });
  // If all are past, return the last one
  return active ?? sorted[sorted.length - 1];
}

export default function HackathonHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0 });
  const [currentPhase, setCurrentPhase] = useState<HackathonProgramPhase | null>(null);
  const [phases, setPhases] = useState<HackathonProgramPhase[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCurrentHackathonProgramHome().then((home) => {
        setPhases(home.phases);
        setCurrentPhase(getCurrentPhase(home.phases));
      }).catch(() => {});
    }, [])
  );

  useEffect(() => {
    const deadline = currentPhase?.due_at ?? currentPhase?.ends_at;
    const target = deadline ? new Date(deadline).getTime() : null;

    const update = () => {
      if (!target) {
        setTimeLeft({ d: 0, h: 0, m: 0 });
        return;
      }
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ d, h, m });
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [currentPhase]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}>
        
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image 
            source={require("../../assets/HackLogo.png")} 
            style={styles.logo} 
            contentFit="contain" 
          />
          <Text style={styles.subtitle}>
            Preventive & Predictive Healthcare
          </Text>
        </View>

        {/* Countdown */}
        {currentPhase && (
          <Pressable
            style={styles.countdownContainer}
            onPress={() => router.push(`/(hackathon)/phase/${currentPhase.id}`)}
          >
            <AppText style={styles.countdownEyebrow}>CURRENT PHASE</AppText>
            <AppText variant="bold" style={styles.countdownTitle}>{currentPhase.title}</AppText>
            {(currentPhase.due_at ?? currentPhase.ends_at) ? (
              <View style={styles.countdownBoxes}>
                <View style={styles.countBox}>
                  <AppText variant="bold" style={styles.countVal}>{timeLeft.d}</AppText>
                  <AppText style={styles.countLabel}>DAYS</AppText>
                </View>
                <View style={styles.countBox}>
                  <AppText variant="bold" style={styles.countVal}>{timeLeft.h.toString().padStart(2, "0")}</AppText>
                  <AppText style={styles.countLabel}>HOURS</AppText>
                </View>
                <View style={styles.countBox}>
                  <AppText variant="bold" style={styles.countVal}>{timeLeft.m.toString().padStart(2, "0")}</AppText>
                  <AppText style={styles.countLabel}>MINS</AppText>
                </View>
              </View>
            ) : (
              <AppText style={styles.countdownNoDue}>No due date set</AppText>
            )}
          </Pressable>
        )}

        {/* Timeline */}
        {phases.length > 0 && (
          <View style={styles.timelineSection}>
            <AppText variant="bold" style={styles.sectionTitle}>Phases</AppText>
            <View style={styles.timelineList}>
              {[...phases]
                .sort((a, b) => a.phase_number - b.phase_number)
                .map((phase, i, arr) => {
                  const isCurrent = currentPhase?.id === phase.id;
                  const deadline = phase.due_at ?? phase.ends_at;
                  const dateStr = deadline
                    ? new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                    : null;
                  return (
                    <Pressable
                      key={phase.id}
                      style={styles.timelineItem}
                      onPress={() => router.push(`/(hackathon)/phase/${phase.id}`)}
                    >
                      <View style={styles.timelineLeft}>
                        <View style={[styles.timelineDot, isCurrent && styles.timelineDotActive]} />
                        {i !== arr.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.timelineRight}>
                        {dateStr && <AppText style={styles.timelineDate}>Due: {dateStr}</AppText>}
                        <AppText variant="bold" style={[styles.timelineItemTitle, isCurrent && { color: WHITE }]}>
                          {String(phase.phase_number).padStart(2, "0")}. {phase.title}
                        </AppText>
                        {phase.description ? (
                          <AppText style={styles.timelineItemDesc}>{phase.description}</AppText>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          </View>
        )}

        {/* Placeholders */}
        <Pressable style={styles.placeholderCard} onPress={() => router.push("/(hackathon)/mentor-booking")}>
          <AppText variant="bold" style={styles.placeholderTitle}>Mentor Booking</AppText>
          <AppText style={styles.placeholderText}>Schedule 1:1 help with technical and business mentors.</AppText>
          <AppText variant="bold" style={styles.placeholderBadgeCyan}>Book Now →</AppText>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space["2xl"],
  },
  header: {
    alignItems: "center",
    marginTop: Space.sm,
  },
  logo: {
    width: 200,
    height: 180,
  },
  subtitle: {
    fontFamily: "ReenieBeanie_400Regular", 
    fontSize: 24, 
    color: WHITE, 
    textAlign: "center", 
    marginTop: -45, 
  },

  countdownContainer: {
    alignItems: "center",
    backgroundColor: "rgba(13,18,25,0.6)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CYAN_DIM,
    padding: Space.xl,
  },
  countdownEyebrow: {
    fontSize: 10,
    color: CYAN,
    letterSpacing: 2,
    marginBottom: Space.xs,
    fontFamily: "BaiJamjuree_500Medium",
  },
  countdownTitle: {
    fontSize: 22,
    color: WHITE,
    marginBottom: Space.lg,
  },
  countdownNoDue: {
    fontSize: 13,
    color: WHITE40,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: Space.xs,
  },
  countdownBoxes: {
    flexDirection: "row",
    gap: Space.md,
  },
  countBox: {
    backgroundColor: "rgba(145,196,227,0.1)",
    borderRadius: 12,
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
  },
  countVal: {
    fontSize: 24,
    color: WHITE,
  },
  countLabel: {
    fontSize: 9,
    color: WHITE70,
    marginTop: 2,
    letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: 20,
    color: WHITE,
    marginBottom: Space.lg,
  },
  timelineSection: {
    marginTop: Space.xs,
  },
  timelineList: {
    paddingLeft: Space.xs,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 80,
  },
  timelineLeft: {
    width: 32,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(145,196,227,0.2)",
    borderWidth: 2,
    borderColor: "rgba(145,196,227,0.4)",
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: CYAN,
    borderColor: "#FFFFFF",
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "rgba(145,196,227,0.15)",
    marginTop: 4,
    marginBottom: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: Space.xl,
    paddingLeft: Space.sm,
    marginTop: -4,
  },
  timelineDate: {
    fontSize: 12,
    color: CYAN,
    marginBottom: 2,
    fontFamily: "BaiJamjuree_500Medium",
  },
  timelineItemTitle: {
    fontSize: 16,
    color: WHITE70,
    marginBottom: 4,
  },
  timelineItemDesc: {
    fontSize: 13,
    color: WHITE40,
    lineHeight: 18,
  },

  placeholderCard: {
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.1)",
    padding: Space.lg,
    gap: Space.xs,
  },
  placeholderTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  placeholderText: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "BaiJamjuree_400Regular" },
  placeholderBadge: { fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: 1.5, marginTop: Space.xs, fontFamily: "BaiJamjuree_700Bold" },
  placeholderBadgeCyan: { fontSize: 10, color: CYAN, textTransform: "uppercase", letterSpacing: 1.5, marginTop: Space.xs, fontFamily: "BaiJamjuree_700Bold" },
});

