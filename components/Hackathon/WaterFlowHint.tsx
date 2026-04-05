import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { AppText } from "../AppText";

const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN_GLOW = "#91C4E3";

type Props = {
  label: string;
};

export function WaterFlowHint({ label }: Props) {
  // We'll have 3 chevrons flowing upwards.
  // 0 is top, 1 is middle, 2 is bottom.
  // Flow goes from bottom to top, so index 2 starts, then 1, then 0.
  
  const anim0 = useSharedValue(0);
  const anim1 = useSharedValue(0);
  const anim2 = useSharedValue(0);

  useEffect(() => {
    const config = { duration: 800, easing: Easing.inOut(Easing.ease) };
    
    // Bottom chevron (index 2)
    anim2.value = withRepeat(
      withSequence(
        withTiming(1, config),
        withTiming(0, config),
        withDelay(800, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    // Middle chevron (index 1)
    anim1.value = withRepeat(
      withSequence(
        withDelay(200, withTiming(1, config)),
        withTiming(0, config),
        withDelay(600, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    // Top chevron (index 0)
    anim0.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(1, config)),
        withTiming(0, config),
        withDelay(400, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, []);

  const style0 = useAnimatedStyle(() => {
    return {
      opacity: 0.1 + anim0.value * 0.9,
      transform: [
        { translateY: (1 - anim0.value) * 6 },
        { scale: 0.9 + anim0.value * 0.2 }
      ],
      shadowOpacity: anim0.value * 0.8,
    };
  });

  const style1 = useAnimatedStyle(() => {
    return {
      opacity: 0.1 + anim1.value * 0.9,
      transform: [
        { translateY: (1 - anim1.value) * 6 },
        { scale: 0.9 + anim1.value * 0.2 }
      ],
      shadowOpacity: anim1.value * 0.8,
    };
  });

  const style2 = useAnimatedStyle(() => {
    return {
      opacity: 0.1 + anim2.value * 0.9,
      transform: [
        { translateY: (1 - anim2.value) * 6 },
        { scale: 0.9 + anim2.value * 0.2 }
      ],
      shadowOpacity: anim2.value * 0.8,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.chevrons}>
        <Animated.View style={[styles.chevronWrapper, { top: 0 }, style0]}>
          <Feather name="chevron-up" size={32} color={CYAN_GLOW} style={styles.icon} />
        </Animated.View>
        <Animated.View style={[styles.chevronWrapper, { top: 12 }, style1]}>
          <Feather name="chevron-up" size={32} color={CYAN_GLOW} style={styles.icon} />
        </Animated.View>
        <Animated.View style={[styles.chevronWrapper, { top: 24 }, style2]}>
          <Feather name="chevron-up" size={32} color={CYAN_GLOW} style={styles.icon} />
        </Animated.View>
      </View>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.8,
    marginTop: 24,
  },
  chevrons: {
    alignItems: "center",
    justifyContent: "center",
    height: 60, // Fixed height to contain the overlapping chevrons
    marginBottom: 8,
  },
  chevronWrapper: {
    position: "absolute",
    shadowColor: CYAN_GLOW,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  },
  icon: {
    // Offset the chevrons so they stack vertically
  },
  label: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
