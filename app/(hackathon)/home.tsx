// app/(hackathon)/home.tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { GlassCard } from "../../components/Glass/GlassCard";
import { GlassButton } from "../../components/Glass/GlassButton";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
} from "../../lib/hackathonProgram";
import { getPreviewHackathonProgramHome } from "../../lib/hackathonProgramPreview";
import { Accent, PageBg, Space, Text as ThemeText, Radius, Type } from "../../lib/theme";
import type { HackathonProgramHome } from "../../types/hackathon-program";

function Badge({ label, color, bgColor }: { label: string; color: string; bgColor: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <AppText variant="bold" style={[styles.badgeText, { color }]}>
        {label}
      </AppText>
    </View>
  );
}

export default function HackathonHomeScreen() {
  const [data, setData] = useState<HackathonProgramHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const home = await getCurrentHackathonProgramHome();
      const isEmpty =
        JSON.stringify(home) === JSON.stringify(getEmptyHackathonProgramHome());

      if (isEmpty || !home.program || home.phases.length === 0) {
        setData(getPreviewHackathonProgramHome());
        setIsPreview(true);
      } else {
        setData(home);
        setIsPreview(false);
      }
    } catch {
      setData(getPreviewHackathonProgramHome());
      setIsPreview(true);
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
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  const currentPhase =
    data.phases.find((phase) => phase.id === data.enrollment?.current_phase_id) ??
    data.phases[0];

  if (!currentPhase) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: ThemeText.secondary }}>No phases available yet.</AppText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={Accent.yellow}
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

      {isPreview && (
        <GlassCard size="small" style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={[styles.statusDot, { backgroundColor: Accent.amber }]} />
            <AppText variant="bold" style={styles.previewTitle}>Preview Mode</AppText>
          </View>
          <AppText style={styles.previewCopy}>
            You are viewing sample data. Sign in with a valid participant account to see your real progress.
          </AppText>
        </GlassCard>
      )}

      <View style={styles.section}>
        <GlassCard size="large" style={styles.heroCard}>
          <View style={styles.cardHeader}>
            <Badge label="CURRENT PHASE" color={Accent.purple} bgColor="rgba(139, 92, 246, 0.1)" />
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
            onPress={() => router.push(`/(hackathon)/phase/${currentPhase.id}`)}
          >
            Enter Phase
          </GlassButton>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <GlassCard size="medium" style={styles.teamCard}>
          <View style={styles.cardHeader}>
            <Badge label="TEAM" color={ThemeText.primary} bgColor={PageBg.default} />
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
        <AppText variant="bold" style={styles.sectionTitle}>
          Program Timeline
        </AppText>
        <View style={styles.timelineContainer}>
          {data.phases.map((phase, index) => {
            const isCurrent = phase.id === currentPhase.id;
            const isPast = data.phases.findIndex((p) => p.id === currentPhase.id) > index;
            const nodeColor = isCurrent ? Accent.purple : isPast ? Accent.green : ThemeText.muted;
            const cardBgColor = "#FFFFFF";
            const borderColor = isCurrent ? "rgba(139, 92, 246, 0.2)" : "rgba(0,0,0,0.05)";

            return (
              <View key={phase.id} style={styles.timelineRow}>
                <View style={styles.timelineVisual}>
                  <View
                    style={[
                      styles.timelineNode,
                      {
                        backgroundColor: nodeColor,
                        borderColor: isCurrent ? "rgba(139, 92, 246, 0.3)" : "transparent",
                        borderWidth: isCurrent ? 4 : 0,
                      },
                    ]}
                  />
                  {index < data.phases.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: isPast ? Accent.green : ThemeText.muted },
                      ]}
                    />
                  )}
                </View>
                <Pressable
                  style={styles.timelineCardWrapper}
                  onPress={() => router.push(`/(hackathon)/phase/${phase.id}`)}
                >
                  <View
                    style={[
                      styles.phaseCard,
                      { backgroundColor: cardBgColor, borderColor },
                      isCurrent && styles.currentPhaseCardShadow,
                    ]}
                  >
                    <View style={styles.phaseCardHeader}>
                      <AppText
                        variant="bold"
                        style={[
                          styles.phaseTitle,
                          isCurrent && { color: Accent.purple },
                          !isCurrent && !isPast && { color: ThemeText.tertiary },
                        ]}
                      >
                        {phase.title}
                      </AppText>
                      {isPast && (
                        <Badge label="DONE" color={Accent.green} bgColor="rgba(16, 185, 129, 0.1)" />
                      )}
                    </View>
                    <AppText
                      style={[
                        styles.phaseBody,
                        !isCurrent && !isPast && { color: ThemeText.tertiary },
                      ]}
                    >
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PageBg.default },
  content: { padding: Space.xl, paddingTop: Space["3xl"], paddingBottom: 120, gap: Space["2xl"] },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: PageBg.default },
  header: { gap: Space.xs, paddingHorizontal: Space.xs },
  eyebrow: { fontSize: Type.label.fontSize, color: Accent.purple, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: Space.xs },
  title: { fontSize: 32, lineHeight: 38, color: ThemeText.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: Type.body.fontSize, lineHeight: 24, color: ThemeText.secondary, marginTop: Space.sm },
  previewCard: { backgroundColor: "#FFFFFF", borderColor: Accent.amber, borderWidth: 1, gap: Space.sm },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  statusDot: { width: 8, height: 8, borderRadius: Radius.full },
  previewTitle: { fontSize: Type.body.fontSize, color: ThemeText.primary },
  previewCopy: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary },
  section: { gap: Space.lg },
  sectionTitle: { fontSize: Type.title.fontSize, color: ThemeText.primary, paddingLeft: Space.xs, letterSpacing: -0.5, marginBottom: Space.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Space.sm },
  badge: { paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Radius.full },
  badgeText: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  heroCard: { gap: Space.lg, paddingBottom: Space["2xl"] },
  heroTextContainer: { gap: Space.sm },
  heroTitle: { fontSize: Type.header.fontSize, lineHeight: 34, color: ThemeText.primary, letterSpacing: -0.5 },
  heroBody: { fontSize: Type.body.fontSize, lineHeight: 24, color: ThemeText.secondary },
  heroCta: { marginTop: Space.lg, backgroundColor: Accent.yellow, borderRadius: Radius.full },
  teamCard: { gap: Space.sm },
  metaCopy: { fontSize: 12, color: ThemeText.tertiary, fontFamily: "LibreFranklin_400Regular" },
  teamName: { fontSize: Type.subtitle.fontSize, color: ThemeText.primary },
  timelineContainer: { marginTop: Space.sm },
  timelineRow: { flexDirection: "row", marginBottom: Space.md },
  timelineVisual: { width: 32, alignItems: "center", marginRight: Space.md },
  timelineNode: { width: 14, height: 14, borderRadius: Radius.full, marginTop: 4, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, marginTop: -10, marginBottom: -24, opacity: 0.3 },
  timelineCardWrapper: { flex: 1, paddingBottom: Space.xl },
  phaseCard: { backgroundColor: "#FFFFFF", borderRadius: Radius.lg, padding: Space.lg, borderWidth: 1, gap: Space.xs },
  currentPhaseCardShadow: { shadowColor: Accent.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  phaseCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  phaseTitle: { fontSize: Type.subtitle.fontSize, color: ThemeText.primary, flex: 1 },
  phaseBody: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary, marginTop: 2 },
});
