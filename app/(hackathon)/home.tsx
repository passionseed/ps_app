// app/(hackathon)/home.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { JourneyNodeGraph } from "../../components/Hackathon/JourneyNodeGraph";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
  getHackathonJourneyModules,
  getModuleActivityProgress,
} from "../../lib/hackathonProgram";
import {
  getPreviewHackathonProgramHome,
  getPreviewJourneyModules,
} from "../../lib/hackathonProgramPreview";
import { Radius, Space } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import type {
  HackathonJourneyModuleProgress,
  HackathonPhaseModule,
  HackathonProgramHome,
} from "../../types/hackathon-program";

const BG = "#010814";
const CYAN = "#00F0FF";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const AMBER = "#F59E0B";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_PADDING = Space.xl;
const PEEK_WIDTH = 28;
const CARD_GAP = Space.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2 - PEEK_WIDTH - 32; // 32 for chevrons

type ModuleWithEnds = HackathonPhaseModule & { ends_at: string | null };

const PLACEHOLDER_NODES = Array.from({ length: 6 }, (_, i) => ({
  id: `placeholder-${i}`,
  map_id: "placeholder",
  title: "Activity",
  node_type: "text" as const,
}));

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function ModuleCard({
  module,
  isActive,
  onPress,
}: {
  module: ModuleWithEnds;
  isActive: boolean;
  onPress: () => void;
}) {
  const [progress, setProgress] = useState<HackathonJourneyModuleProgress | null>(null);

  useEffect(() => {
    if (!isActive) return;
    // No path_id means preview module — show placeholder graph dots
    if (!module.path_id) {
      setProgress({
        moduleId: module.id,
        totalNodes: PLACEHOLDER_NODES.length,
        completedNodes: 0,
        currentNodeId: null,
        nodes: PLACEHOLDER_NODES,
        completedNodeIds: new Set(),
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setProgress({
              moduleId: module.id,
              totalNodes: PLACEHOLDER_NODES.length,
              completedNodes: 0,
              currentNodeId: null,
              nodes: PLACEHOLDER_NODES,
              completedNodeIds: new Set(),
            });
          }
          return;
        }
        const result = await getModuleActivityProgress(module.id, user.id);
        if (!cancelled) {
          setProgress({
            moduleId: module.id,
            totalNodes: result.nodes.length,
            completedNodes: result.completedNodeIds.size,
            currentNodeId: result.currentNodeId,
            nodes: result.nodes,
            completedNodeIds: result.completedNodeIds,
          });
        }
      } catch {
        if (!cancelled) {
          setProgress({
            moduleId: module.id,
            totalNodes: 0,
            completedNodes: 0,
            currentNodeId: null,
            nodes: [],
            completedNodeIds: new Set(),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, module.id, module.path_id]);

  const pct =
    progress && progress.totalNodes > 0
      ? Math.round((progress.completedNodes / progress.totalNodes) * 100)
      : null;

  const progressLabel = progress === null
    ? "Loading..."
    : progress.totalNodes === 0
      ? "No activities yet"
      : `${pct}% complete`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="bold" style={styles.cardTitle}>
            {module.title}
          </AppText>
          <AppText style={[styles.cardProgress, progress === null && { opacity: 0.3 }]}>
            {progressLabel}
          </AppText>
        </View>
        <AppText style={styles.cardDate}>{formatDate(module.ends_at)}</AppText>
      </View>

      <View style={styles.graphContainer}>
        {progress ? (
          <JourneyNodeGraph
            nodes={progress.nodes}
            completedNodeIds={progress.completedNodeIds}
            currentNodeId={progress.currentNodeId}
            width={CARD_WIDTH - Space.lg * 2}
            height={110}
          />
        ) : (
          <View style={{ height: 110 }} />
        )}
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: pct !== null ? `${pct}%` : "0%" },
          ]}
        />
      </View>
    </Pressable>
  );
}

export default function HackathonHomeScreen() {
  const [data, setData] = useState<HackathonProgramHome | null>(null);
  const [modules, setModules] = useState<ModuleWithEnds[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const home = await getCurrentHackathonProgramHome();
      const isEmpty =
        JSON.stringify(home) === JSON.stringify(getEmptyHackathonProgramHome());

      if (isEmpty || !home.program || home.phases.length === 0) {
        const previewHome = getPreviewHackathonProgramHome();
        setData(previewHome);
        setIsPreview(true);
        const previewPhase =
          previewHome.phases.find((p) => p.id === previewHome.enrollment?.current_phase_id) ??
          previewHome.phases[0];
        if (previewPhase) {
          setModules(getPreviewJourneyModules(previewPhase.id));
        }
      } else {
        setData(home);
        setIsPreview(false);
        const currentPhase =
          home.phases.find((p) => p.id === home.enrollment?.current_phase_id) ??
          home.phases[0];
        if (currentPhase) {
          const mods = await getHackathonJourneyModules(currentPhase.id);
          setModules(mods);
        }
      }
    } catch {
      const previewHome = getPreviewHackathonProgramHome();
      setData(previewHome);
      setIsPreview(true);
      const previewPhase =
        previewHome.phases.find((p) => p.id === previewHome.enrollment?.current_phase_id) ??
        previewHome.phases[0];
      if (previewPhase) {
        setModules(getPreviewJourneyModules(previewPhase.id));
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

  function scrollTo(index: number) {
    const clamped = Math.max(0, Math.min(index, modules.length - 1));
    setActiveIndex(clamped);
    scrollRef.current?.scrollTo({
      x: clamped * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
  }

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={CYAN} />
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
          tintColor={CYAN}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>
          {data.program?.title ?? "Super Seed Hackathon"}
        </AppText>
        <AppText variant="bold" style={styles.title}>
          Your Journey
        </AppText>
      </View>

      {isPreview && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={[styles.statusDot, { backgroundColor: AMBER }]} />
            <AppText variant="bold" style={styles.previewTitle}>
              Preview Mode
            </AppText>
          </View>
          <AppText style={styles.previewCopy}>
            Sign in with a valid participant account to see your real progress.
          </AppText>
        </View>
      )}

      {/* Carousel */}
      {modules.length > 0 ? (
        <View style={styles.carouselSection}>
          <View style={styles.carouselRow}>
            {/* Left chevron */}
            <Pressable
              onPress={() => scrollTo(activeIndex - 1)}
              style={styles.chevron}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              disabled={activeIndex === 0}
            >
              <AppText
                style={[
                  styles.chevronText,
                  activeIndex === 0 && { opacity: 0.2 },
                ]}
              >
                ‹
              </AppText>
            </Pressable>

            {/* Scrollable cards */}
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              style={{ flex: 1 }}
              contentContainerStyle={styles.cardsContent}
            >
              {modules.map((mod, i) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  isActive={i === activeIndex}
                  onPress={() => router.push(`/(hackathon)/module/${mod.id}`)}
                />
              ))}
            </ScrollView>

            {/* Right chevron + peek */}
            <View style={styles.rightSide}>
              <Pressable
                onPress={() => scrollTo(activeIndex + 1)}
                style={styles.chevron}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                disabled={activeIndex === modules.length - 1}
              >
                <AppText
                  style={[
                    styles.chevronText,
                    activeIndex === modules.length - 1 && { opacity: 0.2 },
                  ]}
                >
                  ›
                </AppText>
              </Pressable>
              {activeIndex < modules.length - 1 && (
                <View style={styles.peek} />
              )}
            </View>
          </View>

          {/* Dot indicators */}
          <View style={styles.dots}>
            {modules.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyModules}>
          <AppText style={{ color: WHITE40 }}>No modules available yet.</AppText>
        </View>
      )}

      {/* Team card */}
      {data.team && (
        <View style={styles.teamCard}>
          <View style={styles.teamCardHeader}>
            <AppText variant="bold" style={styles.teamLabel}>
              TEAM
            </AppText>
            <AppText style={styles.teamId}>
              ID: {data.team.id?.substring(0, 6) ?? "---"}
            </AppText>
          </View>
          <AppText variant="bold" style={styles.teamName}>
            {data.team.name ?? data.team.team_name ?? "Not assigned to a team yet"}
          </AppText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: {
    padding: CARD_PADDING,
    paddingTop: Space["3xl"],
    paddingBottom: 120,
    gap: Space["2xl"],
  },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  header: { gap: Space.xs },
  eyebrow: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  title: { fontSize: 32, lineHeight: 38, color: WHITE, letterSpacing: -0.5 },
  previewCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    backgroundColor: "rgba(245,158,11,0.06)",
    padding: Space.lg,
    gap: Space.sm,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  statusDot: { width: 8, height: 8, borderRadius: Radius.full },
  previewTitle: { fontSize: 14, color: AMBER },
  previewCopy: { fontSize: 13, lineHeight: 20, color: WHITE75 },
  // Carousel
  carouselSection: { gap: Space.md },
  carouselRow: { flexDirection: "row", alignItems: "center" },
  chevron: { paddingHorizontal: 4 },
  chevronText: { fontSize: 28, color: CYAN, lineHeight: 34 },
  rightSide: { flexDirection: "row", alignItems: "center" },
  peek: {
    width: PEEK_WIDTH,
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardsContent: { gap: CARD_GAP },
  // Module card
  card: {
    width: CARD_WIDTH,
    backgroundColor: CYAN_BG,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    borderRadius: Radius.lg,
    padding: Space.lg,
    gap: Space.md,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
  },
  cardTitle: { fontSize: 16, color: WHITE },
  cardProgress: { fontSize: 11, color: CYAN, marginTop: 2 },
  cardDate: { fontSize: 11, color: WHITE40 },
  graphContainer: { marginHorizontal: -Space.xs },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 2,
  },
  progressFill: { height: 3, backgroundColor: CYAN, borderRadius: 2 },
  // Dots
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: { backgroundColor: CYAN },
  // Empty
  emptyModules: { alignItems: "center", paddingVertical: Space.xl },
  // Team card
  teamCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    padding: Space.lg,
    gap: Space.sm,
  },
  teamCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  teamId: { fontSize: 12, color: WHITE40 },
  teamName: { fontSize: 18, color: WHITE },
});
