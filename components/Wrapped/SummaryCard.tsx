import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Share,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AppText } from "../AppText";
import { WrappedButton } from "./WrappedButton";
import { Space } from "../../lib/theme";
import type { ArchetypeResult, AxisScores, ArchetypeFit } from "../../lib/wrapped/archetypes";
import { axes } from "../../lib/wrapped/archetypes";
import { phase2Hints } from "../../lib/wrapped/phase2Hints";
import { getBestAlly } from "../../lib/wrapped/bestAlly";
import { archetypes } from "../../lib/wrapped/archetypes";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";

const archetypeImages: Record<string, number> = {
  "the-advocate": require("../../assets/wrapped/archetypes/the-advocate.jpg"),
  "the-architect": require("../../assets/wrapped/archetypes/the-architect.jpg"),
  "the-auditor": require("../../assets/wrapped/archetypes/the-auditor.jpg"),
  "the-empath": require("../../assets/wrapped/archetypes/the-empath.jpg"),
  "the-interrogator": require("../../assets/wrapped/archetypes/the-interrogator.jpg"),
  "the-mythbuster": require("../../assets/wrapped/archetypes/the-mythbuster.jpg"),
  "the-pivot-forcer": require("../../assets/wrapped/archetypes/the-pivot-forcer.jpg"),
  "the-synthesizer": require("../../assets/wrapped/archetypes/the-synthesizer.jpg"),
  wanderer: require("../../assets/wrapped/archetypes/wanderer.jpg"),
};

interface SummaryCardProps {
  archetype: ArchetypeResult;
  secondaryArchetype?: ArchetypeResult | null;
  scores: AxisScores;
  phase1Title?: string;
  archetypeFit?: ArchetypeFit | null;
  phase2Surprise?: string;
  onDone: () => void;
}

export function SummaryCard({
  archetype,
  secondaryArchetype,
  scores,
  phase1Title,
  archetypeFit,
  phase2Surprise,
  onDone,
}: SummaryCardProps) {
  const hints = phase2Hints[archetype.id];

  const bestAlly = getBestAlly(archetype.id as any);
  const allyArchetype = archetypes.find((a) => a.id === bestAlly.allyArchetypeId);
  const archetypeImage = archetypeImages[archetype.id];
  const allyImage = archetypeImages[bestAlly.allyArchetypeId];

  const handleShare = async () => {
    try {
      const shareMessage = [
        `My PassionSeed Hackathon archetype is ${archetype.display.en} (${archetype.display.th})!`,
        phase1Title ? `\n"${phase1Title}"` : "",
        `\nBest ally: ${allyArchetype?.display.en ?? bestAlly.allyArchetypeId}`,
        `\n${bestAlly.line.en}`,
      ].join("");
      await Share.share({
        message: shareMessage,
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
        {/* Hero: Archetype Image + Name */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.heroSection}>
          {archetypeImage && (
            <View style={styles.portraitFrame}>
              <Image
                source={archetypeImage}
                style={styles.portrait}
                contentFit="cover"
                transition={250}
              />
            </View>
          )}
          <AppText style={styles.summaryLabel}>Your Archetype</AppText>
          <AppText variant="bold" style={styles.archetypeName}>
            {archetype.display.en}
          </AppText>
          <AppText style={styles.archetypeNameTh}>
            {archetype.display.th}
          </AppText>
          <AppText style={styles.caption}>{archetype.caption.en}</AppText>
          <AppText style={styles.captionTh}>{archetype.caption.th}</AppText>
        </Animated.View>

        {/* Phase 1 Title */}
        {phase1Title && (
          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.titleSection}>
            <AppText style={styles.titleLabel}>Your Phase 1 Title</AppText>
            <AppText variant="bold" style={styles.titleText}>"{phase1Title}"</AppText>
          </Animated.View>
        )}

        {/* Phase 2 Surprise */}
        {phase2Surprise && (
          <Animated.View entering={FadeInUp.duration(500).delay(225)} style={styles.titleSection}>
            <AppText style={styles.titleLabel}>Phase 2 Biggest Surprise</AppText>
            <AppText variant="bold" style={styles.titleText}>"{phase2Surprise}"</AppText>
          </Animated.View>
        )}

        {/* Persona */}
        {archetype.persona && (
          <Animated.View entering={FadeInUp.duration(500).delay(250)} style={styles.personaSection}>
            <AppText variant="bold" style={styles.personaTitle}>Persona</AppText>
            <AppText style={styles.personaText}>{archetype.persona.en}</AppText>
            <AppText style={styles.personaTextTh}>{archetype.persona.th}</AppText>
          </Animated.View>
        )}

        {/* SQ Dynamic */}
        {sqDynamic && (
          <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.sqDynamicSection}>
            <AppText variant="bold" style={styles.sqDynamicTitle}>
              {scores.sq >= 0 ? "Squad Mode" : "Solo Mode"}
            </AppText>
            <AppText style={styles.sqDynamicText}>{sqDynamic.en}</AppText>
            <AppText style={styles.sqDynamicTextTh}>{sqDynamic.th}</AppText>
          </Animated.View>
        )}

        {/* Best Ally */}
        <Animated.View entering={FadeInUp.duration(500).delay(350)} style={styles.allySection}>
          <AppText style={styles.allyLabel}>Best Ally</AppText>
          {allyImage && (
            <View style={styles.allyPortraitFrame}>
              <Image
                source={allyImage}
                style={styles.allyPortrait}
                contentFit="cover"
                transition={250}
              />
            </View>
          )}
          <AppText variant="bold" style={styles.allyName}>
            {allyArchetype?.display.en ?? bestAlly.allyArchetypeId}
          </AppText>
          <AppText style={styles.allyNameTh}>
            {allyArchetype?.display.th ?? ""}
          </AppText>
          <AppText style={styles.allyLine}>{bestAlly.line.en}</AppText>
          <AppText style={styles.allyLineTh}>{bestAlly.line.th}</AppText>
        </Animated.View>

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

        {/* Trait Breakdown */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(450)}
          style={styles.axisSection}
        >
          <AppText variant="bold" style={styles.axisTitle}>
            Trait Breakdown
          </AppText>
          {axisEntries.map((axis) => (
            <AxisBar key={axis.key} axis={axis} />
          ))}
        </Animated.View>

        {/* Phase 2 Hints */}
        {hints && (
          <Animated.View
            entering={FadeInUp.duration(500).delay(500)}
            style={styles.hintsSection}
          >
            <AppText variant="bold" style={styles.hintsTitle}>
              Phase 2 Hints
            </AppText>
            <View style={styles.hintCards}>
              <View style={styles.hintCard}>
                <AppText variant="bold" style={styles.hintCardLabel}>Superpower</AppText>
                <AppText style={styles.hintCardText}>{hints.superpower.en}</AppText>
                <AppText style={styles.hintCardTextTh}>{hints.superpower.th}</AppText>
              </View>
              <View style={styles.hintCard}>
                <AppText variant="bold" style={styles.hintCardLabel}>Growth Edge</AppText>
                <AppText style={styles.hintCardText}>{hints.growthEdge.en}</AppText>
                <AppText style={styles.hintCardTextTh}>{hints.growthEdge.th}</AppText>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(600)}
          style={styles.actions}
        >
          <WrappedButton onPress={handleShare} style={{ minWidth: 140 }}>
            Share →
          </WrappedButton>
          <Pressable style={styles.doneLinkButton} onPress={onDone}>
            <AppText style={styles.doneLinkText}>Done</AppText>
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
  heroSection: {
    alignItems: "center",
    gap: Space.md,
    width: "100%",
  },
  portraitFrame: {
    width: "72%",
    aspectRatio: 1,
    maxWidth: 260,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowColor: CYAN,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  portrait: {
    width: "100%",
    height: "100%",
  },
  summaryLabel: {
    fontSize: 12,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
    marginTop: Space.sm,
  },
  archetypeName: {
    fontSize: 34,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 42,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  archetypeNameTh: {
    fontSize: 20,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  caption: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
    marginTop: Space.xs,
  },
  captionTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
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
    color: "rgba(255,255,255,0.55)",
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
  hintCards: {
    gap: Space.sm,
  },
  hintCard: {
    backgroundColor: "rgba(26,37,48,0.8)",
    borderRadius: 16,
    padding: Space.lg,
    gap: Space.xs,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.15)",
  },
  hintCardLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  hintCardText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 20,
  },
  hintCardTextTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 20,
  },
  titleSection: {
    width: "100%",
    alignItems: "center",
    gap: Space.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
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
    fontSize: 20,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    fontStyle: "italic",
    lineHeight: 28,
  },
  personaSection: {
    width: "100%",
    gap: Space.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
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
    color: "rgba(255,255,255,0.75)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 22,
  },
  personaTextTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 22,
  },
  sqDynamicSection: {
    width: "100%",
    gap: Space.sm,
    backgroundColor: "rgba(145,196,227,0.06)",
    borderRadius: 20,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.25)",
  },
  sqDynamicTitle: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  sqDynamicText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 22,
  },
  sqDynamicTextTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 22,
  },
  fitSection: {
    width: "100%",
    alignItems: "center",
    gap: Space.xs,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
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
    fontSize: 20,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  fitSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  fitSubtextTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  allySection: {
    width: "100%",
    gap: Space.sm,
    backgroundColor: "rgba(157,129,172,0.06)",
    borderRadius: 20,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(157,129,172,0.25)",
    alignItems: "center",
  },
  allyLabel: {
    fontSize: 11,
    color: PURPLE,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  allyPortraitFrame: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(157,129,172,0.4)",
    marginVertical: Space.sm,
  },
  allyPortrait: {
    width: "100%",
    height: "100%",
  },
  allyName: {
    fontSize: 18,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  allyNameTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  allyLine: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginTop: Space.xs,
  },
  allyLineTh: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: Space.md,
    marginTop: Space.lg,
    width: "100%",
    justifyContent: "center",
  },
  doneLinkButton: {
    paddingVertical: Space.sm,
    alignItems: "center",
  },
  doneLinkText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
    textDecorationLine: "underline",
  },
});
