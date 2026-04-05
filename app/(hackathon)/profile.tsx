import { useCallback, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { AppText } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { Space, Radius } from "../../lib/theme";
import { useHackathonParticipant } from "../../lib/hackathon-mode";
import { getCurrentHackathonProgramHome } from "../../lib/hackathonProgram";
import { supabase } from "../../lib/supabase";
import type { HackathonTeam } from "../../types/hackathon-program";

const BG = "transparent";
const CYAN = "#91C4E3";
const CYAN_BORDER = "rgba(145,196,227,0.1)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const AMBER = "#F59E0B";

export default function HackathonProfileScreen() {
  const { signOutHackathon } = useAuth();
  const participant = useHackathonParticipant();
  const insets = useSafeAreaInsets();
  
  const [team, setTeam] = useState<HackathonTeam | null>(null);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadProfileData() {
        if (!participant?.id) {
          setLoading(false);
          return;
        }

        try {
          const [homeData, { data: qData }] = await Promise.all([
            getCurrentHackathonProgramHome(),
            supabase
              .from("hackathon_pre_questionnaires")
              .select("*")
              .eq("participant_id", participant.id)
              .maybeSingle()
          ]);

          if (!cancelled) {
            setTeam(homeData.team);
            setQuestionnaire(qData);
            setLoading(false);
          }
        } catch (err) {
          console.error("[Profile] load error", err);
          if (!cancelled) setLoading(false);
        }
      }

      loadProfileData();
      return () => { cancelled = true; };
    }, [participant?.id])
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl }]}>
        <AppText variant="bold" style={styles.eyebrow}>YOUR PROFILE</AppText>
        <AppText variant="bold" style={styles.title}>{participant?.name ?? "Participant"}</AppText>

        <View style={styles.infoCard}>
          <LinearGradient
            colors={["rgba(20, 28, 41, 0.6)", "rgba(8, 14, 22, 0.8)"]}
            style={StyleSheet.absoluteFill}
          />
          <InfoRow label="EMAIL" value={participant?.email ?? "—"} />
          <View style={styles.divider} />
          <InfoRow label="UNIVERSITY" value={participant?.university ?? "—"} />
          <View style={styles.divider} />
          <InfoRow label="ROLE" value={participant?.role ?? "—"} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={CYAN} />
            <AppText style={styles.loadingText}>Loading profile data...</AppText>
          </View>
        ) : (
          <>
            {team ? (
              <View style={styles.sectionCard}>
                <LinearGradient colors={["rgba(145, 196, 227, 0.05)", "rgba(145, 196, 227, 0.01)"]} style={StyleSheet.absoluteFill} />
                <AppText variant="bold" style={styles.sectionTitle}>Team: {team.team_name || "Unnamed Team"}</AppText>
                <View style={styles.rosterList}>
                  {team.members?.map((member, i) => (
                    <View key={member.participant_id} style={styles.rosterItem}>
                      <View style={styles.rosterDot} />
                      <View style={styles.rosterInfo}>
                        <AppText variant="bold" style={styles.rosterName}>{member.name}</AppText>
                        {(member.university || member.track) && (
                          <AppText style={styles.rosterMeta}>
                            {[member.track, member.university].filter(Boolean).join(" • ")}
                          </AppText>
                        )}
                      </View>
                      {member.participant_id === participant?.id && (
                        <View style={styles.youBadge}><AppText style={styles.youBadgeText}>YOU</AppText></View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <AppText variant="bold" style={styles.placeholderTitle}>Team Roster</AppText>
                <AppText style={styles.placeholderText}>You are not assigned to a team yet.</AppText>
              </View>
            )}

            {questionnaire ? (
              <View style={styles.sectionCard}>
                <LinearGradient colors={["rgba(145, 196, 227, 0.05)", "rgba(145, 196, 227, 0.01)"]} style={StyleSheet.absoluteFill} />
                <AppText variant="bold" style={styles.sectionTitle}>Pre-Hackathon Profile</AppText>
                <View style={styles.qList}>
                  {questionnaire.dream_faculty ? <QItem label="Dream Faculty" value={questionnaire.dream_faculty} /> : null}
                  {questionnaire.team_role_preference ? <QItem label="Preferred Role" value={questionnaire.team_role_preference} /> : null}
                  {questionnaire.ai_proficiency ? <QItem label="AI Proficiency" value={questionnaire.ai_proficiency} /> : null}
                  {questionnaire.why_hackathon ? <QItem label="Goal" value={questionnaire.why_hackathon} /> : null}
                  {questionnaire.loves ? <QItem label="Passions" value={questionnaire.loves} /> : null}
                  {questionnaire.good_at ? <QItem label="Strengths" value={questionnaire.good_at} /> : null}
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <AppText variant="bold" style={styles.placeholderTitle}>Pre-Hackathon Profile</AppText>
                <AppText style={styles.placeholderText}>You haven't filled out your pre-hackathon questionnaire yet.</AppText>
                <Pressable
                  style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => Linking.openURL("https://www.passionseed.org/hackathon/onboarding")}
                >
                  <AppText variant="bold" style={styles.linkBtnText}>Complete Questionnaire</AppText>
                </Pressable>
              </View>
            )}
          </>
        )}

        <View style={styles.placeholderCard}>
          <AppText variant="bold" style={styles.placeholderTitle}>Knowledge Vault</AppText>
          <AppText style={styles.placeholderText}>Your completed activities, generated ideas, and reflections in one place.</AppText>
          <AppText variant="bold" style={styles.placeholderBadge}>Coming Soon</AppText>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.75 }]}
          onPress={() => signOutHackathon()}
        >
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText variant="bold" style={[styles.infoValue, accent && { color: CYAN }]}>{value}</AppText>
    </View>
  );
}

function QItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.qItem}>
      <AppText style={styles.qLabel}>{label}</AppText>
      <AppText style={styles.qValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space.md,
  },
  eyebrow: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  infoCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: Space.lg,
    gap: Space.md,
    marginTop: Space.sm,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "BaiJamjuree_700Bold",
  },
  infoValue: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_500Medium",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  loadingContainer: {
    padding: Space.xl,
    alignItems: "center",
    gap: Space.md,
  },
  loadingText: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_500Medium",
  },
  sectionCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.15)",
    padding: Space.lg,
    gap: Space.md,
    marginTop: Space.sm,
    backgroundColor: "rgba(3, 5, 10, 0.4)",
  },
  sectionTitle: {
    fontSize: 18,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  rosterList: {
    gap: Space.md,
  },
  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  rosterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYAN,
  },
  rosterInfo: {
    flex: 1,
  },
  rosterName: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  rosterMeta: {
    fontSize: 12,
    color: WHITE55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  youBadge: {
    backgroundColor: "rgba(145,196,227,0.15)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 10,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 0.5,
  },
  qList: {
    gap: Space.md,
  },
  qItem: {
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Space.md,
    borderRadius: Radius.md,
  },
  qLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  qValue: {
    fontSize: 14,
    color: WHITE,
    lineHeight: 20,
    fontFamily: "BaiJamjuree_400Regular",
  },
  signOutBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: Space.md,
    alignItems: "center",
    marginTop: Space.lg,
  },
  signOutText: {
    fontSize: 15,
    color: WHITE75,
    fontFamily: "BaiJamjuree_400Regular",
  },
  placeholderCard: {
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.1)",
    padding: Space.lg,
    gap: Space.xs,
    marginTop: Space.sm,
  },
  placeholderTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  placeholderText: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "BaiJamjuree_400Regular" },
  placeholderBadge: { fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: 1.5, marginTop: Space.xs, fontFamily: "BaiJamjuree_700Bold" },
  linkBtn: {
    backgroundColor: "rgba(145,196,227,0.15)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.3)",
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    alignItems: "center",
    marginTop: Space.sm,
    alignSelf: "flex-start",
  },
  linkBtnText: {
    color: CYAN,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
