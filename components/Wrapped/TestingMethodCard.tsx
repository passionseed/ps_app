import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { AppText } from "../AppText";
import { WrappedButton } from "./WrappedButton";
import { Space } from "../../lib/theme";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";

interface TestingMethodCardProps {
  primaryMethod: string;
  onNext: () => void;
}

export function TestingMethodCard({ primaryMethod, onNext }: TestingMethodCardProps) {
  // Map methods to specific emojis or icons if needed
  const getMethodDetails = (method: string) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes("wizard")) return { emoji: "🧙‍♂️", label: "Wizard of Oz" };
    if (lowerMethod.includes("figma") || lowerMethod.includes("mockup")) return { emoji: "🎨", label: "Digital Mockup" };
    if (lowerMethod.includes("paper")) return { emoji: "📝", label: "Paper Prototype" };
    if (lowerMethod.includes("concierge")) return { emoji: "🛎️", label: "Concierge MVP" };
    if (lowerMethod.includes("landing") || lowerMethod.includes("storyboard")) return { emoji: "🎬", label: "Storyboard / Landing" };
    return { emoji: "🧪", label: method || "Testing Rig" };
  };

  const details = getMethodDetails(primaryMethod);

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeIn.delay(100).duration(600)}>
        <AppText style={styles.emoji}>🛠️</AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(600)}>
        <AppText variant="bold" style={styles.title}>
          The Method Actor
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(500).duration(600)}>
        <AppText style={styles.text}>
          When it was time to validate your assumptions, you had a clear weapon of choice.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).duration(600).springify()}>
        <View style={styles.methodBox}>
          <AppText style={styles.methodEmoji}>{details.emoji}</AppText>
          <AppText variant="bold" style={styles.methodLabel}>
            {details.label}
          </AppText>
          <AppText style={styles.methodSubtext}>
            Your Primary Testing Rig
          </AppText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1000).duration(600)}>
        <AppText style={styles.caption}>
          Great builders don't just write code. They find the fastest, cheapest way to prove themselves wrong.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1200).duration(600)}>
        <WrappedButton onPress={onNext}>
            Keep Building →
          
          </WrappedButton>
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
  emoji: {
    fontSize: 64,
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  text: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "BaiJamjuree_400Regular",
  },
  methodBox: {
    backgroundColor: "rgba(145, 196, 227, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.3)",
    borderRadius: 24,
    padding: Space.xl,
    alignItems: "center",
    minWidth: 240,
    marginVertical: Space.md,
  },
  methodEmoji: {
    fontSize: 48,
    marginBottom: Space.sm,
  },
  methodLabel: {
    fontSize: 24,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  methodSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: Space.sm,
  },
  caption: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
  },
});
