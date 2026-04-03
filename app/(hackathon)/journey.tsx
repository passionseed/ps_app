import React, { useCallback, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle as SvgCircle, Line, Polyline, Text as SvgText, Path } from "react-native-svg";
import { AppText } from "../../components/AppText";
import { Space } from "../../lib/theme";
import { getCurrentHackathonProgramHome, getEmptyHackathonProgramHome } from "../../lib/hackathonProgram";
import { getPreviewHackathonProgramHome } from "../../lib/hackathonProgramPreview";
import { getProgramPhasesWithActivities } from "../../lib/hackathonPhaseActivity";
import type { HackathonProgramHome, HackathonProgramPhase } from "../../types/hackathon-program";

// Tokens
const BG = "transparent";
const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const AMBER = "#F59E0B";
const CARD_BG = "rgba(13,18,25,0.95)";
const BLUE = "#65ABFC";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN60 = "rgba(145,196,227,0.6)";
const WHITE28 = "rgba(255,255,255,0.28)";
const WHITE06 = "rgba(255,255,255,0.06)";

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

type NodeState = "completed" | "current" | "upcoming";
type ActivityNode = {
  title: string;
  state: NodeState;
};

// ── Standard Circular Progress ──
function CircularProgress({ percent, size = 64, strokeWidth = 6 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <SvgCircle
          stroke="rgba(255,255,255,0.08)"
          fill="none"
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <SvgCircle
          stroke={CYAN}
          fill="none"
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          originX={cx}
          originY={cy}
          rotation="-90"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText variant="bold" style={{ fontSize: 13, color: WHITE }}>{percent}%</AppText>
      </View>
    </View>
  );
}

// ── Redesigned Phase Card ──
type PhaseCard = {
  phase: HackathonProgramPhase;
  activityTitles: string[];
  activityCount: number;
  completedCount: number;
  isActive: boolean;
};

function PhaseCardView({ card, onPress }: { card: PhaseCard; onPress: () => void }) {
  const dueDate = formatDate(card.phase.due_at ?? card.phase.ends_at);
  const pct = card.activityCount > 0 ? Math.round((card.completedCount / card.activityCount) * 100) : 0;
  
  // Format phase number (e.g., "01")
  const phaseNumString = String(card.phase.phase_number).padStart(2, "0");

  return (
    <Pressable style={({ pressed }) => [styles.cardContainer, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
        <LinearGradient 
          colors={['rgba(20, 28, 41, 0.9)', 'rgba(8, 14, 22, 0.95)']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.cardInner}
        >
          {/* Giant background number hint */}
          <AppText variant="bold" style={styles.cardBgNumber} pointerEvents="none">
            {phaseNumString}
          </AppText>

          <View style={styles.cardTopRow}>
            <View style={{ flex: 1, paddingRight: Space.md }}>
              <AppText style={styles.phaseLabel}>PHASE {phaseNumString}</AppText>
              <AppText variant="bold" style={styles.phaseName} numberOfLines={2}>
                {card.phase.title}
              </AppText>
              {dueDate ? (
                <View style={styles.dateBadge}>
                  <AppText style={styles.phaseDue}>Due: {dueDate}</AppText>
                </View>
              ) : null}
            </View>

            {/* Circular Progress Ring */}
            <View style={styles.progressRingWrapper}>
              <CircularProgress percent={pct} size={58} strokeWidth={5} />
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <AppText style={styles.statVal}>{card.activityCount}</AppText>
                <AppText style={styles.statLabel}>Tasks</AppText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <AppText style={styles.statVal}>{card.completedCount}</AppText>
                <AppText style={styles.statLabel}>Done</AppText>
              </View>
            </View>
            <View style={styles.actionBtn}>
              <AppText variant="bold" style={styles.actionBtnText}>ENTER</AppText>
            </View>
          </View>
          
        </LinearGradient>
      </BlurView>
    </Pressable>
  );
}

// ── Vertical Learning Journey Node ──
type NodeStatus = "completed" | "active" | "locked";

type ActivityData = {
  id: string;
  title: string;
  duration: string;
  status: NodeStatus;
  type: string;
};

// Mock data for the active phase's activities
const ACTIVE_PHASE_ACTIVITIES: ActivityData[] = [
  { id: "1", title: "Know Yourself", duration: "15 min", status: "completed", type: "Video & Reflection" },
  { id: "2", title: "Find a Problem", duration: "30 min", status: "active", type: "Interactive Workshop" },
  { id: "3", title: "Brainstorm Solutions", duration: "45 min", status: "locked", type: "Team Collaboration" },
  { id: "4", title: "Pick Your Solution", duration: "20 min", status: "locked", type: "Decision Matrix" },
];

function ActivityPathNode({ activity, isLast }: { activity: ActivityData, isLast: boolean }) {
  const isCompleted = activity.status === "completed";
  const isActive = activity.status === "active";
  
  return (
    <View style={styles.pathNodeContainer}>
      {/* Node Visualization Column */}
      <View style={styles.pathNodeGraphCol}>
        {isCompleted && (
          <View style={[styles.pathDot, styles.pathDotCompleted]}>
            <Svg width="12" height="12" viewBox="0 0 16 16">
              <Polyline points="3,8 7,12 13,4" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        )}
        
        {isActive && (
          <View style={styles.pathDotActiveWrapper}>
            <View style={styles.pathDotActivePulse} />
            <View style={[styles.pathDot, styles.pathDotActive]} />
          </View>
        )}
        
        {(!isCompleted && !isActive) && (
          <View style={[styles.pathDot, styles.pathDotLocked]} />
        )}

        {/* Vertical Line Connecting Nodes */}
        {!isLast && (
          <View style={[
            styles.pathLine, 
            isCompleted ? styles.pathLineCompleted : styles.pathLineLocked
          ]} />
        )}
      </View>

      {/* Activity Card Column */}
      <Pressable 
        style={[styles.activityCardWrapper, (!isCompleted && !isActive) && { opacity: 0.6 }]}
        disabled={activity.status === "locked"}
      >
        <BlurView intensity={20} tint="dark" style={styles.activityCardBlur}>
          <LinearGradient
            colors={[
              isActive ? 'rgba(101, 171, 252, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
              'rgba(255, 255, 255, 0.01)'
            ]}
            style={[styles.activityCardInner, isActive && styles.activityCardInnerActive]}
          >
            <View style={styles.activityCardHeader}>
              <AppText style={styles.activityType}>{activity.type}</AppText>
              <AppText style={styles.activityDuration}>{activity.duration}</AppText>
            </View>
            <AppText variant="bold" style={styles.activityTitle}>{activity.title}</AppText>
            
            {isActive && (
              <View style={styles.activityActionRow}>
                <AppText variant="bold" style={styles.activityActionText}>CONTINUE</AppText>
                <AppText style={styles.activityActionArrow}>→</AppText>
              </View>
            )}
          </LinearGradient>
        </BlurView>
      </Pressable>
    </View>
  );
}

// ── Main Screen ──
// ── Coming Soon Phase Card ──
function PhaseComingSoonCardView() {
  return (
    <View style={[styles.cardContainer, { opacity: 0.6 }]}>
      <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
        <LinearGradient 
          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={[styles.cardInner, { justifyContent: 'center', alignItems: 'center', borderColor: "transparent" }]}
        >
          <AppText variant="bold" style={{ fontSize: 24, color: WHITE28, marginBottom: 8, fontFamily: "BaiJamjuree_700Bold", letterSpacing: 1 }}>COMING SOON</AppText>
          <AppText style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "BaiJamjuree_500Medium" }}>More challenges await!</AppText>
        </LinearGradient>
      </BlurView>
    </View>
  );
}

export default function HackathonJourneyScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HackathonProgramHome | null>(null);
  const [phaseCards, setPhaseCards] = useState<PhaseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const home = await getCurrentHackathonProgramHome();
      const isEmpty = JSON.stringify(home) === JSON.stringify(getEmptyHackathonProgramHome());
      if (isEmpty || !home.program || home.phases.length === 0) {
        const previewHome = getPreviewHackathonProgramHome();
        setData(previewHome);
        setPhaseCards(previewHome.phases.map((phase, i) => ({
          phase,
          activityTitles: i === 0 ? ["Know Yourself", "Find a Problem", "Brainstorm Solutions", "Pick Your Solution"] : [],
          activityCount: i === 0 ? 4 : 0,
          completedCount: i === 0 ? 1 : 0,
          isActive: phase.id === previewHome.enrollment?.current_phase_id,
        })));
      } else {
        setData(home);
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
      setPhaseCards(previewHome.phases.map((phase, i) => ({
        phase,
        activityTitles: i === 0 ? ["Know Yourself", "Find a Problem", "Brainstorm Solutions", "Pick Your Solution"] : [],
        activityCount: i === 0 ? 4 : 0,
        completedCount: i === 0 ? 1 : 0,
        isActive: phase.id === previewHome.enrollment?.current_phase_id,
      })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function scrollTo(index: number) {
    const clamped = Math.max(0, Math.min(index, phaseCards.length));
    setActiveIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * (CARD_WIDTH + CARD_GAP), animated: true });
  }

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: CYAN }}>Loading...</AppText>
      </View>
    );
  }

  const activePhase = phaseCards[activeIndex];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={CYAN} />}
      >
        <View style={styles.header}>
          <AppText variant="bold" style={styles.title}>Your Journey</AppText>
        </View>

        {/* Phases Carousel */}
        {phaseCards.length > 0 ? (
          <View style={styles.carouselSection}>
            <ScrollView 
              ref={scrollRef} 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              scrollEnabled={true}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              style={{ flex: 1 }} 
              contentContainerStyle={styles.cardsContent}
            >
              {phaseCards.map((card) => (
                <PhaseCardView key={card.phase.id} card={card} onPress={() => router.push(`/(hackathon)/phase/${card.phase.id}`)} />
              ))}
              <PhaseComingSoonCardView />
            </ScrollView>

            <View style={styles.dots}>
              {phaseCards.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
              <View style={[styles.dot, phaseCards.length === activeIndex && styles.dotActive]} />
            </View>
          </View>
        ) : (
          <View style={styles.emptyPhases}>
            <AppText style={{ color: WHITE28 }}>No phases available yet.</AppText>
          </View>
        )}

        {/* Vertical Activity Path */}
        <View style={styles.pathSection}>
          <View style={styles.pathSectionHeader}>
            <AppText variant="bold" style={styles.pathSectionTitle}>
              {activePhase ? activePhase.phase.title : "Curriculum activities"}
            </AppText>
            <AppText style={styles.pathSectionSubtitle}>
              Complete these steps to finish this phase.
            </AppText>
          </View>

          <View style={styles.pathList}>
            {ACTIVE_PHASE_ACTIVITIES.map((activity, index) => (
              <ActivityPathNode 
                key={activity.id} 
                activity={activity} 
                isLast={index === ACTIVE_PHASE_ACTIVITIES.length - 1} 
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: Space.xl, paddingBottom: 140, gap: Space.lg },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  
  header: {
    paddingHorizontal: Space.xs,
    marginBottom: Space.sm,
  },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 32, lineHeight: 40, color: WHITE, fontFamily: "BaiJamjuree_700Bold", marginTop: 4 },

  carouselSection: { gap: Space.md, marginBottom: Space.xl },
  carouselRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chevron: { padding: Space.xs, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8 },
  chevronText: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_400Regular" },
  cardsContent: { flexDirection: "row", gap: Space.md, paddingRight: Space["2xl"] },
  rightSide: { flexDirection: "row", alignItems: "center" },
  peek: { width: PEEK_WIDTH, height: 220, borderRadius: 16, backgroundColor: WHITE06, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  
  cardContainer: { width: CARD_WIDTH, borderRadius: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  cardBlur: { flex: 1, borderRadius: 18, overflow: "hidden" },
  cardInner: { flex: 1, padding: Space.lg, gap: Space.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 18 },
  cardGlow: { position: "absolute", top: -30, right: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(145,196,227,0.06)" },
  cardBgNumber: { position: "absolute", right: -10, top: -20, fontSize: 130, color: "rgba(255,255,255,0.02)", fontFamily: "BaiJamjuree_700Bold", zIndex: -1 },
  
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 },
  phaseLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: CYAN45, fontFamily: "BaiJamjuree_600SemiBold", marginBottom: 4 },
  phaseName: { fontSize: 22, lineHeight: 28, color: WHITE, fontFamily: "BaiJamjuree_700Bold", marginBottom: 8 },
  dateBadge: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  phaseDue: { fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "BaiJamjuree_500Medium" },
  
  progressRingWrapper: { alignItems: "center", justifyContent: "center", width: 64, height: 64 },
  
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: Space.md, marginTop: Space.sm, zIndex: 1 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statBox: { alignItems: "center", paddingHorizontal: Space.sm },
  statVal: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "BaiJamjuree_500Medium", textTransform: "uppercase", letterSpacing: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: Space.xs },
  
  actionBtn: { backgroundColor: "rgba(101,171,252,0.12)", paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: 12, borderWidth: 1, borderColor: "rgba(101,171,252,0.2)" },
  actionBtnText: { fontSize: 11, color: BLUE, fontFamily: "BaiJamjuree_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },

  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { backgroundColor: CYAN60, width: 14 },
  emptyPhases: { padding: Space.xl, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, alignItems: "center" },

  // Vertical Path Styles
  pathSection: {
    paddingHorizontal: Space.sm,
  },
  pathSectionHeader: {
    marginBottom: Space.xl,
  },
  pathSectionTitle: {
    fontSize: 22,
    color: WHITE,
    marginBottom: 4,
  },
  pathSectionSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
  },
  pathList: {
    flexDirection: "column",
  },
  pathNodeContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 110,
  },
  pathNodeGraphCol: {
    width: 40,
    alignItems: "center",
  },
  pathDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pathDotCompleted: {
    backgroundColor: CYAN,
    borderColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  pathDotActiveWrapper: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pathDotActivePulse: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(101, 171, 252, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(101, 171, 252, 0.4)",
  },
  pathDotActive: {
    backgroundColor: CARD_BG,
    borderColor: BLUE,
  },
  pathDotLocked: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  pathLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  pathLineCompleted: {
    backgroundColor: "rgba(145, 196, 227, 0.4)",
  },
  pathLineLocked: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  
  activityCardWrapper: {
    flex: 1,
    paddingLeft: Space.lg,
    paddingBottom: Space.xl,
    marginTop: -4,
  },
  activityCardBlur: {
    borderRadius: 16,
    overflow: "hidden",
  },
  activityCardInner: {
    padding: Space.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  activityCardInnerActive: {
    borderColor: "rgba(101, 171, 252, 0.4)",
  },
  activityCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.sm,
  },
  activityType: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "BaiJamjuree_500Medium",
  },
  activityDuration: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.3)",
  },
  activityTitle: {
    fontSize: 18,
    color: WHITE,
  },
  activityActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Space.md,
    backgroundColor: "rgba(101, 171, 252, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: Space.md,
    paddingVertical: 6,
    borderRadius: 20,
    gap: Space.xs,
  },
  activityActionText: {
    fontSize: 11,
    color: BLUE,
    letterSpacing: 1,
  },
  activityActionArrow: {
    fontSize: 14,
    color: BLUE,
    fontWeight: "bold",
  },
});

