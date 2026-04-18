import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "../../components/AppText";
import { Accent, Text as ThemeText } from "../../lib/theme";

export const SWIPE_CANVAS_SIZE = 40;
const RING_OUTER = 34;
const STROKE = 3;

const TRACK = "rgba(79, 70, 229, 0.2)";
const GLOW = "rgba(191, 255, 0, 0.22)";

export type SwipeProgressDirection = "next" | "previous";

type Props = {
  progress: SharedValue<number>;
  readyProgress: SharedValue<number>;
  pulseScale: SharedValue<number>;
  label: string;
  meta?: string;
  direction?: SwipeProgressDirection;
  showCaption?: boolean;
  titleHint?: string;
};

export function SwipeProgressDonut({
  progress,
  readyProgress,
  pulseScale,
  label,
  meta: metaProp,
  direction = "next",
  showCaption = false,
  titleHint,
}: Props) {
  const cx = SWIPE_CANVAS_SIZE / 2;
  const cy = SWIPE_CANVAS_SIZE / 2;
  const r = (RING_OUTER - STROKE) / 2;

  const strokeOpacity = useDerivedValue(() => readyProgress.value);
  const glowOpacity = useDerivedValue(
    () => readyProgress.value * (0.35 + 0.45 * progress.value),
  );

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + 0.5 * readyProgress.value,
  }));

  const ringRotation = direction === "previous" ? -90 : 90;
  const arrow = direction === "previous" ? "↑" : "↓";
  const meta =
    metaProp ??
    (direction === "previous"
      ? "Pull past the edge to go back"
      : "Pull past the bottom edge to continue");

  const trimmedHint = titleHint?.trim() ?? "";
  const showTitleAbove = direction === "previous" && trimmedHint.length > 0;
  const showTitleBelow = direction === "next" && trimmedHint.length > 0;

  const ringBlock = (
    <Animated.View style={pulseStyle}>
      <Animated.View style={fadeStyle}>
        <View style={styles.swipeDonutContainer}>
          <View
            style={[
              styles.ringContainer,
              {
                width: SWIPE_CANVAS_SIZE,
                height: SWIPE_CANVAS_SIZE,
                borderRadius: SWIPE_CANVAS_SIZE / 2,
                borderWidth: STROKE,
                borderColor: TRACK,
                transform: [{ rotate: `${ringRotation}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.progressRing,
                {
                  width: SWIPE_CANVAS_SIZE - 4,
                  height: SWIPE_CANVAS_SIZE - 4,
                  borderRadius: (SWIPE_CANVAS_SIZE - 4) / 2,
                  borderWidth: STROKE + 2,
                  borderColor: GLOW,
                  opacity: glowOpacity.value,
                },
              ]}
            />
            <View
              style={[
                styles.progressRing,
                {
                  width: SWIPE_CANVAS_SIZE - 4,
                  height: SWIPE_CANVAS_SIZE - 4,
                  borderRadius: (SWIPE_CANVAS_SIZE - 4) / 2,
                  borderWidth: STROKE,
                  borderColor: Accent.yellow,
                  opacity: strokeOpacity.value,
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.swipeDonutCenter,
              {
                width: SWIPE_CANVAS_SIZE,
                height: SWIPE_CANVAS_SIZE,
              },
            ]}
          >
            <AppText style={styles.swipeDonutArrow}>{arrow}</AppText>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );

  return (
    <View
      style={showCaption ? styles.swipeHintContainer : styles.swipeHintMinimal}
    >
      {showTitleAbove ? (
        <AppText numberOfLines={2} style={styles.swipeHintTitle}>
          {trimmedHint}
        </AppText>
      ) : null}
      {ringBlock}
      {showTitleBelow ? (
        <AppText numberOfLines={2} style={styles.swipeHintTitleBelow}>
          {trimmedHint}
        </AppText>
      ) : null}
      {showCaption ? (
        <>
          <AppText style={styles.swipeHintText}>{label}</AppText>
          <AppText style={styles.swipeHintMeta}>{meta}</AppText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  swipeHintContainer: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
    gap: 6,
    maxWidth: 280,
  },
  swipeHintMinimal: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  swipeHintTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: ThemeText.primary,
    textAlign: "center",
    maxWidth: 280,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  swipeHintTitleBelow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: ThemeText.primary,
    textAlign: "center",
    maxWidth: 280,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  swipeDonutContainer: {
    width: SWIPE_CANVAS_SIZE,
    height: SWIPE_CANVAS_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  progressRing: {
    position: "absolute",
    borderStyle: "solid",
  },
  swipeDonutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  swipeDonutArrow: {
    fontSize: 13,
    lineHeight: 14,
    color: Accent.purple,
    fontWeight: "700",
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: "500",
    color: ThemeText.secondary,
    textAlign: "center",
  },
  swipeHintMeta: {
    fontSize: 10,
    color: ThemeText.tertiary,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
