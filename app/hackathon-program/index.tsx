import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { GlassCard } from "../../components/Glass/GlassCard";
import { GlassButton } from "../../components/Glass/GlassButton";
import {
  getCurrentHackathonProgramHome,
  getChallengeSummary,
  getEmptyHackathonProgramHome,
} from "../../lib/hackathonProgram";
import { getInboxPreview } from "../../lib/hackathonInbox";
import { useHackathonPushNotifications } from "../../lib/hooks/useHackathonPushNotifications";
import { Accent, PageBg, Space, Text as ThemeText, Radius, Type } from "../../lib/theme";
import type { HackathonProgramHome } from "../../types/hackathon-program";
import type { InboxPreview } from "../../types/hackathon-inbox";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InboxCard } from "../../components/Hackathon/InboxCard";

// --- Subcomponents for Polish ---

function Badge({ label, color, bgColor }: { label: string, color: string, bgColor: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <AppText variant="bold" style={[styles.badgeText, { color }]}>
        {label}
      </AppText>
    </View>
  );
}

// --------------------------------

export default function HackathonProgramHomeScreen() {
  const [data, setData] = useState<HackathonProgramHome | null>(null);
  const [inboxPreview, setInboxPreview] = useState<InboxPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useHackathonPushNotifications();

  const load = useCallback(async () => {
    try {
      const [home, preview] = await Promise.all([
        getCurrentHackathonProgramHome(),
        getInboxPreview(),
      ]);

      setData(home);
      setInboxPreview(preview);
    } catch {
      setData(getEmptyHackathonProgramHome());
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

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  if (!data.program || data.phases.length === 0) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={styles.subtitle}>
          No live hackathon program is available for this account yet.
        </AppText>
      </View>
    );
  }

  const currentPhase =
    data.phases.find((phase) => phase.id === data.enrollment?.current_phase_id) ??
    data.phases[0]!;
  const selectedChallenge = getChallengeSummary(data.enrollment);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#F8F9FA", "#F3E8FF"]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Accent.purple}
          />
        }
      >
        <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>
          {data.program?.title ?? "Super Seed Hackathon"}
        </AppText>
        <AppText variant="bold" style={styles.title}>
          Your Hackathon Journey
        </AppText>
        <AppText style={styles.subtitle}>
          Track your progress, access team checkpoints, and complete structured evidence in each phase.
        </AppText>
      </View>

      {/* Hero: Current Phase */}
      <View style={styles.section}>
        <GlassCard size="large" style={styles.heroCard}>
          <View style={styles.cardHeader}>
            <Badge 
              label="CURRENT PHASE" 
              color={Accent.purple} 
              bgColor="rgba(139, 92, 246, 0.1)" 
            />
          </View>
          <View style={styles.heroTextContainer}>
            <AppText variant="bold" style={styles.heroTitle}>
              {currentPhase.title}
            </AppText>
            <AppText style={styles.heroBody}>
              {currentPhase.description}
            </AppText>
          </View>
          
          <GlassButton
            variant="primary"
            style={styles.heroCta}
            onPress={() => router.push(`/hackathon-program/phase/${currentPhase.id}`)}
          >
            Enter Phase
          </GlassButton>
        </GlassCard>
      </View>

      {/* Team Context */}
      <View style={styles.section}>
        <GlassCard size="medium" style={styles.teamCard}>
          <View style={styles.cardHeader}>
             <Badge
                label="TEAM"
                color={ThemeText.primary}
                bgColor={PageBg.default}
             />
             <AppText style={styles.metaCopy}>
               ID: {data.team?.id?.substring(0, 6) ?? "---"}
             </AppText>
          </View>
          <AppText variant="bold" style={styles.teamName}>
            {data.team?.name ?? data.team?.team_name ?? "Not assigned to a team yet"}
          </AppText>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <InboxCard preview={inboxPreview} loading={loading} />
      </View>

      {selectedChallenge ? (
        <View style={styles.section}>
          <GlassCard size="medium" style={styles.challengeCard}>
            <View style={styles.cardHeader}>
              <Badge
                label="CHALLENGE"
                color={Accent.purple}
                bgColor="rgba(139, 92, 246, 0.1)"
              />
            </View>
            <AppText variant="bold" style={styles.challengeTitle}>
              {selectedChallenge.title}
            </AppText>
            <AppText style={styles.challengeCopy}>
              {selectedChallenge.trackTitle
                ? `${selectedChallenge.trackTitle} · ${selectedChallenge.promptLabel}`
                : selectedChallenge.promptLabel}
            </AppText>
            <GlassButton
              variant="secondary"
              style={styles.challengeButton}
              onPress={() => router.push("/hackathon/challenges")}
            >
              View all challenges
            </GlassButton>
          </GlassCard>
        </View>
      ) : null}

      {/* Timeline of all phases */}
      <View style={styles.section}>
        <AppText variant="bold" style={styles.sectionTitle}>
          Program Timeline
        </AppText>
        
        <View style={styles.timelineContainer}>
          {data.phases.map((phase, index) => {
            const isCurrent = phase.id === currentPhase.id;
            const isPast = data.phases.findIndex(p => p.id === currentPhase.id) > index;
            
            // Determine styling based on state
            const nodeColor = isCurrent ? Accent.purple : isPast ? Accent.green : ThemeText.muted;
            const cardBgColor = isCurrent ? "#FFFFFF" : isPast ? "#FAFAFA" : "#FFFFFF";
            const borderColor = isCurrent ? "rgba(139, 92, 246, 0.2)" : "rgba(0,0,0,0.05)";

            return (
              <View key={phase.id} style={styles.timelineRow}>
                {/* Timeline visual line & node */}
                <View style={styles.timelineVisual}>
                  <View style={[styles.timelineNode, { backgroundColor: nodeColor, borderColor: isCurrent ? "rgba(139, 92, 246, 0.3)" : "transparent", borderWidth: isCurrent ? 4 : 0 }]} />
                  {index < data.phases.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: isPast ? Accent.green : ThemeText.muted }]} />
                  )}
                </View>

                {/* Phase Card */}
                <Pressable
                  style={styles.timelineCardWrapper}
                  onPress={() => router.push(`/hackathon-program/phase/${phase.id}`)}
                >
                  <View style={[
                    styles.phaseCard, 
                    { backgroundColor: cardBgColor, borderColor },
                    isCurrent && styles.currentPhaseCardShadow
                  ]}>
                    <View style={styles.phaseCardHeader}>
                      <AppText variant="bold" style={[
                        styles.phaseTitle, 
                        isCurrent && { color: Accent.purple },
                        (!isCurrent && !isPast) && { color: ThemeText.tertiary }
                      ]}>
                        {phase.title}
                      </AppText>
                      {isPast && (
                        <Badge label="DONE" color={Accent.green} bgColor="rgba(16, 185, 129, 0.1)" />
                      )}
                    </View>
                    <AppText style={[
                      styles.phaseBody,
                      (!isCurrent && !isPast) && { color: ThemeText.tertiary }
                    ]}>
                      {phase.description}
                    </AppText>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PageBg.default, // Standard off-white
  },
  content: {
    padding: Space.xl,
    paddingTop: Space["3xl"],
    paddingBottom: 120,
    gap: Space["2xl"], // Large inter-card gap
  },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PageBg.default,
  },
  
  // Header
  header: {
    gap: Space.xs,
    paddingHorizontal: Space.xs,
  },
  eyebrow: {
    fontSize: Type.label.fontSize,
    color: Accent.purple, // Highlighted metric color
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: Space.xs,
  },
  title: {
    fontSize: 32, // Large serif-like scale
    lineHeight: 38,
    color: ThemeText.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Type.body.fontSize,
    lineHeight: 24,
    color: ThemeText.secondary,
    marginTop: Space.sm,
  },

  // Preview Banner
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderColor: Accent.amber,
    borderWidth: 1,
    gap: Space.sm,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  previewTitle: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
  },
  previewCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: ThemeText.secondary,
  },

  // Sections
  section: {
    gap: Space.lg,
  },
  sectionTitle: {
    fontSize: Type.title.fontSize,
    color: ThemeText.primary,
    paddingLeft: Space.xs,
    letterSpacing: -0.5,
    marginBottom: Space.sm,
  },

  // Cards General
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.sm,
  },

  // Badges
  badge: {
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Hero Card
  heroCard: {
    gap: Space.lg,
    paddingBottom: Space["2xl"], // Extra padding for the bottom CTA
  },
  heroTextContainer: {
    gap: Space.sm,
  },
  heroTitle: {
    fontSize: Type.header.fontSize,
    lineHeight: 34,
    color: ThemeText.primary,
    letterSpacing: -0.5,
  },
  heroBody: {
    fontSize: Type.body.fontSize,
    lineHeight: 24,
    color: ThemeText.secondary,
  },
  heroCta: {
    marginTop: Space.lg,
    backgroundColor: Accent.yellow,
    borderRadius: Radius.full, // Pill-shape CTA
  },
  heroCtaText: {
    color: ThemeText.primary,
    fontSize: 16,
  },

  // Team Card
  teamCard: {
    gap: Space.sm,
  },
  challengeCard: {
    gap: Space.sm,
  },
  challengeTitle: {
    fontSize: Type.subtitle.fontSize,
    color: ThemeText.primary,
  },
  challengeCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: ThemeText.secondary,
  },
  challengeButton: {
    marginTop: Space.sm,
    alignSelf: "flex-start",
  },
  metaCopy: {
    fontSize: 12,
    color: ThemeText.tertiary,
    fontFamily: "LibreFranklin_400Regular",
  },
  teamName: {
    fontSize: Type.subtitle.fontSize,
    color: ThemeText.primary,
  },

  // Timeline
  timelineContainer: {
    marginTop: Space.sm,
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: Space.md,
  },
  timelineVisual: {
    width: 32,
    alignItems: "center",
    marginRight: Space.md,
  },
  timelineNode: {
    width: 14,
    height: 14,
    borderRadius: Radius.full,
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: -10, // Overlap under node
    marginBottom: -24, // Connect to next node
    opacity: 0.3,
  },
  timelineCardWrapper: {
    flex: 1,
    paddingBottom: Space.xl,
  },
  phaseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    gap: Space.xs,
  },
  currentPhaseCardShadow: {
    shadowColor: Accent.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  phaseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  phaseTitle: {
    fontSize: Type.subtitle.fontSize,
    color: ThemeText.primary,
    flex: 1,
  },
  phaseBody: {
    fontSize: 14,
    lineHeight: 20,
    color: ThemeText.secondary,
    marginTop: 2,
  },
});
