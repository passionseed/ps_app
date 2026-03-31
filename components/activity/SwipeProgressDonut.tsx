import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, Group, Path, Skia, vec } from "@shopify/react-native-skia";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Accent, Text as ThemeText } from "../../lib/theme";

/** Small footprint — keeps Skia work cheap (no particles / no always-on animations). */
export const SWIPE_CANVAS_SIZE = 40;
const RING_OUTER = 34;
const STROKE = 3;

const TRACK = "rgba(79, 70, 229, 0.2)";
/** Single soft underlay instead of multiple glow paths */
const GLOW = "rgba(191, 255, 0, 0.22)";

export type SwipeProgressDirection = "next" | "previous";

type Props = {
  progress: SharedValue<number>;
  readyProgress: SharedValue<number>;
  pulseScale: SharedValue<number>;
  label: string;
  meta?: string;
  direction?: SwipeProgressDirection;
  /** When false (default), only ring + arrow — avoids large text blocking the screen */
  showCaption?: boolean;
  /** Destination title: above the ring for previous, below for next */
  titleHint?: string;
};

/**
 * Lightweight overscroll ring for prev/next activity. Minimal Skia: track + glow + arc only.
 */
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

  const ringPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

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

  const ringRotation =
    direction === "previous" ? -Math.PI / 2 : Math.PI / 2;
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
            <Canvas
              style={{ width: SWIPE_CANVAS_SIZE, height: SWIPE_CANVAS_SIZE }}
              pointerEvents="none"
            >
              <Group
                transform={[{ rotate: ringRotation }]}
                origin={vec(cx, cy)}
              >
                <Path
                  path={ringPath}
                  style="stroke"
                  strokeWidth={STROKE}
                  color={TRACK}
                  strokeCap="round"
                  start={0}
                  end={1}
                />
                <Path
                  path={ringPath}
                  style="stroke"
                  strokeWidth={STROKE + 2}
                  color={GLOW}
                  strokeCap="round"
                  start={0}
                  end={progress}
                  opacity={glowOpacity}
                />
                <Path
                  path={ringPath}
                  style="stroke"
                  strokeWidth={STROKE}
                  color={Accent.yellow}
                  strokeCap="round"
                  start={0}
                  end={progress}
                  opacity={strokeOpacity}
                />
              </Group>
            </Canvas>
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
