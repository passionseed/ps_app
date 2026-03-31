import { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import {
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Accent, Text as ThemeText } from "../../lib/theme";

/** Canvas includes margin for PathLab-style motes */
export const SWIPE_CANVAS_SIZE = 96;
/** Inner ring diameter (visual) */
const RING_DIAMETER = 72;
const STROKE = 5;

const PURPLE_SOFT = "rgba(139, 92, 246, 0.42)";
const BLUE_SOFT = "rgba(59, 130, 246, 0.32)";
const LIME_SOFT = "rgba(191, 255, 0, 0.45)";

/** Track: cool slate + hint of path purple */
const TRACK = "rgba(79, 70, 229, 0.14)";
/** Wide glow under arc — purple → lime (brand path energy) */
const GLOW_PURPLE = "rgba(139, 92, 246, 0.38)";
const GLOW_LIME = "rgba(191, 255, 0, 0.26)";

export type SwipeProgressDirection = "next" | "previous";

type Props = {
  progress: SharedValue<number>;
  readyProgress: SharedValue<number>;
  pulseScale: SharedValue<number>;
  label: string;
  /** Hint under the title; defaults by direction */
  meta?: string;
  /** `next`: bottom pull, arc from 6 o'clock. `previous`: top pull, arc from 12 o'clock. */
  direction?: SwipeProgressDirection;
};

/**
 * PathLab overscroll ring (next / previous activity): purple / blue / lime, particles, Skia arc.
 */
export function SwipeProgressDonut({
  progress,
  readyProgress,
  pulseScale,
  label,
  meta: metaProp,
  direction = "next",
}: Props) {
  const cx = SWIPE_CANVAS_SIZE / 2;
  const cy = SWIPE_CANVAS_SIZE / 2;
  const r = (RING_DIAMETER - STROKE) / 2;

  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 4800, easing: Easing.linear }),
      -1,
      false,
    );
  }, [drift]);

  const ringPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

  const yellowOpacity = useDerivedValue(() => readyProgress.value);

  const glowOpacity = useDerivedValue(
    () => readyProgress.value * (0.3 + 0.5 * progress.value),
  );

  const glowPurpleOpacity = useDerivedValue(
    () => readyProgress.value * (0.25 + 0.35 * progress.value),
  );

  const particleGroupOpacity = useDerivedValue(
    () =>
      readyProgress.value *
      (0.35 + 0.65 * progress.value) *
      (0.55 + 0.45 * progress.value),
  );

  const blueAccentOpacity = useDerivedValue(
    () => readyProgress.value * Math.min(1, progress.value * 1.4) * 0.45,
  );

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + 0.58 * readyProgress.value,
  }));

  const ringRotation =
    direction === "previous" ? -Math.PI / 2 : Math.PI / 2;
  const arrow = direction === "previous" ? "↑" : "↓";
  const meta =
    metaProp ??
    (direction === "previous"
      ? "At the top, pull past the edge to go back"
      : "Scroll to the end, then pull past the bottom until the ring completes");

  const span = SWIPE_CANVAS_SIZE + 16;
  const motes = useMemo(
    () => [
      { x: cx - 26, y0: cy + 10, rad: 1.15, speed: 0.85, phase: 0.08, c: LIME_SOFT },
      { x: cx + 24, y0: cy - 12, rad: 0.9, speed: 0.72, phase: 0.52, c: PURPLE_SOFT },
      { x: cx + 4, y0: cy + 28, rad: 1, speed: 0.62, phase: 0.3, c: BLUE_SOFT },
      { x: cx - 18, y0: cy - 22, rad: 0.75, speed: 0.55, phase: 0.72, c: LIME_SOFT },
      { x: cx + 30, y0: cy + 6, rad: 0.68, speed: 0.68, phase: 0.4, c: PURPLE_SOFT },
    ],
    [cx, cy],
  );

  return (
    <View style={styles.swipeHintContainer}>
      <Animated.View style={pulseStyle}>
        <Animated.View style={fadeStyle}>
          <View style={styles.swipeDonutContainer}>
            <Canvas
              style={{ width: SWIPE_CANVAS_SIZE, height: SWIPE_CANVAS_SIZE }}
              pointerEvents="none"
            >
              <Group opacity={particleGroupOpacity}>
                {motes.map((m, i) => (
                  <SwipeMote
                    key={i}
                    drift={drift}
                    span={span}
                    cx={m.x}
                    y0={m.y0}
                    rad={m.rad}
                    speed={m.speed}
                    phase={m.phase}
                    color={m.c}
                  />
                ))}
              </Group>

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
                  strokeWidth={STROKE + 6}
                  color={GLOW_PURPLE}
                  strokeCap="round"
                  start={0}
                  end={progress}
                  opacity={glowPurpleOpacity}
                />
                <Path
                  path={ringPath}
                  style="stroke"
                  strokeWidth={STROKE + 3}
                  color={GLOW_LIME}
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
                  opacity={yellowOpacity}
                />
                {/* Thin blue accent tick at high fill — experience / forward motion */}
                <Path
                  path={ringPath}
                  style="stroke"
                  strokeWidth={1.5}
                  color={Accent.blue}
                  strokeCap="round"
                  start={0}
                  end={progress}
                  opacity={blueAccentOpacity}
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
      <AppText style={styles.swipeHintText}>{label}</AppText>
      <AppText style={styles.swipeHintMeta}>{meta}</AppText>
    </View>
  );
}

function SwipeMote({
  drift,
  span,
  cx,
  y0,
  rad,
  speed,
  phase,
  color,
}: {
  drift: SharedValue<number>;
  span: number;
  cx: number;
  y0: number;
  rad: number;
  speed: number;
  phase: number;
  color: string;
}) {
  const cy = useDerivedValue(() => {
    const travel = drift.value * speed * span * 0.42;
    const y = (y0 - travel + span * 3) % span - span * 0.1;
    return y;
  });

  const tw = useDerivedValue(() => {
    const t = (drift.value + phase) % 1;
    return 0.28 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.62;
  });

  return <Circle cx={cx} cy={cy} r={rad} color={color} opacity={tw} />;
}

const styles = StyleSheet.create({
  swipeHintContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
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
    fontSize: 22,
    lineHeight: 22,
    color: Accent.purple,
    fontWeight: "700",
  },
  swipeHintText: {
    fontSize: 14,
    fontWeight: "500",
    color: ThemeText.secondary,
    textAlign: "center",
  },
  swipeHintMeta: {
    fontSize: 12,
    color: ThemeText.tertiary,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
