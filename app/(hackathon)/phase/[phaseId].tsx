// app/(hackathon)/phase/[phaseId].tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { GlassCard } from "../../../components/Glass/GlassCard";
import { getHackathonPhaseDetail } from "../../../lib/hackathonProgram";
import { getPreviewPhaseDetail } from "../../../lib/hackathonProgramPreview";
import { Accent, PageBg, Space, Text as ThemeText } from "../../../lib/theme";
import type { HackathonPhaseDetail } from "../../../types/hackathon-program";

export default function HackathonPhaseScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const [detail, setDetail] = useState<HackathonPhaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const live = await getHackathonPhaseDetail(phaseId!);
          if (!cancelled) {
            setDetail(live.phase ? live : getPreviewPhaseDetail(phaseId!));
          }
        } catch {
          if (!cancelled) {
            setDetail(getPreviewPhaseDetail(phaseId!));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [phaseId]),
  );

  if (loading || !detail) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={Accent.yellow} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <AppText variant="bold" style={styles.title}>
        {detail.phase?.title ?? "Phase"}
      </AppText>
      <AppText style={styles.subtitle}>{detail.phase?.description}</AppText>

      {detail.playlists.map((playlist) => (
        <View key={playlist.id} style={styles.playlist}>
          <GlassCard variant="destination" style={styles.playlistCard}>
            <AppText variant="bold" style={styles.playlistTitle}>
              {playlist.title}
            </AppText>
            <AppText style={styles.playlistBody}>{playlist.description}</AppText>
          </GlassCard>

          {playlist.modules.map((module) => (
            <Pressable
              key={module.id}
              onPress={() => router.push(`/(hackathon)/module/${module.id}`)}
            >
              <GlassCard variant="neutral" style={styles.moduleCard}>
                <AppText variant="bold" style={styles.moduleTitle}>
                  {module.title}
                </AppText>
                <AppText style={styles.moduleBody}>
                  {module.summary ?? "Structured module"}
                </AppText>
                <AppText style={styles.moduleMeta}>
                  Scope: {module.workflow_scope} · Gate: {module.gate_rule}
                </AppText>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PageBg.default },
  content: { padding: Space.lg, gap: Space.lg, paddingBottom: 96 },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: PageBg.default },
  backLink: { fontSize: 15, color: ThemeText.secondary },
  title: { fontSize: 30, lineHeight: 36, color: ThemeText.primary },
  subtitle: { fontSize: 16, lineHeight: 24, color: ThemeText.secondary },
  playlist: { gap: 12 },
  playlistCard: { gap: 8 },
  playlistTitle: { fontSize: 20, color: ThemeText.primary },
  playlistBody: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary },
  moduleCard: { gap: 8 },
  moduleTitle: { fontSize: 18, color: ThemeText.primary },
  moduleBody: { fontSize: 14, lineHeight: 20, color: ThemeText.secondary },
  moduleMeta: { fontSize: 12, color: ThemeText.tertiary, textTransform: "uppercase" },
});
