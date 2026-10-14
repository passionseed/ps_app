import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { Depth, Ink, Pillow, Surface, Violet } from "../../lib/theme";
import { GemIcon } from "./GemIcon";
import { type IconName } from "./Icons";
import { RText } from "./RText";

/**
 * The Pillow (DESIGN.md v4): the one glossy, tactile button per screen. White -> lavender pill
 * with a bright top highlight, a violet glow inside the bottom edge, a radial violet gem holding
 * the icon and a deep violet shadow. It sinks 2pt on press (shadow tightens) with a light haptic.
 */
export function PillowButton({
  label,
  icon = "check",
  onPress,
  disabled,
  busy,
  accessibilityHint,
  style,
  testID,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const reduced = useReducedMotion();
  const sink = useSharedValue(0);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value }] }));
  const inactive = !!(disabled || busy);
  const muted = !!disabled && !busy;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: !!busy }}
      disabled={inactive}
      onPressIn={() => {
        setPressed(true);
        sink.value = reduced ? 2 : withTiming(2, { duration: 70 });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => {
        setPressed(false);
        sink.value = reduced ? 0 : withTiming(0, { duration: 140 });
      }}
      onPress={onPress}
      style={[styles.hit, style]}
    >
      <Animated.View style={[styles.shadow, !muted && (pressed ? Depth.pillowPressed : Depth.pillow), animated]}>
        <View style={[styles.pill, muted && styles.pillOff]}>
          <LinearGradient
            colors={muted ? ["#FFFFFF", "#F7F6FB"] : [...Pillow.colors]}
            locations={muted ? undefined : [...Pillow.locations]}
            style={[StyleSheet.absoluteFill, styles.none]}
          />
          {!muted ? (
            <LinearGradient
              colors={["rgba(139,107,255,0)", Pillow.innerGlow]}
              style={[styles.innerGlow, styles.none]}
            />
          ) : null}
          <View style={[styles.highlight, styles.none]} />
          <GemIcon icon={busy ? undefined : icon} size={32} iconSize={16} muted={muted}>
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : undefined}
          </GemIcon>
          <RText variant="label" style={styles.label} color={muted ? Ink.tertiary : Violet[700]} numberOfLines={2}>
            {label}
          </RText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: Pillow.height, alignSelf: "stretch" },
  shadow: {
    borderRadius: 999,
    // Android elevation needs a background to cast from.
    backgroundColor: Platform.OS === "android" ? "#FFFFFF" : undefined,
  },
  pill: {
    minHeight: Pillow.height,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Pillow.border,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  pillOff: { borderColor: Surface.line },
  innerGlow: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderTopWidth: 2,
    borderTopColor: "#FFFFFF",
  },
  none: { pointerEvents: "none" },
  label: { fontSize: 17, textAlign: "center", flexShrink: 1 },
});
