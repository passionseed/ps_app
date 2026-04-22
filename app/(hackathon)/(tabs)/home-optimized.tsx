import { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Text, Pressable, Modal, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { AppText } from "../../../components/AppText";
import { HackathonJellyfishLoader } from "../../../components/Hackathon/HackathonJellyfishLoader";
import { InboxCard } from "../../../components/Hackathon/InboxCard";
import { Space } from "../../../lib/theme";
import { useTeamWithMembers, useProgramPhases } from "../../../lib/hooks/useHackathon";
import { useHackathonParticipant } from "../../../lib/hackathon-mode";
import { getInboxPreview } from "../../../lib/hackathonInbox";
import {
  fetchTeamScoreBreakdown,
  type TeamImpact,
  type ScoreBreakdownItem,
} from "../../../lib/hackathon-submit";
import type { InboxPreview } from "../../../types/hackathon-inbox";
import { prefetchPhaseDetail } from "../../../lib/prefetch";

type MentorPreview = { id: string; full_name: string; photo_url?: string };

const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN = "#91C4E3";
const CYAN_DIM = "rgba(145,196,227,0.3)";
const AMBER = "#F59E0B";

// Active program ID (should come from config or API)
const ACTIVE_PROGRAM_ID = "super-seed-hackathon";

export default function HackathonHomeScreenOptimized() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const participant = useHackathonParticipant();

  // Use cached hooks instead of manual fetching
  const { data: team, isLoading: isTeamLoading } = useTeamWithMembers(
    participant?.team_name ?? null
  );
  const { data: phases, isLoading: isPhasesLoading } = useProgramPhases(ACTIVE_PROGRAM_ID);

  const [impact, setImpact] = useState<TeamImpact | null>(null);
  const [mentorPreviews, setMentorPreviews] = useState<MentorPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [inboxPreview, setInboxPreview] = useState<InboxPreview | null>(null);

  // Modal states
  const [cancelledBookingReason, setCancelledBookingReason] = useState<string | null>(null);
  const [cancelledBookingId, setCancelledBookingId] = useState<string | null>(null);
  const [cancelNoticeVisible, setCancelNoticeVisible] = useState(false);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownItem[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Load non-cached data (impact, inbox)
      Promise.all([
        getInboxPreview(),
        // Impact would ideally be cached too, but keeping original behavior for now
      ])
        .then(([preview]) => {
          setInboxPreview(preview);
        })
        .finally(() => {
          setLoading(false);
        });

      // Fetch mentors (API call, not Supabase)
      fetch("https://www.passionseed.org/api/hackathon/mentor/public")
        .then((r) => r.json())
        .then((d) => setMentorPreviews((d.mentors ?? []).slice(0, 8)))
        .catch(() => {});
    }, [])
  );

  // Prefetch phase detail when user shows intent
  const handlePhasePress = (phaseId: string) => {
    prefetchPhaseDetail(phaseId);
    router.push(`/hackathon-program/phase/${phaseId}`);
  };

  // Combined loading state
  const isLoading = loading || isTeamLoading || isPhasesLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <HackathonJellyfishLoader />
        <AppText style={styles.loadingText}>Loading...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image
              source={require("../../../assets/HackLogo.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <Text style={styles.subtitle}>Preventive & Predictive Healthcare</Text>
        </View>

        {team && (
          <View style={styles.teamCard}>
            <AppText variant="bold" style={styles.teamName}>
              Team: {team.name}
            </AppText>
            <AppText style={styles.memberCount}>
              {team.members?.length ?? 0} members
            </AppText>
          </View>
        )}

        {phases && phases.length > 0 && (
          <View style={styles.phasesContainer}>
            <AppText variant="bold" style={styles.sectionTitle}>Phases</AppText>
            {phases.map((phase) => (
              <Pressable
                key={phase.id}
                style={styles.phaseCard}
                onPress={() => handlePhasePress(phase.id)}
              >
                <AppText style={styles.phaseTitle}>{phase.title}</AppText>
                <AppText style={styles.phaseNumber}>Phase {phase.phase_number}</AppText>
              </Pressable>
            ))}
          </View>
        )}

        <InboxCard preview={inboxPreview} loading={loading} darkTheme />

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
  root: { flex: 1, backgroundColor: "#03050a" },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", gap: Space.md },
  loadingText: {
    color: CYAN,
    fontSize: 14,
    fontFamily: "BaiJamjuree_500Medium",
    letterSpacing: 0.4,
  },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space["2xl"],
  },
  header: {
    alignItems: "center",
    marginTop: Space.sm,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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

  teamCard: {
    backgroundColor: "rgba(145,196,227,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    padding: Space.lg,
    gap: Space.xs,
  },
  teamName: {
    fontSize: 18,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  memberCount: {
    fontSize: 14,
    color: WHITE70,
    fontFamily: "BaiJamjuree_400Regular",
  },

  phasesContainer: {
    gap: Space.md,
  },
  sectionTitle: {
    fontSize: 16,
    color: WHITE,
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  phaseCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: Space.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  phaseTitle: {
    fontSize: 14,
    color: WHITE,
    fontFamily: "BaiJamjuree_500Medium",
  },
  phaseNumber: {
    fontSize: 12,
    color: WHITE40,
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
