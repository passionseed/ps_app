import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { ArchetypeResult, AxisScores } from "../../lib/wrapped/archetypes";
import { phase2Hints } from "../../lib/wrapped/phase2Hints";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";

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

interface ArchetypeRevealProps {
  archetype: ArchetypeResult;
  scores?: AxisScores | null;
  onComplete: () => void;
}

export function ArchetypeReveal({ archetype, scores, onComplete }: ArchetypeRevealProps) {
  const [phase, setPhase] = useState(0); // 0 = processing, 1 = reveal
  const nameOpacity = useSharedValue(0);
  const captionOpacity = useSharedValue(0);
  const bgWarmth = useSharedValue(0);

  // Archetype accent color
  const accentColor = useMemo(() => {
    switch (archetype.id) {
      case "the-empath": return "#F472B6";
      case "the-advocate": return "#4ADE80";
      case "the-interrogator": return "#60A5FA";
      case "the-mythbuster": return "#FB923C";
      case "the-architect": return "#A78BFA";
      case "the-synthesizer": return "#2DD4BF";
      case "the-auditor": return "#94A3B8";
      case "the-pivot-forcer": return "#F87171";
      case "wanderer": return "#D1D5DB";
      default: return CYAN;
    }
  }, [archetype.id]);

  // Determine SQ Dynamic based on SQ axis sign
  const sqDynamic = useMemo(() => {
    if (!archetype.sqDynamic) return null;
    if (!scores) return null;
    const sqSign = scores.sq >= 0 ? "squad" : "solo";
    return archetype.sqDynamic[sqSign];
  }, [archetype.sqDynamic, scores]);

  const explanation = archetype.persona ?? archetype.caption;
  const hint = phase2Hints[archetype.id];
  const axisRead = useMemo(() => getAxisRead(scores), [scores]);
  const archetypeImage = archetypeImages[archetype.id];

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setPhase(1);
      nameOpacity.value = withTiming(1, { duration: 450 });
      captionOpacity.value = withTiming(1, { duration: 550 });
      bgWarmth.value = withTiming(1, { duration: 900 });
    }, 700);

    return () => {
      clearTimeout(timer1);
    };
  }, [archetype, nameOpacity, captionOpacity, bgWarmth]);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(${Math.round(parseInt(accentColor.slice(1, 3), 16) * bgWarmth.value * 0.15)}, ${Math.round(parseInt(accentColor.slice(3, 5), 16) * bgWarmth.value * 0.15)}, ${Math.round(parseInt(accentColor.slice(5, 7), 16) * bgWarmth.value * 0.15)}, ${0.02 + bgWarmth.value * 0.03})`,
  }));

  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
  }));

  const captionStyle = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
  }));

  return (
    <Animated.View style={[styles.card, containerStyle]}>
      {/* Processing state */}
      {phase === 0 && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.processingContainer}>
          <AppText style={styles.processingEmoji}>✨</AppText>
          <AppText style={styles.processingText}>Analyzing your responses...</AppText>
          <View style={styles.processingDots}>
            <Animated.View
              entering={FadeIn.duration(300).delay(0)}
              style={styles.dot}
            />
            <Animated.View
              entering={FadeIn.duration(300).delay(200)}
              style={styles.dot}
            />
            <Animated.View
              entering={FadeIn.duration(300).delay(400)}
              style={styles.dot}
            />
          </View>
        </Animated.View>
      )}
      {phase === 1 && (
        <ScrollView
          style={styles.revealScroll}
          contentContainerStyle={styles.revealContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.portraitFrame,
              nameStyle,
              { borderColor: `${accentColor}66`, shadowColor: accentColor },
            ]}
          >
            <Image
              source={archetypeImage}
              style={styles.portrait}
              contentFit="cover"
              transition={250}
            />
            <View style={styles.portraitShade} />
          </Animated.View>

          <Animated.View style={[styles.nameContainer, nameStyle]}>
            <AppText style={styles.revealLabel}>You are</AppText>
            <AppText variant="bold" style={[styles.revealName, { textShadowColor: accentColor }]}>
              {archetype.display.en}
            </AppText>
            <AppText style={styles.revealNameTh}>{archetype.display.th}</AppText>
          </Animated.View>

          {explanation && (
            <Animated.View style={[styles.explanationCard, captionStyle]}>
              <AppText style={styles.explanationLabel}>What this means</AppText>
              <AppText style={styles.revealCaption}>{explanation.en}</AppText>
              <AppText style={styles.revealCaptionTh}>{explanation.th}</AppText>
            </Animated.View>
          )}

          {axisRead && (
            <Animated.View style={[styles.explanationCard, captionStyle]}>
              <AppText style={styles.explanationLabel}>Why you got this</AppText>
              <AppText style={styles.revealCaption}>{axisRead.summary.en}</AppText>
              <AppText style={styles.revealCaptionTh}>{axisRead.summary.th}</AppText>
              <View style={styles.axisGrid}>
                {axisRead.axes.map((axis) => (
                  <View key={axis.key} style={styles.axisPill}>
                    <AppText variant="bold" style={styles.axisLabel}>{axis.key}</AppText>
                    <AppText style={styles.axisValue}>{axis.en}</AppText>
                    <AppText style={styles.axisValueTh}>{axis.th}</AppText>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {sqDynamic && scores && (
            <Animated.View style={[styles.explanationCard, captionStyle]}>
              <AppText style={styles.explanationLabel}>
                {scores.sq >= 0 ? "Squad Mode" : "Solo Mode"}
              </AppText>
              <AppText style={styles.revealCaption}>{sqDynamic.en}</AppText>
              <AppText style={styles.revealCaptionTh}>{sqDynamic.th}</AppText>
            </Animated.View>
          )}

          {hint && (
            <Animated.View style={[styles.explanationCard, captionStyle]}>
              <AppText style={styles.explanationLabel}>Phase 2 edge</AppText>
              <AppText style={styles.revealCaption}>{hint.superpower.en}</AppText>
              <AppText style={styles.revealCaption}>{hint.growthEdge.en}</AppText>
              <AppText style={styles.revealCaptionTh}>
                {hint.superpower.th} {hint.growthEdge.th}
              </AppText>
            </Animated.View>
          )}

          <Animated.View entering={FadeIn.duration(350).delay(250)} style={styles.footer}>
            <Pressable style={styles.ctaButton} onPress={onComplete}>
              <AppText variant="bold" style={styles.ctaText}>
                Continue →
              </AppText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      )}
    </Animated.View>
  );
}

function getAxisRead(scores?: AxisScores | null) {
  if (!scores) return null;

  const axes = [
    describeAxis("MM", scores.mm, "Human stories", "System map", "เรื่องของคน", "ภาพรวมระบบ"),
    describeAxis("SB", scores.sb, "Skeptic", "Believer", "นักสงสัย", "ผู้เชื่อมั่น"),
    describeAxis("PR", scores.pr, "Patient", "Restless", "ใจเย็น", "อยากขยับเร็ว"),
    describeAxis("SQ", scores.sq, "Solo", "Squad", "ทำคนเดียว", "ทำกับทีม"),
  ];
  const strong = axes.filter((axis) => axis.strength !== "neutral");

  if (strong.length === 0) {
    return {
      summary: {
        en: "Your answers stayed close to the middle across the four signals. That is why this read is exploratory: you did not lock into one obvious Phase 1 shape yet.",
        th: "คำตอบของคุณอยู่ใกล้กึ่งกลางในทั้งสี่สัญญาณ เลยได้ผลลัพธ์แบบนักสำรวจ: คุณยังไม่ได้ล็อกเข้ารูปแบบเดียวชัดๆ ใน Phase 1",
      },
      axes,
    };
  }

  return {
    summary: {
      en: `Your strongest signals leaned ${strong.map((axis) => axis.en).join(", ")}. This archetype is the closest match to that response pattern.`,
      th: `สัญญาณที่ชัดที่สุดของคุณเอนไปทาง ${strong.map((axis) => axis.th).join(", ")} อาร์คีไทป์นี้จึงใกล้กับรูปแบบคำตอบของคุณที่สุด`,
    },
    axes,
  };
}

function describeAxis(
  key: string,
  value: number,
  negativeEn: string,
  positiveEn: string,
  negativeTh: string,
  positiveTh: string,
) {
  const abs = Math.abs(value);
  const strength = abs < 0.25 ? "neutral" : abs < 0.55 ? "soft" : "strong";
  const en = strength === "neutral" ? "Balanced" : value > 0 ? positiveEn : negativeEn;
  const th = strength === "neutral" ? "สมดุล" : value > 0 ? positiveTh : negativeTh;

  return { key, en, th, strength };
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    flex: 1,
    position: "relative",
  },
  processingContainer: {
    alignItems: "center",
    zIndex: 2,
  },
  processingEmoji: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: Space.lg,
  },
  processingText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_400Regular",
  },
  processingDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Space.sm,
    marginTop: Space.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYAN,
    opacity: 0.6,
  },
  nameContainer: {
    alignItems: "center",
    zIndex: 2,
    marginBottom: Space.md,
  },
  portraitFrame: {
    width: "82%",
    aspectRatio: 1,
    maxWidth: 284,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: Space.xl,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  portrait: {
    width: "100%",
    height: "100%",
  },
  portraitShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "34%",
    backgroundColor: "rgba(3,5,10,0.24)",
  },
  revealLabel: {
    fontSize: 14,
    color: CYAN,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: Space.sm,
  },
  revealName: {
    fontSize: 38,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 46,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  revealNameTh: {
    fontSize: 22,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    marginTop: Space.xs,
  },
  revealScroll: {
    width: "100%",
    flex: 1,
    zIndex: 2,
  },
  revealContent: {
    alignItems: "center",
    paddingVertical: Space.lg,
    gap: Space.md,
  },
  explanationCard: {
    width: "100%",
    zIndex: 2,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.16)",
  },
  explanationLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
    marginBottom: Space.sm,
  },
  revealCaption: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "left",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: Space.sm,
  },
  revealCaptionTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "left",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: Space.sm,
  },
  axisGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    marginTop: Space.md,
  },
  axisPill: {
    width: "48%",
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: "rgba(145,196,227,0.09)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.16)",
    padding: Space.sm,
  },
  axisLabel: {
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  axisValue: {
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 12,
    marginTop: 4,
  },
  axisValueTh: {
    color: "rgba(255,255,255,0.48)",
    fontFamily: "BaiJamjuree_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    zIndex: 2,
    alignItems: "center",
    paddingBottom: Space.lg,
  },
  ctaButton: {
    backgroundColor: CYAN,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: Space.md,
    shadowColor: CYAN,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    color: "#03050a",
    fontFamily: "BaiJamjuree_700Bold",
  },
});
