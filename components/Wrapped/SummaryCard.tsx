import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Share,
  ScrollView,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { ArchetypeResult, AxisScores, ArchetypeFit } from "../../lib/wrapped/archetypes";
import { axes } from "../../lib/wrapped/archetypes";
import { phase2Hints } from "../../lib/wrapped/phase2Hints";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";

interface SummaryCardProps {
  archetype: ArchetypeResult;
  secondaryArchetype?: ArchetypeResult | null;
  scores: AxisScores;
  phase1Title?: string;
  archetypeFit?: ArchetypeFit | null;
  onDone: () => void;
}

export function SummaryCard({
  archetype,
  secondaryArchetype,
  scores,
  phase1Title,
  archetypeFit,
  onDone,
}: SummaryCardProps) {
  const hints = phase2Hints[archetype.id];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My PassionSeed Hackathon archetype is ${archetype.display.en} (${archetype.display.th})! ${archetype.caption.en}`,
      });
    } catch {
      // ignore
    }
  };

  const axisEntries = [
    { key: "mm", label: "MM", name: "Micro / Macro", score: scores.mm },
    { key: "sb", label: "SB", name: "Skeptic / Believer", score: scores.sb },
    { key: "pr", label: "PR", name: "Patient / Restless", score: scores.pr },
    { key: "sq", label: "SQ", name: "Solo / Squad", score: scores.sq },
  ];

  // Determine SQ Dynamic based on SQ axis sign
  const sqDynamic = React.useMemo(() => {
    if (!archetype.sqDynamic) return null;
    const sqSign = scores.sq >= 0 ? "squad" : "solo";
    return archetype.sqDynamic[sqSign];
  }, [archetype.sqDynamic, scores.sq]);

  return (
    <View style={styles.card}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <AppText style={styles.summaryLabel}>Your Archetype</AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <AppText variant="bold" style={styles.archetypeName}>
            {archetype.display.en}
          </AppText>
          <AppText style={styles.archetypeNameTh}>
            {archetype.display.th}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(300)}>
          <AppText style={styles.caption}>{archetype.caption.en}</AppText>
          <AppText style={styles.captionTh}>{archetype.caption.th}</AppText>
        </Animated.View>

        {/* Phase 1 Title */}
        {phase1Title && (
          <Animated.View entering={FadeInUp.duration(500).delay(350)} style={styles.titleSection}>
            <AppText style={styles.titleLabel}>Your Phase 1 Title</AppText>
            <AppText variant="bold" style={styles.titleText}>"{phase1Title}"</AppText>
          </Animated.View>
        )}

        {/* Persona */}
        {archetype.persona && (
          <Animated.View entering={FadeInUp.duration(500).delay(375)} style={styles.personaSection}>
            <AppText variant="bold" style={styles.personaTitle}>Persona</AppText>
            <AppText style={styles.personaText}>{archetype.persona.en}</AppText>
            <AppText style={styles.personaTextTh}>{archetype.persona.th}</AppText>
          </Animated.View>
        )}

        {/* SQ Dynamic */}
        {sqDynamic && (
          <Animated.View entering={FadeInUp.duration(500).delay(390)} style={styles.sqDynamicSection}>
            <AppText variant="bold" style={styles.sqDynamicTitle}>
              {scores.sq >= 0 ? "Squad Mode" : "Solo Mode"}
            </AppText>
            <AppText style={styles.sqDynamicText}>{sqDynamic.en}</AppText>
            <AppText style={styles.sqDynamicTextTh}>{sqDynamic.th}</AppText>
          </Animated.View>
        )}

        {/* Calibration Fit */}
        {archetypeFit && (
          <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.fitSection}>
            <AppText style={styles.fitLabel}>Archetype Fit</AppText>
            <AppText variant="bold" style={styles.fitValue}>
              {archetypeFit === "nailed"
                ? "🎯 Nailed it"
                : archetypeFit === "sort_of"
                ? "🤔 Sort of"
                : "❌ Not me"}
            </AppText>
            {archetypeFit === "not_me" && secondaryArchetype && (
              <>
                <AppText style={styles.fitSubtext}>
                  Alternative: {secondaryArchetype.display.en}
                </AppText>
                <AppText style={styles.fitSubtextTh}>
                  {secondaryArchetype.display.th}
                </AppText>
              </>
            )}
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInUp.duration(500).delay(420)}
          style={styles.axisSection}
        >
          <AppText variant="bold" style={styles.axisTitle}>
            Trait Breakdown
          </AppText>
          {axisEntries.map((axis) => (
            <AxisBar key={axis.key} axis={axis} />
          ))}
        </Animated.View>

        {hints && (
          <Animated.View
            entering={FadeInUp.duration(500).delay(440)}
            style={styles.hintsSection}
          >
            <AppText variant="bold" style={styles.hintsTitle}>
              Phase 2 Hints
            </AppText>
            <HintRow label="Superpower" text={hints.superpower.en} />
            <HintRow label="Growth Edge" text={hints.growthEdge.en} />
            <HintRow label="Superpower (TH)" text={hints.superpower.th} />
            <HintRow label="Growth Edge (TH)" text={hints.growthEdge.th} />
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInUp.duration(500).delay(600)}
          style={styles.actions}
        >
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <AppText variant="bold" style={styles.shareText}>
              Share →
            </AppText>
          </Pressable>
          <Pressable style={styles.doneButton} onPress={onDone}>
            <AppText variant="bold" style={styles.doneText}>
              Done
            </AppText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function AxisBar({
  axis,
}: {
  axis: { key: string; label: string; name: string; score: number };
}) {
  const pct = ((axis.score + 1) / 2) * 100;
  const isPositive = axis.score >= 0;

  return (
    <View style={styles.axisRow}>
      <View style={styles.axisHeader}>
        <AppText variant="bold" style={styles.axisLabel}>
          {axis.label}
        </AppText>
        <AppText style={styles.axisName}>{axis.name}</AppText>
        <AppText
          variant="bold"
          style={[
            styles.axisValue,
            isPositive ? styles.axisPositive : styles.axisNegative,
          ]}
        >
          {isPositive ? "+" : ""}
          {axis.score.toFixed(2)}
        </AppText>
      </View>
      <View style={styles.axisTrack}>
        <View
          style={[
            styles.axisFill,
            {
              width: `${pct}%`,
              backgroundColor: isPositive ? CYAN : PURPLE,
            },
          ]}
        />
      </View>
    </View>
  );
}

function HintRow({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.hintRow}>
      <AppText variant="bold" style={styles.hintLabel}>
        {label}
      </AppText>
      <AppText style={styles.hintText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    flex: 1,
  },
  scrollContent: {
    gap: Space.lg,
    paddingBottom: Space["3xl"],
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  archetypeName: {
    fontSize: 32,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 40,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  archetypeNameTh: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    marginTop: Space.xs,
  },
  caption: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
  },
  captionTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
  },
  axisSection: {
    width: "100%",
    gap: Space.md,
    marginTop: Space.md,
  },
  axisTitle: {
    fontSize: 14,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    marginBottom: Space.xs,
  },
  axisRow: {
    gap: Space.xs,
  },
  axisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  axisLabel: {
    fontSize: 12,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    width: 28,
  },
  axisName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    flex: 1,
  },
  axisValue: {
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
  },
  axisPositive: {
    color: CYAN,
  },
  axisNegative: {
    color: PURPLE,
  },
  axisTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  axisFill: {
    height: "100%",
    borderRadius: 3,
  },
  hintsSection: {
    width: "100%",
    gap: Space.sm,
    marginTop: Space.sm,
  },
  hintsTitle: {
    fontSize: 14,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    marginBottom: Space.xs,
  },
  hintRow: {
    backgroundColor: "rgba(26,37,48,0.8)",
    borderRadius: 12,
    padding: Space.md,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.15)",
  },
  hintLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  hintText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 20,
  },
  titleSection: {
    width: "100%",
    alignItems: "center",
    gap: Space.xs,
    marginTop: Space.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.2)",
  },
  titleLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  titleText: {
    fontSize: 18,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    fontStyle: "italic",
  },
  personaSection: {
    width: "100%",
    gap: Space.sm,
    marginTop: Space.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.15)",
  },
  personaTitle: {
    fontSize: 14,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  personaText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 20,
  },
  personaTextTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 20,
  },
  sqDynamicSection: {
    width: "100%",
    gap: Space.sm,
    marginTop: Space.sm,
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 16,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
  },
  sqDynamicTitle: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  sqDynamicText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 20,
  },
  sqDynamicTextTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 20,
  },
  fitSection: {
    width: "100%",
    alignItems: "center",
    gap: Space.xs,
    marginTop: Space.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.15)",
  },
  fitLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  fitValue: {
    fontSize: 18,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  fitSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  fitSubtextTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: Space.md,
    marginTop: Space.lg,
    width: "100%",
    justifyContent: "center",
  },
  shareButton: {
    backgroundColor: "rgba(145,196,227,0.15)",
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: CYAN,
    alignItems: "center",
    minWidth: 120,
  },
  shareText: {
    fontSize: 16,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  doneButton: {
    backgroundColor: PURPLE,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: PURPLE,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
    alignItems: "center",
    minWidth: 120,
  },
  doneText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
