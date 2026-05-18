import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { ArchetypeResult } from "../../lib/wrapped/archetypes";
import { getBestAlly } from "../../lib/wrapped/bestAlly";
import { archetypes } from "../../lib/wrapped/archetypes";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";
const BG = "#03050a";

// Instagram Story aspect ratio: 9:16
// We design at 360 × 640 logical points.
// On a 3× device this becomes 1080 × 1920 px.
const STORY_WIDTH = 360;
const STORY_HEIGHT = 640;

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

interface WrappedShareCardProps {
  archetype: ArchetypeResult;
  phase1Title?: string;
}

export function WrappedShareCard({
  archetype,
  phase1Title,
}: WrappedShareCardProps) {
  const bestAlly = getBestAlly(archetype.id);
  const allyArchetype = archetypes.find((a) => a.id === bestAlly.allyArchetypeId);
  const archetypeImage = archetypeImages[archetype.id];
  const allyImage = archetypeImages[bestAlly.allyArchetypeId];

  return (
    <View style={styles.root} collapsable={false}>
      {/* Ambient glow behind portrait */}
      <View style={styles.glowContainer} pointerEvents="none" collapsable={false}>
        <LinearGradient
          colors={["rgba(145,196,227,0.12)", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glow}
        />
      </View>

      {/* Top branding — small, stays clear of IG status bar */}
      <View style={styles.header} collapsable={false}>
        <AppText style={styles.brandEmoji}>🌱</AppText>
        <AppText style={styles.brandText}>PassionSeed</AppText>
      </View>

      {/* Hero: Portrait */}
      {archetypeImage && (
        <View style={styles.portraitFrame} collapsable={false}>
          <Image
            source={archetypeImage}
            style={styles.portrait}
            contentFit="cover"
            transition={0}
          />
        </View>
      )}

      {/* Archetype Name */}
      <View style={styles.nameSection} collapsable={false}>
        <AppText style={styles.yourArchetypeLabel}>Your Archetype</AppText>
        <AppText style={styles.archetypeName}>{archetype.display.en}</AppText>
        <AppText style={styles.archetypeNameTh}>{archetype.display.th}</AppText>
      </View>

      {/* Caption — punchy one-liner, not the long persona */}
      <View style={styles.captionSection} collapsable={false}>
        <AppText style={styles.captionText} numberOfLines={3}>
          {archetype.caption.en}
        </AppText>
      </View>

      {/* Phase 1 Title — personal touch */}
      {phase1Title ? (
        <View style={styles.titleSection} collapsable={false}>
          <AppText style={styles.titleLabel}>Phase 1</AppText>
          <AppText style={styles.titleText} numberOfLines={2}>
            "{phase1Title}"
          </AppText>
        </View>
      ) : null}

      {/* Best Ally — compact, social hook */}
      <View style={styles.allySection} collapsable={false}>
        <AppText style={styles.allyLabel}>Best Ally</AppText>
        <View style={styles.allyRow} collapsable={false}>
          {allyImage && (
            <View style={styles.allyPortraitFrame} collapsable={false}>
              <Image
                source={allyImage}
                style={styles.allyPortrait}
                contentFit="cover"
                transition={0}
              />
            </View>
          )}
          <View style={styles.allyTextBlock} collapsable={false}>
            <AppText style={styles.allyName}>
              {allyArchetype?.display.en ?? bestAlly.allyArchetypeId}
            </AppText>
            <AppText style={styles.allyLine} numberOfLines={2}>
              {bestAlly.line.en}
            </AppText>
          </View>
        </View>
      </View>

      {/* Footer — stays clear of IG message bar */}
      <View style={styles.footer} collapsable={false}>
        <AppText style={styles.footerText}>Hackathon Wrapped</AppText>
        <AppText style={styles.footerSub}>passionseed.app</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    backgroundColor: BG,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  glowContainer: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
  },
  brandEmoji: {
    fontSize: 14,
  },
  brandText: {
    fontSize: 12,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  portraitFrame: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(145,196,227,0.35)",
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowColor: CYAN,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  portrait: {
    width: "100%",
    height: "100%",
  },
  nameSection: {
    alignItems: "center",
    gap: 4,
    marginTop: -Space.sm,
  },
  yourArchetypeLabel: {
    fontSize: 10,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  archetypeName: {
    fontSize: 36,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
    lineHeight: 44,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  archetypeNameTh: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  captionSection: {
    paddingHorizontal: Space.sm,
    marginTop: -Space.xs,
  },
  captionText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "BaiJamjuree_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  titleSection: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.12)",
    alignItems: "center",
    gap: Space.xs,
    width: "100%",
  },
  titleLabel: {
    fontSize: 10,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  titleText: {
    fontSize: 17,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
    lineHeight: 24,
    fontStyle: "italic",
  },
  allySection: {
    backgroundColor: "rgba(157,129,172,0.06)",
    borderRadius: 16,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(157,129,172,0.2)",
    gap: Space.sm,
    width: "100%",
  },
  allyLabel: {
    fontSize: 10,
    color: PURPLE,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  allyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  allyPortraitFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(157,129,172,0.4)",
  },
  allyPortrait: {
    width: "100%",
    height: "100%",
  },
  allyTextBlock: {
    flex: 1,
    gap: 2,
  },
  allyName: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  allyLine: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 17,
  },
  footer: {
    alignItems: "center",
    gap: 2,
  },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footerSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
    fontFamily: "BaiJamjuree_400Regular",
  },
});
