import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { HackathonJellyfishLoader } from "../../components/Hackathon/HackathonJellyfishLoader";
import { Space } from "../../lib/theme";
import {
  getCachedHackathonHomeBundle,
  loadHackathonHomeBundle,
} from "../../lib/hackathonScreenData";
import { getItem } from "../../lib/asyncStorage";
import { readHackathonToken } from "../../lib/hackathon-mode";
import type { TeamImpact } from "../../lib/hackathon-submit";

type MentorPreview = { id: string; full_name: string; photo_url?: string };

const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN = "#91C4E3";
const CYAN_DIM = "rgba(145,196,227,0.3)";
const AMBER = "#F59E0B";

export default function HackathonHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cachedBundle = getCachedHackathonHomeBundle();
  const [impact, setImpact] = useState<TeamImpact | null>(
    cachedBundle?.impact ?? null,
  );
  const [mentorPreviews, setMentorPreviews] = useState<MentorPreview[]>([]);
  const [loading, setLoading] = useState(!cachedBundle);
  const [cancelledBookingReason, setCancelledBookingReason] = useState<string | null>(null);
  const [cancelledBookingId, setCancelledBookingId] = useState<string | null>(null);
  const [cancelNoticeVisible, setCancelNoticeVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const cached = getCachedHackathonHomeBundle();
      if (cached) {
        setImpact(cached.impact);
        setLoading(false);
      } else {
        setLoading(true);
      }

      loadHackathonHomeBundle()
        .then((bundle) => {
          setImpact(bundle.impact);
        })
        .finally(() => {
          setLoading(false);
        });

      fetch("https://www.passionseed.org/api/hackathon/mentor/public")
        .then((r) => r.json())
        .then((d) => setMentorPreviews((d.mentors ?? []).slice(0, 8)))
        .catch(() => {});

      // Check if team's booking was cancelled by mentor → show notice with reason
      readHackathonToken().then(async (token) => {
        if (!token) return;
        try {
          const r = await fetch("https://www.passionseed.org/api/hackathon/student/mentor-quota", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await r.json();
          const b = data?.booking;
          const studentReasons = ["ยกเลิกโดยผู้เข้าร่วม", "รีเซ็ตสิทธิ์โดย Admin"];
          const mentorCancelledAfterConfirm =
            b?.status === "cancelled" &&
            b?.cancellation_reason &&
            !studentReasons.includes(b.cancellation_reason);
          if (mentorCancelledAfterConfirm) {
            // Only show if user hasn't dismissed this specific booking's notice
            const dismissedKey = `mentor_cancel_dismissed_${b.id}`;
            const dismissed = await getItem(dismissedKey);
            if (!dismissed) {
              setCancelledBookingReason(b.cancellation_reason);
              setCancelledBookingId(b.id);
              setCancelNoticeVisible(true);
            }
          } else {
            setCancelNoticeVisible(false);
          }
        } catch {
          // ignore
        }
      });
    }, [])
  );

  if (loading) {
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
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", gap: Space.md },
  loadingText: { color: CYAN, fontSize: 14, fontFamily: "BaiJamjuree_500Medium", letterSpacing: 0.4 },
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

  cancelNotice: {
    backgroundColor: "rgba(248,113,113,0.08)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    borderRadius: 16,
    padding: Space.lg,
    gap: 8,
  },
  cancelNoticeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelNoticeTitle: {
    fontSize: 15,
    color: "#F87171",
  },
  cancelNoticeDismiss: {
    fontSize: 14,
    color: WHITE40,
  },
  cancelNoticeReason: {
    fontSize: 13,
    color: WHITE70,
    lineHeight: 20,
  },
  cancelNoticeRefund: {
    fontSize: 12,
    color: CYAN,
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
