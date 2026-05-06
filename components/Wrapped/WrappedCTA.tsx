import React, { useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const CYAN_DIM = "rgba(145,196,227,0.3)";

interface WrappedCTAProps {
  onPress: () => void;
}

export function WrappedCTA({ onPress }: WrappedCTAProps) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(145,196,227,${borderOpacity.value})`,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    borderOpacity.value = withTiming(0.4, { duration: 150 });
  }, [scale, borderOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    borderOpacity.value = withTiming(0.1, { duration: 200 });
  }, [scale, borderOpacity]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={styles.headerRow}>
          <AppText style={styles.emoji}>✨</AppText>
          <View style={styles.textContainer}>
            <AppText variant="bold" style={styles.title}>
              Discover Your Archetype
            </AppText>
            <AppText style={styles.subtitle}>
              Reflect on your journey and uncover your team role
            </AppText>
          </View>
        </View>
        <AppText variant="bold" style={styles.badge}>
          Start Wrapped →
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.1)",
    overflow: "hidden",
  },
  pressable: {
    padding: Space.lg,
    gap: Space.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  emoji: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 18,
  },
  badge: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: Space.xs,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
