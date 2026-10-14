import React from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Depth, Glass } from "../../lib/theme";

/**
 * Glass card (DESIGN.md v4): 66% white over the canvas, a bright 1pt rim, radius 22 and a soft
 * violet shadow under the card only. Text on glass measures as on white. Pressable cards sink 1pt.
 */
export function GlassCard({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  padding = 16,
  disabled,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  padding?: number;
  disabled?: boolean;
  testID?: string;
}) {
  const base: StyleProp<ViewStyle> = [styles.glass, Depth.glass, { padding }, style];
  if (!onPress) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: Glass.radius,
    borderWidth: 1,
    borderColor: Glass.border,
    backgroundColor: Platform.OS === "android" ? Glass.fillAndroid : Glass.fill,
  },
  pressed: { transform: [{ translateY: 1 }], ...Depth.row },
});
