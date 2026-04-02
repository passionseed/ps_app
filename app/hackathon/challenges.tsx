import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../../components/AppText";
import { SkiaBackButton } from "../../components/navigation/SkiaBackButton";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
} from "../../lib/hackathonProgram";
import {
  getEnrollmentSelectedChallenge,
  getHackathonTracksWithChallenges,
  updateSelectedHackathonChallenge,
} from "../../lib/hackathonChallenges";
import { Radius, Space } from "../../lib/theme";
import type {
  HackathonChallenge,
  HackathonTeamProgramEnrollment,
  HackathonTrack,
} from "../../types/hackathon-program";

// Try enabling LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG = "#010814";
const CYAN = "#91C4E3";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";
const GREEN = "#10B981";

function ScoreRow({
  label,
  score,
  color,
}: {
  label: string;
  score: number | null;
  color: string;
}) {
  const value = score || 0;
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreHeader}>
        <AppText style={styles.scoreLabel}>{label}</AppText>
        <AppText variant="bold" style={[styles.scoreValue, { color }]}>
          {value}
        </AppText>
      </View>
      <View style={styles.scoreTrack}>
        <View
          style={[
            styles.scoreFill,
            { width: `${value * 10}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

export default function HackathonChallengesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<HackathonTrack[]>([]);
  const [enrollment, setEnrollment] = useState<HackathonTeamProgramEnrollment | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const home = await getCurrentHackathonProgramHome();
      const isEmpty =
        JSON.stringify(home) === JSON.stringify(getEmptyHackathonProgramHome());

      const trackRows = await getHackathonTracksWithChallenges();
      setTracks(trackRows);

      if (isEmpty || !home.enrollment) {
        setEnrollment(null);
      } else {
        const enrollmentRow = await getEnrollmentSelectedChallenge(home.enrollment.id);
        setEnrollment(enrollmentRow ?? home.enrollment);
      }
    } catch (error) {
      console.error("[Challenges] Load error:", error);
      // Even if home fails, try to get tracks directly
      try {
        const trackRows = await getHackathonTracksWithChallenges();
        setTracks(trackRows);
      } catch (innerError) {
        Alert.alert(
          "Unable to load challenges",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSelect(challenge: HackathonChallenge) {
    if (!enrollment) {
      Alert.alert(
        "Sign in required",
        "Sign in with your participant account to select a challenge for your team.",
        [
          { text: "Later", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/hackathon-login") }
        ]
      );
      return;
    }

    setSavingId(challenge.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateSelectedHackathonChallenge({
        enrollmentId: enrollment.id,
        challengeId: challenge.id,
      });
      const latest = await getEnrollmentSelectedChallenge(enrollment.id);
      setEnrollment(latest ?? enrollment);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert(
        "Unable to save challenge",
        error instanceof Error ? error.message : "Please try again.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingId(null);
    }
  }

  function toggleExpand(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) {
      Haptics.selectionAsync();
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topActions, { top: insets.top + Space.xs }]}>
        <SkiaBackButton
          variant="dark"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        />
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={CYAN}
          />
        }
      >
        <View style={styles.header}>
          <AppText variant="bold" style={styles.eyebrow}>
            THE NEXT DECADE HACKATHON 2026
          </AppText>
          <AppText variant="bold" style={styles.title}>
            Challenge Brief
          </AppText>
          <AppText style={styles.subtitle}>
            9 real problems. 3 tracks. One shot to build something that actually changes lives. Pick one challenge for your team.
          </AppText>
        </View>

        {tracks.map((track, i) => {
          const numStr = `0${i + 1}`;
          const trackColor = track.color || CYAN;
          
          return (
            <View key={track.id} style={styles.section}>
              <View style={styles.trackHeader}>
                <AppText variant="bold" style={[styles.trackNum, { color: `${trackColor}50` }]}>
                  {numStr}
                </AppText>
                <View>
                  <AppText variant="bold" style={[styles.trackTitle, { color: trackColor }]}>
                    {track.title}
                  </AppText>
                  {track.subtitle ? (
                    <AppText style={styles.trackSubtitle}>{track.subtitle}</AppText>
                  ) : null}
                </View>
              </View>

              {(track.hackathon_challenges ?? []).map((challenge) => {
                const selected = enrollment?.selected_challenge_id === challenge.id;
                const saving = savingId === challenge.id;
                const expanded = expandedId === challenge.id;

                return (
                  <View
                    key={challenge.id}
                    style={[
                      styles.challengeCard,
                      expanded && { backgroundColor: `${trackColor}15`, borderColor: `${trackColor}40` },
                      selected && { borderColor: GREEN, backgroundColor: `${GREEN}15` },
                    ]}
                  >
                    <Pressable
                      onPress={() => toggleExpand(challenge.id)}
                      style={styles.cardPressable}
                    >
                      <View style={styles.cardHeaderRow}>
                        <AppText variant="bold" style={[styles.challengeNum, { color: `${trackColor}80` }]}>
                          {challenge.num}
                        </AppText>
                        <View style={{ flex: 1, paddingRight: Space.md }}>
                          <AppText variant="bold" style={[styles.challengeTitle, expanded && { color: trackColor }]}>
                            {challenge.title_en}
                          </AppText>
                          {challenge.title_th ? (
                            <AppText style={styles.challengeThai}>{challenge.title_th}</AppText>
                          ) : null}
                        </View>
                        <AppText style={[styles.chevron, expanded && { transform: [{ rotate: "180deg" }] }]}>
                          ↓
                        </AppText>
                      </View>
                    </Pressable>

                    {expanded && (
                      <View style={styles.cardExpanded}>
                        <View style={styles.divider} />
                        
                        {(challenge.hook_en || challenge.hook_th) && (
                          <View style={[styles.hookContainer, { borderColor: trackColor, backgroundColor: `${trackColor}10` }]}>
                            <AppText style={[styles.sectionLabel, { color: trackColor }]}>CONTEXT</AppText>
                            {challenge.hook_en && <AppText style={styles.hookText}>{challenge.hook_en}</AppText>}
                            {challenge.hook_th && <AppText style={[styles.hookText, { marginTop: 4, opacity: 0.7 }]}>{challenge.hook_th}</AppText>}
                          </View>
                        )}

                        <View style={styles.challengeStatement}>
                          <AppText style={[styles.sectionLabel, { color: trackColor }]}>THE CHALLENGE</AppText>
                          <AppText style={styles.statementText}>{challenge.challenge_en}</AppText>
                          {challenge.challenge_th && <AppText style={[styles.statementText, { marginTop: 6, opacity: 0.7 }]}>{challenge.challenge_th}</AppText>}
                        </View>

                        {(challenge.tags && challenge.tags.length > 0) && (
                          <View style={styles.tagRow}>
                            {challenge.tags.map((tag) => (
                              <View key={tag} style={[styles.tagPill, { borderColor: `${trackColor}40`, backgroundColor: `${trackColor}10` }]}>
                                <AppText style={[styles.tagText, { color: trackColor }]}>{tag}</AppText>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.lowerGrid}>
                          <View style={[styles.tangibleBox, { borderColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(255,255,255,0.03)" }]}>
                            <AppText style={[styles.sectionLabel, { color: trackColor }]}>REAL-WORLD IMPACT</AppText>
                            <AppText style={styles.tangibleText}>"{challenge.tangible_equivalent_en}"</AppText>
                            {challenge.tangible_equivalent_th && <AppText style={[styles.tangibleText, { marginTop: 4, opacity: 0.7 }]}>"{challenge.tangible_equivalent_th}"</AppText>}
                          </View>

                          <View style={[styles.scoresBox, { borderColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(255,255,255,0.03)" }]}>
                            <ScoreRow label="SEV" score={challenge.severity} color={trackColor} />
                            <ScoreRow label="DIFF" score={challenge.difficulty} color={trackColor} />
                            <ScoreRow label="IMP" score={challenge.impact} color={trackColor} />
                            <ScoreRow label="URG" score={challenge.urgency} color={trackColor} />
                          </View>
                        </View>

                        <View style={styles.actionRow}>
                          <Pressable
                            disabled={saving}
                            style={[
                              styles.selectButton,
                              { borderColor: selected ? GREEN : trackColor },
                              selected && { backgroundColor: `${GREEN}22` },
                              !selected && { backgroundColor: `${trackColor}15` }
                            ]}
                            onPress={() => handleSelect(challenge)}
                          >
                            {saving ? (
                              <ActivityIndicator size="small" color={selected ? GREEN : trackColor} />
                            ) : (
                              <AppText variant="bold" style={[styles.selectButtonText, { color: selected ? GREEN : trackColor }]}>
                                {selected 
                                  ? "✓  Selected for your team" 
                                  : enrollment 
                                    ? "Select this Challenge" 
                                    : "View Challenge"}
                              </AppText>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topActions: { position: "absolute", left: Space.xl, zIndex: 10 },
  content: { padding: Space.xl, paddingBottom: 120, gap: Space["3xl"] },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 32, lineHeight: 38, color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22, color: WHITE75 },
  
  section: { gap: Space.md },
  trackHeader: { flexDirection: "row", alignItems: "center", gap: Space.md, marginBottom: Space.sm },
  trackNum: { fontSize: 44, includeFontPadding: false },
  trackTitle: { fontSize: 22, color: WHITE },
  trackSubtitle: { fontSize: 13, color: WHITE75 },
  
  challengeCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  cardPressable: { padding: Space.lg },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: Space.md },
  challengeNum: { fontSize: 14, fontFamily: "monospace", width: 24 },
  challengeTitle: { fontSize: 16, color: WHITE },
  challengeThai: { fontSize: 13, color: WHITE40, marginTop: 2 },
  chevron: { fontSize: 14, color: WHITE40, fontWeight: "bold" },
  
  cardExpanded: { paddingHorizontal: Space.lg, paddingBottom: Space.lg },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginBottom: Space.lg },
  
  sectionLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: Space.sm },
  
  hookContainer: {
    padding: Space.md,
    borderRadius: Radius.md,
    borderLeftWidth: 2,
    marginBottom: Space.lg,
  },
  hookText: { fontSize: 14, color: WHITE75, lineHeight: 20 },
  
  challengeStatement: { marginBottom: Space.lg },
  statementText: { fontSize: 15, color: WHITE, lineHeight: 22, fontWeight: "500" },
  
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, marginBottom: Space.lg },
  tagPill: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, letterSpacing: 0.5 },
  
  lowerGrid: { gap: Space.md, marginBottom: Space.xl },
  tangibleBox: {
    padding: Space.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  tangibleText: { fontSize: 14, color: WHITE, fontWeight: "500", fontStyle: "italic" },
  
  scoresBox: {
    padding: Space.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Space.sm,
  },
  scoreRow: { gap: 4 },
  scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreLabel: { fontSize: 10, color: WHITE40, textTransform: "uppercase" },
  scoreValue: { fontSize: 11 },
  scoreTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: Radius.full, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: Radius.full },
  
  actionRow: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: Space.lg, alignItems: "center" },
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: Space["2xl"],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  selectButtonText: { fontSize: 14, textTransform: "uppercase", letterSpacing: 1 },
});
