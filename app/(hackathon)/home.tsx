// app/(hackathon)/home.tsx
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
} from "../../lib/hackathonProgram";
import {
  getPreviewHackathonProgramHome,
} from "../../lib/hackathonProgramPreview";
import { getProgramPhasesWithActivities } from "../../lib/hackathonPhaseActivity";
import { Radius, Space } from "../../lib/theme";
import type { HackathonProgramHome, HackathonProgramPhase } from "../../types/hackathon-program";
import type { HackathonPhaseWithActivities } from "../../types/hackathon-phase-activity";

const BG = "#010814";
const CYAN = "#00F0FF";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";
const WHITE10 = "rgba(255,255,255,0.1)";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const AMBER = "#F59E0B";

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

type PhaseCard = {
  phase: HackathonProgramPhase;
  activityTitles: string[];
  activityCount: number;
  isActive: boolean;
};

function PhaseCardView({
  card,
  onPress,
}: {
  card: PhaseCard;
  onPress: () => void;
}) {
  const dueDate = formatDate(card.phase.due_at ?? card.phase.ends_at);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="bold" style={styles.cardTitle}>
            {card.phase.title}
          </AppText>
          {card.phase.description ? (
            <AppText style={styles.cardDescription} numberOfLines={2}>
              {card.phase.description}
            </AppText>
          ) : null}
        </View>
        {dueDate ? (
          <AppText style={styles.cardDate}>{dueDate}</AppText>
        ) : null}
      </View>

      {/* Activity list */}
      {card.activityTitles.length > 0 ? (
        <View style={styles.activityList}>
          {card.activityTitles.map((title, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={styles.activityDot} />
              <AppText style={styles.activityTitle} numberOfLines={1}>
                {title}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.activityList}>
          <AppText style={{ color: WHITE40, fontSize: 12 }}>
            Activities coming soon
          </AppText>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <AppText style={styles.activityCount}>
          {card.activityCount} {card.activityCount === 1 ? "activity" : "activities"}
        </AppText>
        <AppText style={styles.tapHint}>Tap to open →</AppText>
      </View>
    </Pressable>
  );
}

export default function HackathonHomeScreen() {
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
        // Preview mode — use hardcoded preview data
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
            isActive: phase.id === previewHome.enrollment?.current_phase_id,
          }))
        );
      } else {
        setData(home);
        setIsPreview(false);
        const phasesWithActivities = await getProgramPhasesWithActivities(home.program.id);
        const currentPhaseId = home.enrollment?.current_phase_id;

        // Merge phases from home (ordering) with activity data
        const cards: PhaseCard[] = home.phases.map((phase) => {
          const phaseData = phasesWithActivities.find((p) => p.id === phase.id);
          const activities = phaseData?.activities ?? [];
          return {
            phase,
            activityTitles: activities.map((a) => a.title),
            activityCount: activities.length,
            isActive: phase.id === currentPhaseId,
          };
        });
        setPhaseCards(cards);

        // Scroll to current phase
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
          {data.program?.title ?? "Epic Sprint"}
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

      {/* Phase carousel */}
      {phaseCards.length > 0 ? (
        <View style={styles.carouselSection}>
          <View style={styles.carouselRow}>
            {/* Left chevron */}
            <Pressable
              onPress={() => scrollTo(activeIndex - 1)}
              style={styles.chevron}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              disabled={activeIndex === 0}
            >
              <AppText style={[styles.chevronText, activeIndex === 0 && { opacity: 0.2 }]}>
                ‹
              </AppText>
            </Pressable>

            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              style={{ flex: 1 }}
              contentContainerStyle={styles.cardsContent}
            >
              {phaseCards.map((card, i) => (
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
                <AppText
                  style={[
                    styles.chevronText,
                    activeIndex === phaseCards.length - 1 && { opacity: 0.2 },
                  ]}
                >
                  ›
                </AppText>
              </Pressable>
              {activeIndex < phaseCards.length - 1 && (
                <View style={styles.peek} />
              )}
            </View>
          </View>

          {/* Dot indicators */}
          <View style={styles.dots}>
            {phaseCards.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyModules}>
          <AppText style={{ color: WHITE40 }}>No phases available yet.</AppText>
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
    height: 200,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardsContent: { gap: CARD_GAP },
  // Phase card
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
  cardTitle: { fontSize: 17, color: WHITE },
  cardDescription: { fontSize: 12, color: WHITE40, marginTop: 3, lineHeight: 17 },
  cardDate: { fontSize: 11, color: WHITE40 },
  // Activity list
  activityList: { gap: Space.sm },
  activityRow: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: CYAN,
    opacity: 0.6,
  },
  activityTitle: { fontSize: 13, color: WHITE75, flex: 1 },
  // Footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: WHITE10,
    paddingTop: Space.sm,
  },
  activityCount: { fontSize: 11, color: WHITE40 },
  tapHint: { fontSize: 11, color: CYAN },
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
