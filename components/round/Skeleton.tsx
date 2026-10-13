import React, { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Violet } from "../../lib/theme";

export function SkeletonBlock({ height, width = "100%", radius = 16 }: { height: number; width?: DimensionValue; radius?: number }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!reduced) opacity.value = withRepeat(withTiming(0.55, { duration: 700 }), -1, true);
  }, [opacity, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: Violet[100] }, style]} />;
}

/** Skeleton matching the Shift home layout (5.4). */
export function HomeSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
      <SkeletonBlock height={26} width={140} radius={8} />
      <SkeletonBlock height={76} />
      <SkeletonBlock height={14} width="60%" radius={7} />
      <SkeletonBlock height={190} radius={24} />
      <SkeletonBlock height={70} radius={24} />
      <SkeletonBlock height={120} radius={24} />
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

const styles = StyleSheet.create({ wrap: { gap: 14 } });
