import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "../lib/auth";
import { readCachedSeedRecommendations } from "../lib/seedRecommendations";
import type { SeedCoverageSummary } from "../lib/seedRecommendations";
import { AppText as Text } from "./AppText";
import { Shadow, Radius, Border, Accent, Text as ThemeText } from "../lib/theme";

interface FloatingProgressButtonProps {
  bottomOffset: number;
  visible?: boolean;
}

// Tab bar style constants
const TAB_BAR_RADIUS = 32;
const PREMIUM_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

export function FloatingProgressButton({ bottomOffset, visible = true }: FloatingProgressButtonProps) {
  const { appLanguage } = useAuth();
  const [coverage, setCoverage] = useState<SeedCoverageSummary | null>(null);

  const isThai = appLanguage === "th";
  const percent = coverage?.completionPercent ?? 0;
  const isComplete = percent >= 100;

  // Slide animation
  const translateY = useSharedValue(visible ? 0 : 100);
  const scale = useSharedValue(1);

  useEffect(() => {
    readCachedSeedRecommendations().then((payload) => {
      if (payload?.coverage) {
        setCoverage(payload.coverage);
      }
    });
  }, []);

  // Handle visibility changes with slide animation
  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 100, {
      damping: 20,
      stiffness: 150,
      mass: 0.8,
    });
  }, [visible]);

  // Pulse animation when complete
  useEffect(() => {
    if (isComplete) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = 1;
    }
  }, [isComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/ikigai");
  };

  const label = isThai ? `สำรวจไปแล้ว ${percent}%` : `Explored ${percent}%`;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset + 24 },
        animatedStyle,
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
          <LinearGradient
            colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
            locations={[0, 0.5, 1]}
            style={styles.tabBarBg}
          >
            <Text style={styles.icon}>🧭</Text>
            <Text style={styles.label}>{label}</Text>
          </LinearGradient>
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
    borderRadius: TAB_BAR_RADIUS,
    overflow: "hidden",
    ...PREMIUM_SHADOW,
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
    borderRadius: TAB_BAR_RADIUS,
    borderWidth: 2,
    borderColor: "#FCD34D",
  },
  tabBarBg: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderRadius: TAB_BAR_RADIUS,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
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