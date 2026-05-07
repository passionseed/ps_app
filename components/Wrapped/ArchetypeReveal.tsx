import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import {
  Canvas,
  Circle,
  Group,
  Paint,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { ArchetypeResult } from "../../lib/wrapped/archetypes";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";
const DARK_BG = "#03050a";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface Particle {
  id: number;
  x: number;
  y: number;
  r: number;
  color: string;
  speedY: number;
  speedX: number;
  opacity: number;
}

interface ArchetypeRevealProps {
  archetype: ArchetypeResult;
  onComplete: () => void;
}

export function ArchetypeReveal({ archetype, onComplete }: ArchetypeRevealProps) {
  const phase = useSharedValue(0); // 0 = processing, 1 = name reveal, 2 = caption, 3 = done
  const screenDarkness = useSharedValue(0);
  const nameScale = useSharedValue(0.3);
  const nameOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowRadius = useSharedValue(0);
  const captionOpacity = useSharedValue(0);
  const bgWarmth = useSharedValue(0);
  const particleBurst = useSharedValue(0);
  const particleDrift = useSharedValue(0);

  // Archetype accent color
  const accentColor = useMemo(() => {
    switch (archetype.id) {
      case "field-researcher": return "#4ADE80";
      case "connector": return "#F472B6";
      case "detective": return "#60A5FA";
      case "pivoter": return "#FB923C";
      case "quiet-anchor": return "#A78BFA";
      case "iterator": return "#2DD4BF";
      case "skeptical-maker": return "#94A3B8";
      case "gut-caller": return "#F87171";
      default: return PURPLE;
    }
  }, [archetype.id]);

  // Generate particles
  const particles = useMemo(() => {
    const list: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 120 + 40;
      list.push({
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        r: Math.random() * 3 + 1,
        color: Math.random() > 0.5 ? accentColor : CYAN,
        speedY: -(Math.random() * 1.5 + 0.5),
        speedX: (Math.random() - 0.5) * 1,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
    return list;
  }, [accentColor]);

  useEffect(() => {
    // Sequence:
    // 0-500ms: screen darkens (pulse)
    // 500-1500ms: processing continues with dark screen
    // 1500ms: name slams in with overshoot spring + particle burst
    // 1500-3000ms: glow pulses 3 times
    // 2500ms: caption fades in
    // 4500ms: auto-advance

    const timer0 = setTimeout(() => {
      screenDarkness.value = withTiming(1, { duration: 500 });
    }, 0);

    const timer1 = setTimeout(() => {
      phase.value = 1;
      // Name slams in with overshoot spring
      nameScale.value = withSpring(1, { damping: 8, stiffness: 120, overshootClamping: false });
      nameOpacity.value = withTiming(1, { duration: 600 });
      // Particle burst
      particleBurst.value = withTiming(1, { duration: 800 });
      // Glow starts
      glowOpacity.value = withTiming(1, { duration: 600 });
      glowRadius.value = withSpring(150, { damping: 12, stiffness: 80 });
      // Background warmth shifts
      bgWarmth.value = withTiming(1, { duration: 2000 });
    }, 1500);

    const timer2 = setTimeout(() => {
      // Glow pulses 3 times
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.4, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withTiming(0.4, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withTiming(0.6, { duration: 300 })
      );
    }, 1800);

    const timer3 = setTimeout(() => {
      phase.value = 2;
      captionOpacity.value = withTiming(1, { duration: 800 });
      // Particles start drifting upward
      particleDrift.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    }, 2500);

    const timer4 = setTimeout(() => {
      phase.value = 3;
      onComplete();
    }, 5000);

    return () => {
      clearTimeout(timer0);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [archetype, phase, screenDarkness, nameScale, nameOpacity, glowOpacity, glowRadius, captionOpacity, bgWarmth, particleBurst, particleDrift, onComplete]);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(${Math.round(parseInt(accentColor.slice(1, 3), 16) * bgWarmth.value * 0.15)}, ${Math.round(parseInt(accentColor.slice(3, 5), 16) * bgWarmth.value * 0.15)}, ${Math.round(parseInt(accentColor.slice(5, 7), 16) * bgWarmth.value * 0.15)}, ${0.02 + bgWarmth.value * 0.03})`,
  }));

  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nameScale.value }],
    opacity: nameOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    width: glowRadius.value * 2,
    height: glowRadius.value * 2,
    borderRadius: glowRadius.value,
  }));

  const captionStyle = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
    transform: [{ translateY: (1 - captionOpacity.value) * 20 }],
  }));

  const spotlightStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.5,
    transform: [{ scale: 1 + glowOpacity.value * 0.2 }],
  }));

  return (
    <Animated.View style={[styles.card, containerStyle]}>
      {/* Skia particle canvas */}
      <View style={styles.particleCanvas}>
        <Canvas style={{ width: SCREEN_W, height: SCREEN_H }}>
          {/* Spotlight radial gradient behind name */}
          <Group transform={[{ translateX: SCREEN_W / 2 }, { translateY: SCREEN_H / 2 - 40 }]}>
            <Circle cx={0} cy={0} r={180}>
              <RadialGradient
                c={vec(0, 0)}
                r={180}
                colors={[`${accentColor}44`, `${accentColor}11`, "transparent"]}
              />
            </Circle>
          </Group>

          {/* Particle burst */}
          {particles.map((p) => {
            const burstProgress = particleBurst;
            const driftProgress = particleDrift;
            return (
              <Group key={p.id}>
                <Circle
                  cx={SCREEN_W / 2 + p.x * burstProgress.value}
                  cy={SCREEN_H / 2 - 40 + p.y * burstProgress.value + (driftProgress.value * p.speedY * 100)}
                  r={p.r * burstProgress.value}
                  opacity={p.opacity * burstProgress.value * (1 - driftProgress.value * 0.3)}
                  color={p.color}
                />
              </Group>
            );
          })}
        </Canvas>
      </View>

      {/* Processing state */}
      {phase.value === 0 && (
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

      {/* Glow orb behind name */}
      <Animated.View style={[styles.glowOrb, glowStyle, { backgroundColor: accentColor }]} />

      {/* Name reveal */}
      <Animated.View style={[styles.nameContainer, nameStyle]}>
        <AppText style={styles.revealLabel}>You are</AppText>
        <AppText variant="bold" style={[styles.revealName, { textShadowColor: accentColor }]}>
          {archetype.display.en}
        </AppText>
        <AppText style={styles.revealNameTh}>{archetype.display.th}</AppText>
      </Animated.View>

      {/* Caption */}
      <Animated.View style={[styles.captionContainer, captionStyle]}>
        <AppText style={styles.revealCaption}>{archetype.caption.en}</AppText>
        <AppText style={styles.revealCaptionTh}>{archetype.caption.th}</AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.lg,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    flex: 1,
    position: "relative",
  },
  particleCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
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
  glowOrb: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.2,
    top: "30%",
    alignSelf: "center",
    zIndex: 0,
  },
  nameContainer: {
    alignItems: "center",
    zIndex: 2,
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
  captionContainer: {
    alignItems: "center",
    zIndex: 2,
    paddingHorizontal: Space.lg,
  },
  revealCaption: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: Space.lg,
  },
  revealCaptionTh: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
    marginTop: Space.sm,
  },
});
