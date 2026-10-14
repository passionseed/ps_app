import React, { useEffect } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { Glow } from "../../lib/theme";

/**
 * Glowing progress (DESIGN.md v4): violet gradient fill with a soft glow, on a recessed
 * lavender track. `value` is 0..1. Pair it with words (e.g. "วันที่ 2 จาก 7"); the bar alone
 * is never the only signal.
 */
export function GlowProgress({
  value,
  height = 8,
  accessibilityLabel,
  style,
}: {
  value: number;
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const progress = useSharedValue(clamped);
  useEffect(() => {
    progress.value = reduced ? clamped : withTiming(clamped, { duration: 450 });
  }, [clamped, progress, reduced]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View
      style={[styles.track, { height, borderRadius: height }, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View style={[styles.fill, { borderRadius: height }, fill]}>
        <LinearGradient
          colors={[...Glow.fill]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: height }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Grows along a row (next to a label) and stretches across a column; never collapses.
  track: {
    flexGrow: 1,
    flexShrink: 1,
    alignSelf: "stretch",
    minWidth: 40,
    overflow: "hidden",
    backgroundColor: Glow.track,
    // Recessed: a faint inner shadow along the top (iOS/web; Android keeps the flat tint).
    ...(Platform.OS === "android" ? null : { boxShadow: "inset 0px 1px 2px rgba(20,17,42,0.08)" }),
  },
  fill: {
    height: "100%",
    ...(Platform.OS === "android" ? null : { boxShadow: `0px 0px 12px ${Glow.color}` }),
  },
});
