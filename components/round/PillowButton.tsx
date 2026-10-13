import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Border, Gradient, Ink, Surface, Violet } from "../../lib/theme";
import { Icon, type IconName } from "./Icons";
import { RText } from "./RText";

/**
 * The one hero button per screen (DESIGN.md v3): white -> violet-50 pill, violet-700 text,
 * 32pt glossy violet gem, sinks 2pt on press with a light haptic.
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
  const sink = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value }] }));
  const inactive = disabled || busy;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      onPressIn={() => {
        sink.value = withTiming(2, { duration: 80 });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => {
        sink.value = withTiming(0, { duration: 120 });
      }}
      onPress={onPress}
      style={[styles.hit, style]}
    >
      <Animated.View style={[styles.shadow, inactive && styles.shadowOff, animated]}>
        <LinearGradient colors={inactive ? [Surface.card, Surface.card] : [...Gradient.primaryCta]} style={[styles.pill, inactive && styles.pillOff]}>
          <LinearGradient colors={inactive ? [Surface.control, Surface.control] : [...Gradient.gem]} style={styles.gem}>
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name={icon} size={16} color="#FFFFFF" strokeWidth={2.4} />}
          </LinearGradient>
          <RText variant="label" style={styles.label} color={inactive ? Ink.tertiary : Violet[700]} numberOfLines={2}>
            {label}
          </RText>
          <View style={styles.gemSpacer} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: 58, alignSelf: "stretch" },
  shadow: {
    borderRadius: 999,
    shadowColor: Violet[600],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  shadowOff: { shadowOpacity: 0, elevation: 0 },
  pill: {
    minHeight: 58,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Border.pillow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  pillOff: { borderColor: Surface.line },
  gem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  gemSpacer: { width: 0 },
  label: { fontSize: 17, textAlign: "center", flexShrink: 1 },
});
