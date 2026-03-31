import React, { useEffect, useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Accent } from "../lib/theme";

const PURPLE_SOFT = "rgba(139, 92, 246, 0.45)";
const BLUE_SOFT = "rgba(59, 130, 246, 0.28)";
const LIME_SOFT = "rgba(191, 255, 0, 0.38)";

const DIMENSIONS = {
  large: { canvas: 108, core: 15, ringMax: 46, blur: 14 },
  small: { canvas: 44, core: 5.5, ringMax: 16, blur: 5 },
} as const;

export type PathLabSkiaLoaderSize = keyof typeof DIMENSIONS;

type Props = {
  size?: PathLabSkiaLoaderSize;
  style?: StyleProp<ViewStyle>;
};

/** PathLab-branded loading orb: same language as the splash (soft blurs, ripple rings, lime accent). */
export function PathLabSkiaLoader({ size = "large", style }: Props) {
  const { canvas: dim, core: coreBase, ringMax, blur } = DIMENSIONS[size];
  const cx = dim * 0.5;
  const cy = dim * 0.5;

  const breath = useSharedValue(1);
  const ring0 = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1.12, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );

    const ringTiming = {
      duration: 2400,
      easing: Easing.out(Easing.cubic),
    } as const;
    ring0.value = withRepeat(withTiming(1, ringTiming), -1, false);
    ring1.value = withDelay(
      800,
      withRepeat(withTiming(1, ringTiming), -1, false),
    );
    ring2.value = withDelay(
      1600,
      withRepeat(withTiming(1, ringTiming), -1, false),
    );

    drift.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const coreR = useDerivedValue(() => coreBase * breath.value);

  const r0 = useDerivedValue(() => 10 + ring0.value * ringMax);
  const o0 = useDerivedValue(() => 0.34 * (1 - ring0.value));

  const r1 = useDerivedValue(() => 10 + ring1.value * ringMax);
  const o1 = useDerivedValue(() => 0.26 * (1 - ring1.value));

  const r2 = useDerivedValue(() => 10 + ring2.value * ringMax);
  const o2 = useDerivedValue(() => 0.2 * (1 - ring2.value));

  const motes = useMemo(() => {
    if (size !== "large") return [];
    return [
      { x: cx - 28, y0: cy + 8, r: 1.1, speed: 0.9, phase: 0.1, c: LIME_SOFT },
      { x: cx + 22, y0: cy - 14, r: 0.85, speed: 0.75, phase: 0.55, c: PURPLE_SOFT },
      { x: cx + 6, y0: cy + 26, r: 0.95, speed: 0.65, phase: 0.28, c: BLUE_SOFT },
    ];
  }, [cx, cy, size]);

  return (
    <Canvas
      style={[styles.canvas, { width: dim, height: dim }, style]}
      pointerEvents="none"
    >
      {size === "large" ? (
        <Group>
          <Circle
            cx={cx - dim * 0.06}
            cy={cy - dim * 0.05}
            r={dim * 0.34}
            color={PURPLE_SOFT}
            opacity={0.85}
          >
            <BlurMask blur={blur * 2.2} style="normal" />
          </Circle>
          <Circle
            cx={cx + dim * 0.07}
            cy={cy + dim * 0.06}
            r={dim * 0.3}
            color={BLUE_SOFT}
            opacity={0.9}
          >
            <BlurMask blur={blur * 2.6} style="normal" />
          </Circle>
          <Circle cx={cx} cy={cy} r={coreR} color={LIME_SOFT} opacity={0.95}>
            <BlurMask blur={blur} style="normal" />
          </Circle>
        </Group>
      ) : (
        <Group>
          <Circle cx={cx} cy={cy} r={coreR} color={LIME_SOFT} opacity={0.92}>
            <BlurMask blur={blur} style="normal" />
          </Circle>
        </Group>
      )}

      <Group>
        <Circle
          cx={cx}
          cy={cy}
          r={r0}
          color={Accent.purple}
          style="stroke"
          strokeWidth={size === "large" ? 1.35 : 0.9}
          opacity={o0}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r1}
          color={Accent.blue}
          style="stroke"
          strokeWidth={size === "large" ? 1.15 : 0.75}
          opacity={o1}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r2}
          color={Accent.purple}
          style="stroke"
          strokeWidth={size === "large" ? 1 : 0.65}
          opacity={o2}
        />
      </Group>

      {size === "large" ? (
        <Group opacity={0.9}>
          {motes.map((m, i) => (
            <LoaderMote
              key={i}
              drift={drift}
              span={dim + 24}
              cx={m.x}
              y0={m.y0}
              r={m.r}
              speed={m.speed}
              phase={m.phase}
              color={m.c}
            />
          ))}
        </Group>
      ) : null}
    </Canvas>
  );
}

function LoaderMote({
  drift,
  span,
  cx,
  y0,
  r,
  speed,
  phase,
  color,
}: {
  drift: SharedValue<number>;
  span: number;
  cx: number;
  y0: number;
  r: number;
  speed: number;
  phase: number;
  color: string;
}) {
  const wrap = span;
  const cy = useDerivedValue(() => {
    const travel = drift.value * speed * span * 0.45;
    const y = (y0 - travel + wrap * 3) % wrap - span * 0.12;
    return y;
  });

  const tw = useDerivedValue(() => {
    const t = (drift.value + phase) % 1;
    return 0.3 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.55;
  });

  return <Circle cx={cx} cy={cy} r={r} color={color} opacity={tw} />;
}

const styles = StyleSheet.create({
  canvas: {
    alignSelf: "center",
  },
});
