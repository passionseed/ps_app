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
import { Accent, PageBg, Space } from "../../lib/theme";
import type { HackathonProgramHome } from "../../types/hackathon-program";

export default function HackathonProgramHomeScreen() {
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
    data.phases[0]!;

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
        />
      }
    >
      <AppText variant="bold" style={styles.eyebrow}>
        Super Seed Hackathon
      </AppText>
      <AppText variant="bold" style={styles.title}>
        Playlist-based PathLab for the full hackathon
      </AppText>
      <AppText style={styles.subtitle}>
        Phase-driven learning with team checkpoints, individual evidence, and structured synthesis.
      </AppText>

      {isPreview ? (
        <GlassCard variant="neutral" style={styles.previewCard}>
          <AppText variant="bold">Preview mode</AppText>
          <AppText style={styles.previewCopy}>
            This route uses built-in preview data because the mobile app does not yet bridge Supabase users to the custom `hackathon_participants` auth system.
          </AppText>
        </GlassCard>
      ) : null}

      <GlassCard variant="destination" style={styles.heroCard}>
        <AppText variant="bold" style={styles.heroLabel}>
          Current phase
        </AppText>
        <AppText variant="bold" style={styles.heroTitle}>
          {currentPhase.title}
        </AppText>
        <AppText style={styles.heroBody}>
          {currentPhase.description}
        </AppText>
        <GlassButton
          variant="primary"
          onPress={() => router.push(`/hackathon-program/phase/${currentPhase.id}`)}
        >
          Open phase playlist
        </GlassButton>
      </GlassCard>

      <GlassCard variant="neutral" style={styles.teamCard}>
        <AppText variant="bold" style={styles.sectionTitle}>
          Team context
        </AppText>
        <AppText>{data.team?.name ?? data.team?.team_name ?? "Team not linked yet"}</AppText>
        <AppText style={styles.metaCopy}>
          Program: {data.program?.title ?? "Preview program"}
        </AppText>
      </GlassCard>

      <View style={styles.section}>
        <AppText variant="bold" style={styles.sectionTitle}>
          All phases
        </AppText>
        {data.phases.map((phase) => (
          <Pressable
            key={phase.id}
            onPress={() => router.push(`/hackathon-program/phase/${phase.id}`)}
          >
            <GlassCard variant="neutral" style={styles.phaseCard}>
              <AppText variant="bold" style={styles.phaseTitle}>
                {phase.title}
              </AppText>
              <AppText style={styles.phaseBody}>{phase.description}</AppText>
            </GlassCard>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  content: {
    padding: Space.lg,
    gap: Space.lg,
    paddingBottom: 96,
  },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PageBg.default,
  },
  eyebrow: {
    fontSize: 13,
    opacity: 0.78,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.82,
  },
  previewCard: {
    gap: 8,
  },
  previewCopy: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.84,
  },
  heroCard: {
    gap: 12,
  },
  heroLabel: {
    fontSize: 12,
    opacity: 0.72,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.86,
  },
  teamCard: {
    gap: 6,
  },
  metaCopy: {
    fontSize: 14,
    opacity: 0.78,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  phaseCard: {
    gap: 8,
  },
  phaseTitle: {
    fontSize: 18,
  },
  phaseBody: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.82,
  },
});
