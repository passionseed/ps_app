import React, { useEffect, useState } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * Skeleton block (DESIGN.md v4): a lavender block with a soft white shimmer sweeping across.
 * With reduce motion the block stays still.
 */
export function SkeletonBlock({ height, width = "100%", radius = 16 }: { height: number; width?: DimensionValue; radius?: number }) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduced || !w) return;
    x.value = 0;
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(x);
  }, [reduced, w, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * w * 2 }] }));
  return (
    <View
      style={[styles.block, { height, width, borderRadius: radius }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <LinearGradient colors={["#EEE8FF", "#E6DEFB"]} style={StyleSheet.absoluteFill} />
      {!reduced && w ? (
        <Animated.View style={[StyleSheet.absoluteFill, { width: w }, sweep]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.6)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Skeleton matching the Shift home layout (5.4). */
export function HomeSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
      <SkeletonBlock height={26} width={140} radius={13} />
      <SkeletonBlock height={76} />
      <SkeletonBlock height={14} width="60%" radius={7} />
      <SkeletonBlock height={190} radius={26} />
      <SkeletonBlock height={70} radius={22} />
      <SkeletonBlock height={120} radius={22} />
    </View>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.wrap} accessibilityState={{ busy: true }}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} height={72} radius={20} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  block: { overflow: "hidden" },
});
