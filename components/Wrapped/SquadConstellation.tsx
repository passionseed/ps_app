import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { ArchetypeResult } from "../../lib/wrapped/archetypes";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";
const { width: SCREEN_W } = Dimensions.get("window");

// Archetype accent colors for constellation nodes
const archetypeColors: Record<string, string> = {
  "the-empath": "#F472B6",
  "the-advocate": "#4ADE80",
  "the-interrogator": "#60A5FA",
  "the-mythbuster": "#FB923C",
  "the-architect": "#A78BFA",
  "the-synthesizer": "#2DD4BF",
  "the-auditor": "#94A3B8",
  "the-pivot-forcer": "#F87171",
  wanderer: "#D1D5DB",
};

export interface ConstellationTeammate {
  participantId: string;
  name: string;
  archetypeId: string;
  archetypeDisplay?: { en: string; th: string };
  phase1Title: string;
  /** MM axis score (-1 to +1), used for x-position */
  mm: number;
  /** SB axis score (-1 to +1), used for y-position */
  sb: number;
}

export interface SquadConstellationProps {
  /** The current user's archetype result */
  userArchetype: ArchetypeResult;
  /** The current user's phase1 title */
  userPhase1Title: string;
  /** The current user's MM/SB scores for positioning */
  userScores: { mm: number; sb: number };
  /** Teammates who have completed Wrapped */
  teammates: ConstellationTeammate[];
  /** Total squad size, including the current user and members not yet finished. */
  totalSquadSize: number;
  onNext: () => void;
}

/**
 * Compute a dynamic headline based on the team's spread across quadrants.
 * Only uses finished teammates (including user) for computation.
 */
function computeHeadline(
  allNodes: Array<{ mm: number; sb: number }>,
  totalSquadSize: number
): { en: string; th: string } {
  if (allNodes.length === 0) {
    return {
      en: "Your squad is forming...",
      th: "ทีมของคุณกำลังรวมตัว...",
    };
  }

  // Solo explorer: only 1 person in the squad
  if (totalSquadSize <= 1) {
    return {
      en: "Solo Explorer — your constellation is a single bright star.",
      th: "นักสำรวจเดี่ยว — กลุ่มดาวของคุณคือดวงดาวสว่างเพียงดวงเดียว",
    };
  }

  const avgMM = allNodes.reduce((s, n) => s + n.mm, 0) / allNodes.length;
  const avgSB = allNodes.reduce((s, n) => s + n.sb, 0) / allNodes.length;

  // Count how many nodes are in each quadrant
  const q1 = allNodes.filter((n) => n.mm >= 0 && n.sb >= 0).length; // MM+, SB+
  const q2 = allNodes.filter((n) => n.mm < 0 && n.sb >= 0).length; // MM-, SB+
  const q3 = allNodes.filter((n) => n.mm < 0 && n.sb < 0).length; // MM-, SB-
  const q4 = allNodes.filter((n) => n.mm >= 0 && n.sb < 0).length; // MM+, SB-

  const maxInQuadrant = Math.max(q1, q2, q3, q4);
  const spread = [q1, q2, q3, q4].filter((c) => c > 0).length;

  // High SQ variance: check if we have both strong solo and strong squad
  // (not directly available from MM/SB, so we use spread as proxy)

  // Cluster on +MM/+SB → Believer Squad
  if (maxInQuadrant === q1 && q1 >= allNodes.length * 0.6) {
    return {
      en: "Believer Squad — your blindspot is the human voice.",
      th: "Believer Squad — จุดอ่อนของคุณคือเสียงของมนุษย์",
    };
  }

  // Cluster on -MM → People Squad
  if ((q2 + q3) >= allNodes.length * 0.6) {
    return {
      en: "People Squad — appoint a system-keeper for Phase 2.",
      th: "People Squad — แต่งตั้งคนเก็บระบบสำหรับ Phase 2",
    };
  }

  // Even spread across quadrants → Full-Spectrum Squad
  if (spread >= 3 && maxInQuadrant <= allNodes.length * 0.5) {
    return {
      en: "Full-Spectrum Squad — slowest to agree, hardest to beat.",
      th: "Full-Spectrum Squad — ตกลงยากที่สุด แต่เอาชนะยากที่สุด",
    };
  }

  // High variance / mixed → Mixed Solo-Squad
  if (spread >= 3) {
    return {
      en: "Mixed Solo/Squad — protect quiet hours and shared rituals.",
      th: "Mixed Solo/Squad — ปกป้องชั่วโมงเงียบและพิธีกรรมร่วมกัน",
    };
  }

  // Default
  return {
    en: "Your squad is taking shape.",
    th: "ทีมของคุณกำลังมีรูปร่าง",
  };
}

export function SquadConstellation({
  userArchetype,
  userPhase1Title,
  userScores,
  teammates,
  totalSquadSize,
  onNext,
}: SquadConstellationProps) {
  const finishedCount = teammates.length + 1; // +1 for user
  const squadSize = Math.max(totalSquadSize, finishedCount, 1);
  const remainingCount = Math.max(squadSize - finishedCount, 0);
  const completionPct = finishedCount / squadSize;
  const arrivedCopy =
    squadSize <= 1
      ? "Solo Explorer"
      : finishedCount === 1
      ? "You're the first one here"
      : `${finishedCount} of ${squadSize} squad members are here`;
  const waitingCopy =
    squadSize <= 1
      ? "You're flying solo this hackathon. Your constellation is a single bright star."
      : remainingCount > 0
      ? `This count includes you. ${remainingCount} teammate${remainingCount > 1 ? "s" : ""} still ${remainingCount > 1 ? "need" : "needs"} to finish Wrapped.`
      : "This count includes you. Your squad constellation is ready.";

  // Build full node list including user
  const allNodes = useMemo(() => {
    const userNode: ConstellationTeammate = {
      participantId: "__user__",
      name: "You",
      archetypeId: userArchetype.id,
      archetypeDisplay: userArchetype.display,
      phase1Title: userPhase1Title || userArchetype.display.en,
      mm: userScores.mm,
      sb: userScores.sb,
    };
    return [userNode, ...teammates];
  }, [userArchetype, userPhase1Title, userScores, teammates]);

  const headline = useMemo(() => computeHeadline(allNodes, totalSquadSize), [allNodes, totalSquadSize]);

  // Position nodes on a 2D plane: MM → x, SB → y
  // Map [-1, 1] to padding...width-padding and padding...height-padding
  const PADDING = 48;
  const CANVAS_W = SCREEN_W - Space.xl * 2;
  const CANVAS_H = 280;

  const positionedNodes = useMemo(() => {
    return allNodes.map((node) => {
      const x = PADDING + ((node.mm + 1) / 2) * (CANVAS_W - PADDING * 2);
      const y = PADDING + ((1 - (node.sb + 1) / 2)) * (CANVAS_H - PADDING * 2); // invert y so +SB is top
      return { ...node, x, y };
    });
  }, [allNodes]);

  // Degraded state: <50% finished
  if (completionPct < 0.5) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Animated.View entering={FadeInUp.duration(500).delay(100)}>
            <AppText style={styles.label}>Squad Constellation</AppText>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(200)}>
            <AppText style={styles.placeholderTitle}>
              {arrivedCopy}
            </AppText>
            <AppText style={styles.placeholderSub}>
              {waitingCopy}
            </AppText>
          </Animated.View>

          {/* Show placeholder slots */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(300)}
            style={styles.placeholderGrid}
          >
            {Array.from({ length: squadSize }).map((_, i) => {
              const isFilled = i < finishedCount;
              const isUser = i === 0;
              return (
                <View
                  key={i}
                  style={[
                    styles.placeholderSlot,
                    isFilled && styles.placeholderSlotFilled,
                    isUser && styles.placeholderSlotUser,
                  ]}
                >
                  <AppText style={styles.placeholderSlotText}>
                    {isUser ? "You" : isFilled ? "✨" : "?"}
                  </AppText>
                </View>
              );
            })}
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <Pressable style={styles.ctaButton} onPress={onNext}>
              <AppText variant="bold" style={styles.ctaText}>
                Continue →
              </AppText>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    );
  }

  // Provisional or complete constellation

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.card}>
        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <AppText style={styles.label}>Squad Constellation</AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <AppText variant="bold" style={styles.headline}>
            {headline.en}
          </AppText>
          <AppText style={styles.headlineTh}>{headline.th}</AppText>
        </Animated.View>

        {/* Constellation canvas */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(300)}
          style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }]}
        >
          {/* Axis lines */}
          <View style={[styles.axisLineV, { left: CANVAS_W / 2 }]} />
          <View style={[styles.axisLineH, { top: CANVAS_H / 2 }]} />

          {/* Axis labels */}
          <AppText style={[styles.axisLabel, { top: 4, left: CANVAS_W / 2 + 4 }]}>
            Believer ↑
          </AppText>
          <AppText style={[styles.axisLabel, { bottom: 4, left: CANVAS_W / 2 + 4 }]}>
            Skeptic ↓
          </AppText>
          <AppText style={[styles.axisLabel, { top: CANVAS_H / 2 + 4, left: 4 }]}>
            Micro ←
          </AppText>
          <AppText style={[styles.axisLabel, { top: CANVAS_H / 2 + 4, right: 4 }]}>
            → Macro
          </AppText>

          {/* Nodes */}
          {positionedNodes.map((node) => {
            const color = archetypeColors[node.archetypeId] ?? PURPLE;
            const isUser = node.participantId === "__user__";
            return (
              <View
                key={node.participantId}
                style={[
                  styles.node,
                  {
                    left: node.x - 28,
                    top: node.y - 28,
                    borderColor: color,
                    backgroundColor: `${color}22`,
                    shadowColor: color,
                  },
                  isUser && styles.nodeUser,
                ]}
              >
                <AppText
                  style={[styles.nodeTitle, { color }]}
                  numberOfLines={1}
                >
                  {node.phase1Title}
                </AppText>
                <AppText style={styles.nodeArchetype} numberOfLines={1}>
                  {node.archetypeDisplay?.en ?? node.archetypeId}
                </AppText>
                {isUser && (
                  <View style={[styles.userBadge, { backgroundColor: color }]}>
                    <AppText style={styles.userBadgeText}>You</AppText>
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>

        {remainingCount > 0 && (
          <Animated.View entering={FadeInUp.duration(500).delay(350)}>
            <AppText style={styles.remainingNote}>
              {finishedCount} of {squadSize} squad members mapped, including you.
              {" "}
              {remainingCount} teammate{remainingCount > 1 ? "s" : ""} still finishing Wrapped.
            </AppText>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.duration(500).delay(400)}>
          <Pressable style={styles.ctaButton} onPress={onNext}>
            <AppText variant="bold" style={styles.ctaText}>
              Share Your Archetype →
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    paddingBottom: Space["3xl"],
  },
  card: {
    gap: Space.lg,
    alignItems: "center",
    width: "100%",
  },
  label: {
    fontSize: 12,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  headline: {
    fontSize: 18,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 26,
    paddingHorizontal: Space.lg,
  },
  headlineTh: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
  },
  canvas: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.2)",
    position: "relative",
    overflow: "hidden",
    marginTop: Space.md,
  },
  axisLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  axisLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  axisLabel: {
    position: "absolute",
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  node: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  nodeUser: {
    borderWidth: 2.5,
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  nodeTitle: {
    fontSize: 8,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  nodeArchetype: {
    fontSize: 7,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
    marginTop: 2,
  },
  userBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  userBadgeText: {
    fontSize: 8,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  remainingNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
  placeholderTitle: {
    fontSize: 18,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  placeholderSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
  },
  placeholderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Space.md,
    marginTop: Space.md,
    paddingHorizontal: Space.lg,
  },
  placeholderSlot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  placeholderSlotFilled: {
    borderColor: CYAN,
    borderStyle: "solid",
    backgroundColor: "rgba(145,196,227,0.08)",
  },
  placeholderSlotUser: {
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  placeholderSlotText: {
    fontSize: 13,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  ctaButton: {
    backgroundColor: PURPLE,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: Space.lg,
    shadowColor: PURPLE,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
