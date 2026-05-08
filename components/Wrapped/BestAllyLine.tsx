import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import { getBestAlly } from "../../lib/wrapped/bestAlly";
import { archetypes } from "../../lib/wrapped/archetypes";
import type { ArchetypeResult } from "../../lib/wrapped/archetypes";

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

interface BestAllyLineProps {
  archetype: ArchetypeResult;
  onNext: () => void;
}

export function BestAllyLine({ archetype, onNext }: BestAllyLineProps) {
  const bestAlly = getBestAlly(archetype.id as any);
  const allyArchetype = archetypes.find((a) => a.id === bestAlly.allyArchetypeId);
  const allyImage = archetypeImages[bestAlly.allyArchetypeId];

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)}>
        <AppText style={styles.label}>Your Best Ally</AppText>
      </Animated.View>

      {allyImage && (
        <Animated.View entering={FadeInUp.duration(500).delay(150)} style={styles.portraitFrame}>
          <Image
            source={allyImage}
            style={styles.portrait}
            contentFit="cover"
            transition={250}
          />
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.duration(500).delay(200)}>
        <AppText variant="bold" style={styles.allyName}>
          {allyArchetype?.display.en ?? bestAlly.allyArchetypeId}
        </AppText>
        <AppText style={styles.allyNameTh}>
          {allyArchetype?.display.th ?? ""}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(300)}>
        <AppText style={styles.line}>{bestAlly.line.en}</AppText>
        <AppText style={styles.lineTh}>{bestAlly.line.th}</AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(400)}>
        <Pressable style={styles.ctaButton} onPress={onNext}>
          <AppText variant="bold" style={styles.ctaText}>
            See Your Squad →
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  allyName: {
    fontSize: 28,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 36,
    textShadowColor: PURPLE,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  allyNameTh: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    marginTop: Space.xs,
  },
  portraitFrame: {
    width: "70%",
    aspectRatio: 1,
    maxWidth: 240,
    borderRadius: 28,
    overflow: "hidden",
    marginVertical: Space.md,
    borderWidth: 1,
    borderColor: "rgba(157,129,172,0.35)",
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  portrait: {
    width: "100%",
    height: "100%",
  },
  line: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
  },
  lineTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
    marginTop: Space.xs,
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
