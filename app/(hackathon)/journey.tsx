import React, { useCallback, useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { AppText } from "../../components/AppText";
import { HackathonJellyfishLoader } from "../../components/Hackathon/HackathonJellyfishLoader";
import { trackHackathonAlienButtonClick } from "../../lib/hackathonAlienClicks";
import { Space } from "../../lib/theme";
import {
  getCachedHackathonJourneyBundle,
  loadHackathonJourneyBundle,
  preloadHackathonPhaseBundle,
  type HackathonJourneyPhaseCard,
} from "../../lib/hackathonScreenData";
import type { HackathonProgramHome } from "../../types/hackathon-program";
import type { TeamImpact } from "../../lib/hackathon-submit";
// Journey data stays on the lightweight getProgramPhaseActivitySummaries query path.
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

// Tokens
const BG = "transparent";
const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const CARD_BG = "rgba(13,18,25,0.95)";
const BLUE = "#65ABFC";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN60 = "rgba(145,196,227,0.6)";
const WHITE28 = "rgba(255,255,255,0.28)";
const ALIEN_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

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

// ── Shared Types ──
// ── Pulse Indicator ──
function ActivePulse() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 1500 }), withTiming(1, { duration: 1500 })),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 1500 }), withTiming(0.8, { duration: 1500 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[
        { position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: CYAN45 },
        animatedStyle
      ]} />
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: CYAN, shadowColor: CYAN, shadowRadius: 8, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } }} />
    </View>
  );
}

// ── Vertical Phase Card ──
function AnimatedVerticalPhaseCard({
  card,
  index,
  isLast,
}: {
  card: HackathonJourneyPhaseCard;
  index: number;
  isLast: boolean;
}) {
  const dueDate = formatDate(card.phase.due_at ?? card.phase.ends_at);
  const pct = card.activityCount > 0 ? Math.round((card.completedCount / card.activityCount) * 100) : 0;
  const phaseNumString = String(card.phase.phase_number).padStart(2, "0");
  
  const isCompleted = pct === 100;
  const isLocked = card.phase.status !== "released";

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 150 + 100).springify()} 
      style={styles.verticalTimelineRow}
    >
      {/* Left Timeline Indicator */}
      <View style={styles.timelineIndicatorCol}>
        {card.isActive ? (
          <ActivePulse />
        ) : isCompleted ? (
          <View style={styles.timelineDotCompleted}><AppText style={{ fontSize: 10 }}>✓</AppText></View>
        ) : (
          <View style={styles.timelineDotLocked} />
        )}
        
        {!isLast && (
          <View style={[styles.timelineLine, isCompleted ? { backgroundColor: CYAN45 } : { backgroundColor: "rgba(255,255,255,0.1)" }]} />
        )}
      </View>

      {/* Right Phase Card */}
      <Pressable 
        style={({ pressed }) => [styles.verticalCardWrapper, pressed && { opacity: 0.9 }, isLocked && { opacity: 0.5 }]} 
        onPressIn={() => !isLocked && void preloadHackathonPhaseBundle(card.phase.id)}
        onPress={() => !isLocked && router.push(`/(hackathon)/phase/${card.phase.id}`)}
      >
        <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
          <LinearGradient 
            colors={card.isActive ? ['rgba(20, 28, 41, 0.9)', 'rgba(8, 14, 22, 0.95)'] : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']} 
            style={[styles.cardInner, card.isActive && { borderColor: "rgba(145,196,227,0.3)" }]}
          >
            <AppText variant="bold" style={styles.cardBgNumber} pointerEvents="none">
              {phaseNumString}
            </AppText>

            <View style={styles.cardTopRow}>
              <View style={{ flex: 1, paddingRight: Space.md }}>
                <AppText style={styles.phaseLabel}>PHASE {phaseNumString}</AppText>
                <AppText variant="bold" style={styles.phaseName} numberOfLines={2}>
                  {card.phase.title}
                </AppText>
                {dueDate && (
                  <AppText style={styles.phaseDue}>Due: {dueDate}</AppText>
                )}
              </View>

              {!isLocked && (
                <View style={styles.progressRingWrapper}>
                  <CircularProgress percent={pct} size={54} strokeWidth={4} />
                </View>
              )}
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
              {!isLocked ? (
                <View style={[styles.actionBtn, isCompleted && { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "transparent" }]}>
                  <AppText variant="bold" style={[styles.actionBtnText, isCompleted && { color: WHITE }]}>
                    {isCompleted ? "REVIEW" : "ENTER"}
                  </AppText>
                </View>
              ) : (
                <View style={styles.lockedBtn}>
                  <AppText variant="bold" style={styles.lockedBtnText}>LOCKED</AppText>
                </View>
              )}
            </View>
            
          </LinearGradient>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

// ── Header Stats Component ──
function JourneyImpactHeader({ impact }: { impact: TeamImpact | null }) {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.impactContainer}>
      <AppText variant="bold" style={styles.impactTitle}>YOUR TEAM IMPACT</AppText>
      <View style={styles.impactGrid}>
        <View style={styles.impactBox}>
          <AppText variant="bold" style={[styles.impactVal, { color: CYAN }]}>
            {impact?.rank != null ? `#${impact.rank}` : '—'}
          </AppText>
          <AppText style={styles.impactLabel}>TEAM{'\n'}RANK</AppText>
        </View>
        <View style={styles.impactDivider} />
        <View style={styles.impactBox}>
          <AppText variant="bold" style={styles.impactVal}>
            {impact?.activitiesCompleted ?? '—'}
          </AppText>
          <AppText style={styles.impactLabel}>ACTIVITIES{'\n'}COMPLETED</AppText>
        </View>
        <View style={styles.impactDivider} />
        <View style={styles.impactBox}>
          <AppText variant="bold" style={styles.impactVal}>
            {impact?.score ?? '—'}
          </AppText>
          <AppText style={styles.impactLabel}>SCORE{'\n'}EARNED</AppText>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HackathonJourneyScreen() {
  const insets = useSafeAreaInsets();
  const cachedBundle = getCachedHackathonJourneyBundle();
  const [data, setData] = useState<HackathonProgramHome | null>(
    cachedBundle?.data ?? null,
  );
  const [phaseCards, setPhaseCards] = useState<HackathonJourneyPhaseCard[]>(
    cachedBundle?.phaseCards ?? [],
  );
  const [impact, setImpact] = useState<TeamImpact | null>(
    cachedBundle?.impact ?? null,
  );
  const [loading, setLoading] = useState(!cachedBundle);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const cached = getCachedHackathonJourneyBundle();
    if (cached && !refreshing) {
      setData(cached.data);
      setPhaseCards(cached.phaseCards);
      setImpact(cached.impact);
      setLoading(false);
    } else if (!cached) {
      setLoading(true);
    }

    try {
      const bundle = await loadHackathonJourneyBundle({
        forceRefresh: refreshing,
      });
      setData(bundle.data);
      setPhaseCards(bundle.phaseCards);
      setImpact(bundle.impact);
    } catch {
      setData({
        team: null,
        enrollment: null,
        program: null,
        phases: [],
      });
      setPhaseCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <HackathonJellyfishLoader />
        <AppText style={styles.loadingText}>Loading your journey...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={CYAN} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <AppText variant="bold" style={styles.title}>Your Journey</AppText>
            <AppText style={styles.subtitle}>Track your learning & progress</AppText>
          </View>
          <Pressable
            style={({ pressed }) => [styles.avatarCircle, pressed && { opacity: 0.8 }]}
            onPress={() => {
              void trackHackathonAlienButtonClick({
                source: "journey_header_alien_button",
                teamId: data.team?.id ?? null,
                targetUrl: ALIEN_VIDEO_URL,
              });
              void Linking.openURL(ALIEN_VIDEO_URL);
            }}
          >
            <AppText style={{ fontSize: 18 }}>👽</AppText>
          </Pressable>
        </View>

        <JourneyImpactHeader impact={impact} />

        {/* Vertical Phases */}
        {phaseCards.length > 0 ? (
          <View style={styles.timelineSection}>
            {phaseCards.map((card, index) => (
              <AnimatedVerticalPhaseCard 
                key={card.phase.id} 
                card={card} 
                index={index} 
                isLast={index === phaseCards.length - 1} 
              />
            ))}
            
            {/* Coming Soon Node */}
            <Animated.View entering={FadeInDown.delay(phaseCards.length * 150 + 100).springify()} style={styles.verticalTimelineRow}>
              <View style={styles.timelineIndicatorCol}>
                <View style={[styles.timelineDotLocked, { borderColor: "rgba(255,255,255,0.05)" }]} />
              </View>
              <View style={[styles.verticalCardWrapper, { opacity: 0.4 }]}>
                <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
                  <LinearGradient 
                    colors={['rgba(255, 255, 255, 0.02)', 'transparent']} 
                    style={[styles.cardInner, { alignItems: 'center', justifyContent: 'center', minHeight: 100 }]}
                  >
                    <AppText variant="bold" style={{ fontSize: 16, color: WHITE28, letterSpacing: 1 }}>COMING SOON</AppText>
                    <AppText style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>More challenges await!</AppText>
                  </LinearGradient>
                </BlurView>
              </View>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.emptyPhases}>
            <AppText style={{ color: WHITE28 }}>No phases available yet.</AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: Space.xl, paddingBottom: 140, gap: Space.xl },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG, gap: Space.md },
  loadingText: { color: CYAN, fontSize: 14, fontFamily: "BaiJamjuree_500Medium", letterSpacing: 0.4 },
  
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Space.xs },
  title: { fontSize: 32, lineHeight: 40, color: WHITE, fontFamily: "BaiJamjuree_700Bold", marginTop: 4 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },

  // Impact Header
  impactContainer: { backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, padding: Space.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  impactTitle: { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2, marginBottom: Space.md },
  impactGrid: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  impactBox: { flex: 1, alignItems: "center" },
  impactVal: { fontSize: 24, color: WHITE, fontFamily: "BaiJamjuree_700Bold", marginBottom: 2 },
  impactLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", textAlign: "center", letterSpacing: 0.5, lineHeight: 12 },
  impactDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.1)" },
  impactHighlight: { backgroundColor: "rgba(157, 129, 172, 0.1)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(157, 129, 172, 0.3)" },
  impactHighlightVal: { fontSize: 18, color: "#9D81AC", fontFamily: "BaiJamjuree_700Bold", marginBottom: 2 },
  impactHighlightLabel: { fontSize: 9, color: "rgba(157, 129, 172, 0.8)", textAlign: "center", letterSpacing: 0.5, lineHeight: 12 },

  // Timeline
  timelineSection: { marginTop: Space.sm },
  verticalTimelineRow: { flexDirection: "row", alignItems: "stretch", minHeight: 140 },
  timelineIndicatorCol: { width: 36, alignItems: "center", paddingTop: 20 },
  timelineDotCompleted: { width: 20, height: 20, borderRadius: 10, backgroundColor: CYAN, alignItems: "center", justifyContent: "center", shadowColor: CYAN, shadowRadius: 8, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 } },
  timelineDotLocked: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.5)" },
  timelineLine: { width: 2, flex: 1, marginVertical: 8, borderRadius: 1 },

  // Cards
  verticalCardWrapper: { flex: 1, paddingBottom: Space.xl },
  cardBlur: { flex: 1, borderRadius: 18, overflow: "hidden" },
  cardInner: { flex: 1, padding: Space.lg, gap: Space.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 18 },
  cardBgNumber: { position: "absolute", right: -15, top: -25, fontSize: 110, color: "rgba(255,255,255,0.03)", fontFamily: "BaiJamjuree_700Bold", zIndex: -1 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 },
  phaseLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: CYAN45, fontFamily: "BaiJamjuree_700Bold", marginBottom: 4 },
  phaseName: { fontSize: 20, lineHeight: 26, color: WHITE, fontFamily: "BaiJamjuree_700Bold", marginBottom: 6 },
  phaseDue: { fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "BaiJamjuree_500Medium" },
  progressRingWrapper: { alignItems: "center", justifyContent: "center", width: 54, height: 54 },
  
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: Space.md, marginTop: Space.sm, zIndex: 1 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statBox: { alignItems: "center", paddingHorizontal: Space.sm },
  statVal: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "BaiJamjuree_500Medium", textTransform: "uppercase", letterSpacing: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: Space.xs },
  
  actionBtn: { backgroundColor: "rgba(101,171,252,0.12)", paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: 12, borderWidth: 1, borderColor: "rgba(101,171,252,0.2)" },
  actionBtnText: { fontSize: 11, color: BLUE, fontFamily: "BaiJamjuree_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },
  lockedBtn: { paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "transparent" },
  lockedBtnText: { fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "BaiJamjuree_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },

  emptyPhases: { padding: Space.xl, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, alignItems: "center" },
});
