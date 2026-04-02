// app/(hackathon)/home.tsx
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { AppText } from "../../components/AppText";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
} from "../../lib/hackathonProgram";
import {
  getPreviewHackathonProgramHome,
} from "../../lib/hackathonProgramPreview";
import { getProgramPhasesWithActivities } from "../../lib/hackathonPhaseActivity";
import { Space } from "../../lib/theme";
import type { HackathonProgramHome, HackathonProgramPhase } from "../../types/hackathon-program";

// ── Bioluminescent Ocean tokens ─────────────────────────────────
const BG      = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN    = "#91C4E3";
const BLUE    = "#65ABFC";
const CYAN45  = "rgba(145,196,227,0.45)";
const CYAN60  = "rgba(145,196,227,0.6)";
const BORDER  = "rgba(74,107,130,0.35)";
const WHITE   = "#FFFFFF";
const WHITE28 = "rgba(255,255,255,0.28)";
const WHITE06 = "rgba(255,255,255,0.06)";
const AMBER   = "#F59E0B";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_PADDING = Space.xl;
const PEEK_WIDTH = 28;
const CARD_GAP = Space.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2 - PEEK_WIDTH - 32;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ── Node Graph ───────────────────────────────────────────────────
type NodeState = "completed" | "current" | "upcoming";

type ActivityNode = {
  title: string;
  state: NodeState;
};

function PhaseNodeGraph({ nodes, width }: { nodes: ActivityNode[]; width: number }) {
  if (nodes.length === 0) return null;

  const HEIGHT = 90;
  const LABEL_AREA = 28;
  const NODE_Y = (HEIGHT - LABEL_AREA) / 2;
  const NODE_R = 11;
  const PULSE_R = 16;

  const PAD_X = 20;
  const usable = width - PAD_X * 2;
  const step = nodes.length > 1 ? usable / (nodes.length - 1) : 0;
  const cx = (i: number) => PAD_X + i * step;

  return (
    <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
      {nodes.map((node, i) => {
        if (i === nodes.length - 1) return null;
        const x1 = cx(i) + NODE_R;
        const x2 = cx(i + 1) - NODE_R;
        const opacity = node.state === "completed" ? 0.25 : 0.12;
        return (
          <Line
            key={`line-${i}`}
            x1={x1} y1={NODE_Y}
            x2={x2} y2={NODE_Y}
            stroke={`rgba(145,196,227,${opacity})`}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        );
      })}

      {nodes.map((node, i) => {
        const x = cx(i);
        const labelY = NODE_Y + NODE_R + 10;
        const shortTitle = node.title.length > 8 ? node.title.slice(0, 8) + "…" : node.title;

        if (node.state === "completed") {
          return (
            <React.Fragment key={`node-${i}`}>
              <Circle cx={x} cy={NODE_Y} r={NODE_R} fill="rgba(145,196,227,0.15)" stroke={CYAN} strokeWidth={1.5} />
              <Circle cx={x} cy={NODE_Y} r={7} fill={CYAN} />
              <Polyline
                points={`${x - 5},${NODE_Y} ${x - 1},${NODE_Y + 4} ${x + 5},${NODE_Y - 4}`}
                fill="none"
                stroke="#03050a"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <SvgText x={x} y={labelY} textAnchor="middle" fontSize={7.5} fill="rgba(145,196,227,0.7)" fontFamily="system-ui">
                {shortTitle}
              </SvgText>
            </React.Fragment>
          );
        }

        if (node.state === "current") {
          return (
            <React.Fragment key={`node-${i}`}>
              <Circle cx={x} cy={NODE_Y} r={PULSE_R} fill="rgba(145,196,227,0.04)" stroke="rgba(145,196,227,0.3)" strokeWidth={1} strokeDasharray="3 2" />
              <Circle cx={x} cy={NODE_Y} r={NODE_R} fill={CARD_BG} stroke={CYAN} strokeWidth={2} />
              <Circle cx={x} cy={NODE_Y} r={4} fill={CYAN} opacity={0.8} />
              <SvgText x={x} y={labelY + 6} textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.55)" fontFamily="system-ui">
                {shortTitle}
              </SvgText>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={`node-${i}`}>
            <Circle cx={x} cy={NODE_Y} r={NODE_R} fill="rgba(13,18,25,0.6)" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <SvgText x={x} y={labelY} textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.25)" fontFamily="system-ui">
              {shortTitle}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ── Phase Card ───────────────────────────────────────────────────
type PhaseCard = {
  phase: HackathonProgramPhase;
  activityTitles: string[];
  activityCount: number;
  completedCount: number;
  isActive: boolean;
};

function PhaseCardView({ card, onPress }: { card: PhaseCard; onPress: () => void }) {
  const dueDate = formatDate(card.phase.due_at ?? card.phase.ends_at);
  const pct = card.activityCount > 0
    ? Math.round((card.completedCount / card.activityCount) * 100)
    : 0;

  const nodes: ActivityNode[] = card.activityTitles.map((title, i) => {
    if (i < card.completedCount) return { title, state: "completed" };
    if (i === card.completedCount) return { title, state: "current" };
    return { title, state: "upcoming" };
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <View style={styles.cardGlow} pointerEvents="none" />

      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.phaseLabel}>Phase {card.phase.phase_number}</AppText>
          <AppText variant="bold" style={styles.phaseName}>{card.phase.title}</AppText>
          {card.activityCount > 0 && (
            <AppText style={styles.phasePct}>{pct}% complete</AppText>
          )}
        </View>
        {dueDate ? <AppText style={styles.phaseDue}>{dueDate}</AppText> : null}
      </View>

      <View style={styles.graphContainer}>
        <PhaseNodeGraph nodes={nodes} width={CARD_WIDTH - Space.lg * 2} />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      <View style={styles.cardFooter}>
        <AppText style={styles.actCount}>
          {card.activityCount} {card.activityCount === 1 ? "activity" : "activities"}
        </AppText>
        <AppText style={styles.tapHint}>Tap to open →</AppText>
      </View>
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────
export default function HackathonHomeScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HackathonProgramHome | null>(null);
  const [phaseCards, setPhaseCards] = useState<PhaseCard[]>([]);
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
        setPhaseCards(
          previewHome.phases.map((phase, i) => ({
            phase,
            activityTitles: i === 0
              ? ["Know Yourself", "Find a Problem", "Brainstorm Solutions", "Pick Your Solution"]
              : [],
            activityCount: i === 0 ? 4 : 0,
            completedCount: i === 0 ? 1 : 0,
            isActive: phase.id === previewHome.enrollment?.current_phase_id,
          }))
        );
      } else {
        setData(home);
        setIsPreview(false);
        const phasesWithActivities = await getProgramPhasesWithActivities(home.program.id);
        const currentPhaseId = home.enrollment?.current_phase_id;

        const cards: PhaseCard[] = home.phases.map((phase) => {
          const phaseData = phasesWithActivities.find((p) => p.id === phase.id);
          const activities = phaseData?.activities ?? [];
          return {
            phase,
            activityTitles: activities.map((a) => a.title),
            activityCount: activities.length,
            completedCount: 0,
            isActive: phase.id === currentPhaseId,
          };
        });
        setPhaseCards(cards);

        const currentIndex = cards.findIndex((c) => c.isActive);
        if (currentIndex > 0) setActiveIndex(currentIndex);
      }
    } catch {
      const previewHome = getPreviewHackathonProgramHome();
      setData(previewHome);
      setIsPreview(true);
      setPhaseCards(
        previewHome.phases.map((phase, i) => ({
          phase,
          activityTitles: i === 0
            ? ["Know Yourself", "Find a Problem", "Brainstorm Solutions", "Pick Your Solution"]
            : [],
          activityCount: i === 0 ? 4 : 0,
          completedCount: i === 0 ? 1 : 0,
          isActive: phase.id === previewHome.enrollment?.current_phase_id,
        }))
      );
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
    const clamped = Math.max(0, Math.min(index, phaseCards.length - 1));
    setActiveIndex(clamped);
    scrollRef.current?.scrollTo({
      x: clamped * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
  }

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: CYAN }}>Loading...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.glowCyan} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={CYAN}
          />
        }
      >
        <View style={styles.header}>
          <AppText style={styles.eyebrow}>
            {data.program?.title ?? "Epic Sprint"}
          </AppText>
          <AppText variant="bold" style={styles.title}>Your Journey</AppText>
        </View>

        {isPreview && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={[styles.statusDot, { backgroundColor: AMBER }]} />
              <AppText variant="bold" style={styles.previewTitle}>Preview Mode</AppText>
            </View>
            <AppText style={styles.previewCopy}>
              Sign in with a valid participant account to see your real progress.
            </AppText>
          </View>
        )}

        {phaseCards.length > 0 ? (
          <View style={styles.carouselSection}>
            <View style={styles.carouselRow}>
              <Pressable
                onPress={() => scrollTo(activeIndex - 1)}
                style={styles.chevron}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                disabled={activeIndex === 0}
              >
                <AppText style={[styles.chevronText, activeIndex === 0 && { opacity: 0.2 }]}>‹</AppText>
              </Pressable>

              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.cardsContent}
              >
                {phaseCards.map((card) => (
                  <PhaseCardView
                    key={card.phase.id}
                    card={card}
                    onPress={() => router.push(`/(hackathon)/phase/${card.phase.id}`)}
                  />
                ))}
              </ScrollView>

              <View style={styles.rightSide}>
                <Pressable
                  onPress={() => scrollTo(activeIndex + 1)}
                  style={styles.chevron}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  disabled={activeIndex === phaseCards.length - 1}
                >
                  <AppText style={[styles.chevronText, activeIndex === phaseCards.length - 1 && { opacity: 0.2 }]}>›</AppText>
                </Pressable>
                {activeIndex < phaseCards.length - 1 && <View style={styles.peek} />}
              </View>
            </View>

            <View style={styles.dots}>
              {phaseCards.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyPhases}>
            <AppText style={{ color: WHITE28 }}>No phases available yet.</AppText>
          </View>
        )}

        {data.team && (
          <View style={styles.teamCard}>
            <View style={styles.teamCardHeader}>
              <AppText style={styles.teamLabel}>Team</AppText>
              <AppText style={styles.teamId}>ID: {data.team.id?.substring(0, 6) ?? "---"}</AppText>
            </View>
            <AppText variant="bold" style={styles.teamName}>
              {data.team.name ?? data.team.team_name ?? "Not assigned to a team yet"}
            </AppText>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.challengeLinkCard, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/hackathon/challenges")}
        >
          <View style={styles.challengeLinkContent}>
            <AppText variant="bold" style={styles.challengeLinkLabel}>YOUR CHALLENGE</AppText>
            <AppText variant="bold" style={styles.challengeLinkTitle}>
              {data.enrollment?.selected_challenge_id ? "View Selected Challenge" : "Pick Your Problem Space"}
            </AppText>
            {!data.enrollment?.selected_challenge_id && (
              <AppText style={styles.challengeLinkDesc}>
                Select a challenge brief before proceeding.
              </AppText>
            )}
          </View>
          <AppText style={styles.challengeLinkArrow}>→</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 120,
    gap: Space["2xl"],
  },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },

  glowCyan: {
    position: "absolute", top: -60, left: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: CYAN, opacity: 0.05,
  },
  glowPurple: {
    position: "absolute", bottom: 80, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "#A594BA", opacity: 0.07,
  },

  header: { gap: Space.xs },
  eyebrow: {
    fontSize: 10,
    color: CYAN45,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    fontFamily: "BaiJamjuree_500Medium",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    color: WHITE,
    textShadowColor: "rgba(145,196,227,0.25)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    fontFamily: "BaiJamjuree_700Bold",
  },

  previewCard: {
    backgroundColor: "rgba(145,196,227,0.04)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.08)",
    borderRadius: 20,
    padding: Space.xl,
    gap: Space.md,
    overflow: "hidden",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYAN60,
    shadowColor: CYAN60,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  previewTitle: { fontSize: 18, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  previewCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "BaiJamjuree_400Regular",
  },

  carouselSection: { gap: Space.md },
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chevron: {
    padding: Space.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
  },
  chevronText: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_400Regular" },

  cardsContent: {
    flexDirection: "row",
    gap: Space.md,
    paddingRight: Space["2xl"],
  },
  rightSide: { flexDirection: "row", alignItems: "center" },
  peek: {
    width: PEEK_WIDTH,
    height: 220,
    borderRadius: 16,
    backgroundColor: WHITE06,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: Space.lg,
    gap: Space.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(145,196,227,0.06)",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Space.sm },
  phaseLabel: { fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: CYAN45, fontFamily: "BaiJamjuree_500Medium" },
  phaseName: { fontSize: 15, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  phasePct: { fontSize: 11, color: CYAN60, marginTop: 2, fontFamily: "BaiJamjuree_400Regular" },
  phaseDue: { fontSize: 11, color: WHITE28, fontFamily: "BaiJamjuree_400Regular" },
  graphContainer: { marginHorizontal: -Space.xs },

  progressTrack: { height: 2, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 1 },
  progressFill: { height: "100%", backgroundColor: CYAN60, borderRadius: 1 },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    paddingTop: Space.sm,
  },
  actCount: { fontSize: 10, color: WHITE28, fontFamily: "BaiJamjuree_400Regular" },
  tapHint: { fontSize: 10, color: BLUE, fontFamily: "BaiJamjuree_500Medium" },

  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { backgroundColor: CYAN60, width: 14 },

  emptyPhases: {
    padding: Space.xl,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    alignItems: "center",
  },

  teamCard: {
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.1)",
    padding: Space.xl,
    gap: Space.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  teamCardHeader: { gap: 2 },
  teamLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CYAN45,
    fontFamily: "BaiJamjuree_500Medium",
  },
  teamId: { fontSize: 11, color: WHITE28, fontFamily: "BaiJamjuree_400Regular" },
  teamName: { fontSize: 24, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },

  challengeLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(145,196,227,0.08)",
    borderRadius: 18,
    padding: Space.lg,
    gap: Space.md,
  },
  challengeLinkContent: { flex: 1, gap: Space.xs },
  challengeLinkLabel: { fontSize: 9, color: CYAN45, textTransform: "uppercase", letterSpacing: 2, fontFamily: "BaiJamjuree_500Medium" },
  challengeLinkTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  challengeLinkDesc: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2, fontFamily: "BaiJamjuree_400Regular" },
  challengeLinkArrow: { fontSize: 20, color: BLUE, fontFamily: "BaiJamjuree_700Bold" },
});

