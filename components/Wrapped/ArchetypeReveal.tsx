import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { ArchetypeResult } from "../../lib/wrapped/archetypes";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";

interface ArchetypeRevealProps {
  archetype: ArchetypeResult;
  onComplete: () => void;
}

export function ArchetypeReveal({ archetype, onComplete }: ArchetypeRevealProps) {
  const phase = useSharedValue(0); // 0 = processing, 1 = name reveal, 2 = caption, 3 = done
  const nameScale = useSharedValue(0.5);
  const nameOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Processing phase (800ms)
    const timer1 = setTimeout(() => {
      phase.value = 1;
      // Name springs in
      nameScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      nameOpacity.value = withTiming(1, { duration: 800 });
      glowOpacity.value = withTiming(1, { duration: 1000 });
    }, 1200);

    // Caption fades in
    const timer2 = setTimeout(() => {
      phase.value = 2;
    }, 2200);

    // Auto-advance to summary
    const timer3 = setTimeout(() => {
      phase.value = 3;
      onComplete();
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [archetype, phase, nameScale, nameOpacity, glowOpacity, onComplete]);

  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nameScale.value }],
    opacity: nameOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.3,
  }));

  return (
    <View style={styles.card}>
      {phase.value === 0 && (
        <Animated.View entering={FadeIn.duration(400)}>
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

      <Animated.View style={[styles.glowOrb, glowStyle]} />

      <Animated.View style={nameStyle}>
        <AppText style={styles.revealLabel}>You are</AppText>
        <AppText variant="bold" style={styles.revealName}>
          {archetype.display.en}
        </AppText>
        <AppText style={styles.revealNameTh}>{archetype.display.th}</AppText>
      </Animated.View>

      {phase.value >= 2 && (
        <Animated.View entering={FadeInUp.duration(600).delay(200)}>
          <AppText style={styles.revealCaption}>{archetype.caption.en}</AppText>
          <AppText style={styles.revealCaptionTh}>{archetype.caption.th}</AppText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.lg,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    flex: 1,
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
  glowOrb: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: PURPLE,
    opacity: 0.15,
    top: "30%",
    alignSelf: "center",
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
    fontSize: 36,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 44,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  revealNameTh: {
    fontSize: 20,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    marginTop: Space.xs,
  },
  revealCaption: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: Space.lg,
    paddingHorizontal: Space.lg,
  },
  revealCaptionTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: Space.sm,
    paddingHorizontal: Space.lg,
  },
});
