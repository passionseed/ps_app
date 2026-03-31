// app/(hackathon)/phase/[phaseId].tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { getHackathonPhaseDetail } from "../../../lib/hackathonProgram";
import { getPreviewPhaseDetail } from "../../../lib/hackathonProgramPreview";
import { Radius, Space } from "../../../lib/theme";
import type { HackathonPhaseDetail } from "../../../types/hackathon-program";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";

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
        <ActivityIndicator size="large" color={CYAN} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>PHASE</AppText>
        <AppText variant="bold" style={styles.title}>
          {detail.phase?.title ?? "Phase"}
        </AppText>
        <AppText style={styles.subtitle}>{detail.phase?.description}</AppText>
      </View>

      {detail.playlists.map((playlist) => (
        <View key={playlist.id} style={styles.playlist}>
          {/* Playlist header card */}
          <View style={styles.playlistCard}>
            <LinearGradient
              colors={["#01040A", "#030B17"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.playlistGlow} pointerEvents="none" />
            <AppText variant="bold" style={styles.playlistTitle}>
              {playlist.title}
            </AppText>
            <AppText style={styles.playlistBody}>{playlist.description}</AppText>
          </View>

          {playlist.modules.map((module) => (
            <Pressable
              key={module.id}
              onPress={() => router.push(`/(hackathon)/module/${module.id}`)}
              style={({ pressed }) => [styles.moduleCard, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.moduleDot} />
              <View style={styles.moduleContent}>
                <AppText variant="bold" style={styles.moduleTitle}>
                  {module.title}
                </AppText>
                <AppText style={styles.moduleBody}>
                  {module.summary ?? "Structured module"}
                </AppText>
                <View style={styles.modulePills}>
                  <MetaPill value={module.workflow_scope} />
                  <MetaPill value={module.gate_rule} />
                </View>
              </View>
              <AppText style={styles.moduleArrow}>→</AppText>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function MetaPill({ value }: { value: string }) {
  return (
    <View style={styles.metaPill}>
      <AppText style={styles.metaPillText}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: Space.lg, gap: Space.xl, paddingBottom: 96 },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  backLink: { fontSize: 15, color: CYAN },
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 30, lineHeight: 36, color: WHITE },
  subtitle: { fontSize: 15, lineHeight: 23, color: WHITE75 },
  playlist: { gap: Space.sm },
  playlistCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    padding: Space.lg,
    gap: Space.sm,
  },
  playlistGlow: {
    position: "absolute",
    left: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,240,255,0.08)",
  },
  playlistTitle: { fontSize: 18, color: WHITE },
  playlistBody: { fontSize: 13, lineHeight: 20, color: WHITE75 },
  moduleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Space.lg,
    gap: Space.md,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYAN,
    opacity: 0.6,
    flexShrink: 0,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  moduleContent: { flex: 1, gap: 4 },
  moduleTitle: { fontSize: 16, color: WHITE },
  moduleBody: { fontSize: 13, lineHeight: 19, color: WHITE75 },
  modulePills: { flexDirection: "row", gap: Space.xs, marginTop: Space.xs },
  moduleArrow: {
    fontSize: 16,
    color: CYAN,
    textShadowColor: "rgba(0,240,255,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  metaPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
  },
  metaPillText: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
