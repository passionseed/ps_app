import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PathLabSkiaLoader } from "../../../components/PathLabSkiaLoader";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText as Text } from "../../../components/AppText";
import { SkiaBackButton } from "../../../components/navigation/SkiaBackButton";
import { getHackathonPhaseDetail } from "../../../lib/hackathonProgram";
import { getPreviewPhaseDetail } from "../../../lib/hackathonProgramPreview";
import { Accent, Space, Text as ThemeText, Radius, PageBg } from "../../../lib/theme";
import type { HackathonPhaseDetail } from "../../../types/hackathon-program";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HackathonPhaseScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const [detail, setDetail] = useState<HackathonPhaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

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
      return () => {
        cancelled = true;
      };
    }, [phaseId]),
  );

  if (loading || !detail) {
    return (
      <View style={styles.loadingRoot}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#F8F9FA", "#F3E8FF"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.headerActions, { top: insets.top + Space.xs }]}>
        <SkiaBackButton
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}>

        <View style={styles.headerContainer}>
          <Text variant="bold" style={styles.title}>
            {detail.phase?.title ?? "Phase"}
          </Text>
          <Text style={styles.subtitle}>
            {detail.phase?.description}
          </Text>
        </View>

        {detail.playlists.map((playlist) => (
          <View key={playlist.id} style={styles.playlist}>
            <View style={styles.playlistHeader}>
              <Text variant="bold" style={styles.playlistTitle}>
                {playlist.title}
              </Text>
              <Text style={styles.playlistBody}>{playlist.description}</Text>
            </View>

            {playlist.modules.map((module) => (
              <Pressable
                key={module.id}
                onPress={() => router.push(`/hackathon-program/module/${module.id}`)}
                style={({ pressed }) => [pressed && { opacity: 0.8 }]}
              >
                <View style={styles.moduleCard}>
                  <Text variant="bold" style={styles.moduleTitle}>
                    {module.title}
                  </Text>
                  <Text style={styles.moduleBody}>
                    {module.summary ?? "Structured module"}
                  </Text>
                  <View style={styles.moduleMetaContainer}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.moduleMeta}>SCOPE: {module.workflow_scope}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.moduleMeta}>GATE: {module.gate_rule}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  headerActions: {
    position: "absolute",
    left: Space.lg,
    zIndex: 10,
  },
  headerContainer: {
    marginBottom: Space.sm,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    color: ThemeText.primary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: ThemeText.secondary,
  },
  playlist: {
    gap: Space.sm,
    marginTop: Space.xs,
  },
  playlistHeader: {
    marginBottom: Space.xs,
    paddingHorizontal: Space.xs,
  },
  playlistTitle: {
    fontSize: 20,
    color: ThemeText.primary,
    marginBottom: 4,
  },
  playlistBody: {
    fontSize: 14,
    lineHeight: 20,
    color: ThemeText.secondary,
  },
  moduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    padding: Space.lg,
    gap: 8,
    shadowColor: Accent.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.1)",
  },
  moduleTitle: {
    fontSize: 18,
    color: ThemeText.primary,
  },
  moduleBody: {
    fontSize: 14,
    lineHeight: 20,
    color: ThemeText.secondary,
  },
  moduleMetaContainer: {
    flexDirection: "row",
    gap: Space.xs,
    marginTop: Space.xs,
  },
  metaBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  moduleMeta: {
    fontSize: 10,
    color: Accent.purple,
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
