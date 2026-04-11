import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, Group, Path, Skia, vec } from "@shopify/react-native-skia";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "../../components/AppText";

export const SWIPE_CANVAS_SIZE = 40;
const RING_OUTER = 34;
const STROKE = 3;

const TRACK = "rgba(157, 129, 172, 0.2)";
const GLOW = "rgba(157, 129, 172, 0.4)";
const PURPLE = "#9D81AC";

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

export function HackathonSwipeDonut({
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
    return Skia.Path.Circle(cx, cy, r);
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

  const ringRotation = direction === "previous" ? -Math.PI / 2 : Math.PI / 2;
  const arrow = direction === "previous" ? "↑" : "↓";
  const meta =
    metaProp ??
    (direction === "previous"
      ? "ดึงลงเพื่อกลับไปก่อนหน้า"
      : "ดึงขึ้นเพื่อไปต่อ");

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
            <Group transform={[{ rotate: ringRotation }]} origin={vec(cx, cy)}>
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
                color={PURPLE}
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
    <View style={showCaption ? styles.swipeHintContainer : styles.swipeHintMinimal}>
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
    color: "#FFFFFF",
    textAlign: "center",
    maxWidth: 280,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  swipeHintTitleBelow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#FFFFFF",
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
    color: PURPLE,
    fontWeight: "700",
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  swipeHintMeta: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
