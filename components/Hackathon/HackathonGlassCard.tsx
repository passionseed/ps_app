import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { Radius } from "../../lib/theme";
import {
  HACK_ALPHA,
  HACK_GLASS_GRADIENT,
} from "../../lib/hackathonTheme";

type GradientVariant = "default" | "subtle" | "admin";

type HackathonGlassCardProps = {
  children: React.ReactNode;
  active?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  gradient?: GradientVariant;
  onPress?: () => void;
  disabled?: boolean;
};

const GRADIENTS: Record<GradientVariant, readonly [string, string]> = {
  default: HACK_GLASS_GRADIENT.default,
  subtle: HACK_GLASS_GRADIENT.subtle,
  admin: HACK_GLASS_GRADIENT.admin,
};

export function HackathonGlassCard({
  children,
  active = false,
  compact = false,
  style,
  innerStyle,
  gradient = "default",
  onPress,
  disabled,
}: HackathonGlassCardProps) {
  const colors = GRADIENTS[gradient];
  const borderColor = active
    ? HACK_ALPHA.cyanBorderStrong
    : gradient === "admin"
      ? HACK_ALPHA.blueBorder
      : HACK_ALPHA.cyanBorder;

  const content = (
    <BlurView intensity={40} tint="dark" style={styles.blur}>
      <LinearGradient
        colors={[...colors]}
        style={[
          compact ? styles.innerCompact : styles.inner,
          { borderColor },
          innerStyle,
        ]}
      >
        {children}
      </LinearGradient>
    </BlurView>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrapper,
          style,
          pressed && !disabled && { opacity: 0.85 },
          disabled && { opacity: 0.5 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.wrapper, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  blur: {
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  inner: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  innerCompact: {
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
});
