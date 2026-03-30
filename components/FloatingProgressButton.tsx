import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../lib/auth";
import { readCachedSeedRecommendations } from "../lib/seedRecommendations";
import type { SeedCoverageSummary } from "../lib/seedRecommendations";
import { AppText as Text } from "./AppText";
import { Shadow, Radius, Border, Accent, Text as ThemeText } from "../lib/theme";

interface FloatingProgressButtonProps {
  bottomOffset: number;
}

export function FloatingProgressButton({ bottomOffset }: FloatingProgressButtonProps) {
  const { appLanguage } = useAuth();
  const [coverage, setCoverage] = useState<SeedCoverageSummary | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  const isThai = appLanguage === "th";
  const percent = coverage?.completionPercent ?? 0;
  const isComplete = percent >= 100;

  useEffect(() => {
    readCachedSeedRecommendations().then((payload) => {
      if (payload?.coverage) {
        setCoverage(payload.coverage);
      }
    });
  }, []);

  // Pulse animation when complete
  useEffect(() => {
    if (isComplete) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isComplete]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/ikigai");
  };

  const label = isThai ? `สำรวจไปแล้ว ${percent}%` : `Explored ${percent}%`;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset + 12 },
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Pressable onPress={handlePress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {isComplete ? (
          <LinearGradient
            colors={["#FCD34D", "#F59E0B", "#D97706"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          >
            <Text style={styles.icon}>✨</Text>
            <Text style={[styles.label, styles.labelComplete]}>
              {isThai ? "解锁 Ikigai!" : "Unlock Ikigai!"}
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.normalBg}>
            <Text style={styles.icon}>🧭</Text>
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 24,
    zIndex: 200,
  },
  button: {
    borderRadius: Radius.full,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  gradientBg: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: "#FCD34D",
  },
  normalBg: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Border.default,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  labelComplete: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});