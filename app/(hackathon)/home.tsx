import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { Space } from "../../lib/theme";
import { getCurrentHackathonProgramHome } from "../../lib/hackathonProgram";
import { fetchTeamImpact, type TeamImpact } from "../../lib/hackathon-submit";
import type { HackathonProgramPhase } from "../../types/hackathon-program";

type MentorPreview = { id: string; full_name: string; photo_url?: string };

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
  const [impact, setImpact] = useState<TeamImpact | null>(null);
  const [mentorPreviews, setMentorPreviews] = useState<MentorPreview[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCurrentHackathonProgramHome().then(async (home) => {
        setCurrentPhase(getCurrentPhase(home.phases));
        const teamId = home.team?.id;
        if (teamId) {
          fetchTeamImpact(teamId).then(setImpact).catch(() => {});
        }
      }).catch(() => {});
      fetch("https://www.passionseed.org/api/hackathon/mentor/public")
        .then((r) => r.json())
        .then((d) => setMentorPreviews((d.mentors ?? []).slice(0, 8)))
        .catch(() => {});
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
            <AppText style={styles.countdownCta}>Continue Journey →</AppText>
          </Pressable>
        )}

        {/* Team Impact */}
        <View style={styles.impactContainer}>
          <AppText variant="bold" style={styles.impactTitle}>YOUR TEAM IMPACT</AppText>
          <View style={styles.impactGrid}>
            <View style={styles.impactBox}>
              <AppText variant="bold" style={[styles.impactVal, { color: CYAN }]}>
                {impact?.rank != null ? `#${impact.rank}` : '—'}
              </AppText>
              <AppText style={styles.impactLabel}>TEAM{'\n'}RANK</AppText>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.impactBox}>
              <AppText variant="bold" style={styles.impactVal}>
                {impact?.activitiesCompleted ?? '—'}
              </AppText>
              <AppText style={styles.impactLabel}>ACTIVITIES{'\n'}COMPLETED</AppText>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.impactBox}>
              <AppText variant="bold" style={styles.impactVal}>
                {impact?.score ?? '—'}
              </AppText>
              <AppText style={styles.impactLabel}>SCORE{'\n'}EARNED</AppText>
            </View>
          </View>
        </View>

        {/* Placeholders */}
        <Pressable style={styles.placeholderCard} onPress={() => router.push("/(hackathon)/mentor-booking")}>
          <AppText variant="bold" style={styles.placeholderTitle}>Mentor Booking</AppText>
          {mentorPreviews.length > 0 && (
            <View style={styles.mentorAvatarRow}>
              {mentorPreviews.slice(0, 5).map((m, i) => (
                <View key={m.id} style={[styles.mentorAvatarWrap, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                  {m.photo_url ? (
                    <Image source={{ uri: m.photo_url }} style={styles.mentorAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.mentorAvatar, styles.mentorAvatarFallback]}>
                      <AppText style={styles.mentorAvatarInitial}>{m.full_name.charAt(0).toUpperCase()}</AppText>
                    </View>
                  )}
                </View>
              ))}
              {mentorPreviews.length > 5 && (
                <View style={[styles.mentorAvatarWrap, styles.mentorAvatarMore, { marginLeft: -10 }]}>
                  <AppText style={styles.mentorAvatarMoreText}>+{mentorPreviews.length - 5}</AppText>
                </View>
              )}
            </View>
          )}
          <AppText variant="bold" style={styles.placeholderBadgeCyan}>Book Now →</AppText>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
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
  countdownCta: {
    fontSize: 11,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: Space.xl,
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

  impactContainer: {
    gap: Space.md,
  },
  impactTitle: {
    fontSize: 10,
    color: CYAN,
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  impactGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  impactBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  impactVal: {
    fontSize: 28,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  impactLabel: {
    fontSize: 10,
    color: WHITE40,
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: "BaiJamjuree_500Medium",
  },
  impactDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  impactHighlight: {
    backgroundColor: "rgba(145,196,227,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    paddingVertical: Space.sm,
  },
  impactHighlightVal: {
    fontSize: 20,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  impactHighlightLabel: {
    fontSize: 10,
    color: WHITE70,
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: "BaiJamjuree_500Medium",
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
  mentorAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 2,
  },
  mentorAvatarWrap: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(13,18,25,0.9)",
  },
  mentorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  mentorAvatarFallback: {
    backgroundColor: CYAN_DIM,
    alignItems: "center",
    justifyContent: "center",
  },
  mentorAvatarInitial: {
    fontSize: 13,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  mentorAvatarMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(145,196,227,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  mentorAvatarMoreText: {
    fontSize: 10,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
});

