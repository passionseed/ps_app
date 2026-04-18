import { memo, useCallback } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Canvas, Path, interpolateColors } from "@shopify/react-native-skia";
import { FontAwesome } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Accent, Radius, Shadow, Text as TextColor } from "../../lib/theme";

type SkiaBackButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: "light" | "dark";
  accessibilityLabel?: string;
};

const BUTTON_SIZE = 38;
const ICON_SIZE = 20;
const CHEVRON_PATH = "M13 4 L7 10 L13 16";

function SkiaBackButtonComponent({
  onPress,
  style,
  variant = "light",
  accessibilityLabel = "Go back",
}: SkiaBackButtonProps) {
  // Web fallback - Skia not supported on web
  if ((Platform.OS as string) === "web") {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.base,
          variant === "dark" ? styles.darkBase : styles.lightBase,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
      >
        <FontAwesome
          name="chevron-left"
          size={ICON_SIZE}
          color={variant === "dark" ? "rgba(255,255,255,0.92)" : "#1F2937"}
        />
      </Pressable>
    );
  }

  const pressProgress = useSharedValue(0);

  const iconColor = useDerivedValue(() => {
    if (variant === "dark") {
      return interpolateColors(
        pressProgress.value,
        [0, 1],
        ["rgba(255,255,255,0.92)", "#FFFFFF"],
      );
    }
    return interpolateColors(
      pressProgress.value,
      [0, 1],
      [TextColor.primary, Accent.blue],
    );
  });

  const iconShadowColor = useDerivedValue(() =>
    variant === "dark"
      ? "rgba(0,0,0,0.32)"
      : interpolateColors(
          pressProgress.value,
          [0, 1],
          ["rgba(17,24,39,0.12)", "rgba(59,130,246,0.18)"],
        ),
  );

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - pressProgress.value * 0.06 },
      { translateX: -pressProgress.value * 1.4 },
    ],
  }));

  const handlePressIn = useCallback(() => {
    pressProgress.value = withTiming(1, { duration: 140 });
    void Haptics.selectionAsync();
  }, [pressProgress]);

  const handlePressOut = useCallback(() => {
    pressProgress.value = withSpring(0, {
      damping: 14,
      stiffness: 220,
      mass: 0.45,
    });
  }, [pressProgress]);

  return (
    <Animated.View
      style={[
        styles.base,
        variant === "dark" ? styles.darkBase : styles.lightBase,
        animatedButtonStyle,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.pressable}
        hitSlop={8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {(Platform.OS as string) !== "web" ? (
          <Canvas style={styles.canvas}>
            <Path
              path={CHEVRON_PATH}
              color={iconShadowColor}
              style="stroke"
              strokeWidth={3.4}
              strokeCap="round"
              strokeJoin="round"
            />
            <Path
              path={CHEVRON_PATH}
              color={iconColor}
              style="stroke"
              strokeWidth={2.2}
              strokeCap="round"
              strokeJoin="round"
            />
          </Canvas>
        ) : (
          <FontAwesome
            name="chevron-left"
            size={ICON_SIZE}
            color={variant === "dark" ? "rgba(255,255,255,0.92)" : "#1F2937"}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export const SkiaBackButton = memo(SkiaBackButtonComponent);

const styles = StyleSheet.create({
  base: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  lightBase: {
    backgroundColor: "rgba(255,255,255,0.92)",
    ...Shadow.neutral,
  },
  darkBase: {
    backgroundColor: "rgba(17,24,39,0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
