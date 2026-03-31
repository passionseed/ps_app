import React, { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  LinearGradient,
  vec,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** Soft “dawn” backdrop + drifting color masses + seed ripples + rising motes — all UI-thread via Reanimated. */
export function SplashSkiaAtmosphere() {
  const { width, height } = useWindowDimensions();
  const cx = width * 0.5;
  const cy = height * 0.5;

  const flowA = useSharedValue(0);
  const flowB = useSharedValue(0);
  const drift = useSharedValue(0);

  const ring0 = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    flowA.value = withRepeat(
      withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    flowB.value = withRepeat(
      withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    drift.value = withRepeat(
      withTiming(1, { duration: 16000, easing: Easing.linear }),
      -1,
      false,
    );

    const ringTiming = {
      duration: 2600,
      easing: Easing.out(Easing.cubic),
    } as const;
    ring0.value = withRepeat(withTiming(1, ringTiming), -1, false);
    ring1.value = withDelay(
      870,
      withRepeat(withTiming(1, ringTiming), -1, false),
    );
    ring2.value = withDelay(
      1740,
      withRepeat(withTiming(1, ringTiming), -1, false),
    );
  }, []);

  const orb1X = useDerivedValue(
    () => cx + Math.sin(flowA.value * Math.PI * 2) * width * 0.14,
  );
  const orb1Y = useDerivedValue(
    () => height * 0.28 + Math.cos(flowA.value * Math.PI * 2) * height * 0.06,
  );

  const orb2X = useDerivedValue(
    () => cx + Math.cos(flowB.value * Math.PI * 2) * width * 0.2,
  );
  const orb2Y = useDerivedValue(
    () => height * 0.62 + Math.sin(flowB.value * Math.PI * 2) * height * 0.08,
  );

  const orb3X = useDerivedValue(
    () => width * 0.72 + Math.sin((flowB.value + 0.35) * Math.PI * 2) * width * 0.08,
  );
  const orb3Y = useDerivedValue(
    () => height * 0.4 + Math.cos(flowA.value * Math.PI * 2) * height * 0.1,
  );

  const r0 = useDerivedValue(() => 46 + ring0.value * 118);
  const o0 = useDerivedValue(() => 0.32 * (1 - ring0.value));

  const r1 = useDerivedValue(() => 46 + ring1.value * 118);
  const o1 = useDerivedValue(() => 0.26 * (1 - ring1.value));

  const r2 = useDerivedValue(() => 46 + ring2.value * 118);
  const o2 = useDerivedValue(() => 0.2 * (1 - ring2.value));

  const motes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const s = 1000 + i * 127;
        const rx = ((s * 9301 + 49297) % 233280) / 233280;
        const ry = ((s * 7919 + 104729) % 233280) / 233280;
        const rr = ((s * 3571 + 99991) % 233280) / 233280;
        return {
          x: 24 + rx * (width - 48),
          y0: ry * (height + 60),
          r: 0.9 + rr * 1.8,
          speed: 0.55 + rr * 0.55,
          phase: ry,
          tint: i % 4 === 0 ? "rgba(191, 255, 0, 0.35)" : "rgba(139, 92, 246, 0.22)",
        };
      }),
    [height, width],
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["#ECEEF2", "#E6E2F4", "#EDE8FB", "#F1F0F6", "#F3F4F6"]}
          positions={[0, 0.22, 0.48, 0.72, 1]}
        />
      </Fill>

      <Group>
        <Circle
          cx={orb1X}
          cy={orb1Y}
          r={width * 0.58}
          color="rgba(139, 92, 246, 0.2)"
          opacity={0.9}
        >
          <BlurMask blur={72} style="normal" />
        </Circle>
        <Circle
          cx={orb2X}
          cy={orb2Y}
          r={width * 0.52}
          color="rgba(59, 130, 246, 0.12)"
          opacity={0.95}
        >
          <BlurMask blur={88} style="normal" />
        </Circle>
        <Circle
          cx={orb3X}
          cy={orb3Y}
          r={width * 0.35}
          color="rgba(255, 255, 255, 0.5)"
          opacity={0.85}
        >
          <BlurMask blur={56} style="normal" />
        </Circle>
      </Group>

      <Group>
        <Circle
          cx={cx}
          cy={cy}
          r={r0}
          color="rgba(139, 92, 246, 0.55)"
          style="stroke"
          strokeWidth={1.5}
          opacity={o0}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r1}
          color="rgba(59, 130, 246, 0.4)"
          style="stroke"
          strokeWidth={1.25}
          opacity={o1}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r2}
          color="rgba(139, 92, 246, 0.32)"
          style="stroke"
          strokeWidth={1}
          opacity={o2}
        />
      </Group>

      <Group opacity={0.85}>
        {motes.map((m, i) => (
          <SplashMote
            key={i}
            drift={drift}
            height={height}
            x={m.x}
            y0={m.y0}
            r={m.r}
            speed={m.speed}
            phase={m.phase}
            color={m.tint}
          />
        ))}
      </Group>
    </Canvas>
  );
}

function SplashMote({
  drift,
  height,
  x,
  y0,
  r,
  speed,
  phase,
  color,
}: {
  drift: SharedValue<number>;
  height: number;
  x: number;
  y0: number;
  r: number;
  speed: number;
  phase: number;
  color: string;
}) {
  const wrap = height + 100;
  const cy = useDerivedValue(() => {
    const travel = drift.value * speed * (height + 40);
    const y = (y0 - travel + wrap * 3) % wrap - 30;
    return y;
  });

  const tw = useDerivedValue(() => {
    const t = (drift.value + phase) % 1;
    return 0.35 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.55;
  });

  return <Circle cx={x} cy={cy} r={r} color={color} opacity={tw} />;
}
