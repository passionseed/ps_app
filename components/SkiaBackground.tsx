import React, { useMemo } from "react";
import { useWindowDimensions, StyleSheet } from "react-native";
import {
  Canvas,
  Circle,
  RadialGradient,
  BlurMask,
  vec,
  Group,
  LinearGradient,
  Rect,
  Fill,
  Turbulence,
  DisplacementMap,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";

const Star = ({
  width,
  height,
  index,
}: {
  width: number;
  height: number;
  index: number;
}) => {
  const x = useMemo(() => Math.random() * width, [width]);
  const y = useMemo(() => Math.random() * height * 0.7, [height]);
  const size = useMemo(() => Math.random() * 1.5 + 0.5, []);

  const opacity = useSharedValue(Math.random());

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.2 + Math.random() * 0.8, {
        duration: 2000 + Math.random() * 3000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, []);

  const skiaOpacity = useDerivedValue(() => opacity.value);

  return <Circle cx={x} cy={y} r={size} color="white" opacity={skiaOpacity} />;
};

export default function SkiaBackground() {
  const { width, height } = useWindowDimensions();

  // Blobs for ambient movement
  const blob1Pos = useSharedValue(0);
  const blob2Pos = useSharedValue(0);

  React.useEffect(() => {
    blob1Pos.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.linear) }),
      -1,
      true,
    );
    blob2Pos.value = withRepeat(
      withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.linear) }),
      -1,
      true,
    );
  }, []);

  const b1X = useDerivedValue(
    () => width * (0.2 + Math.sin(blob1Pos.value * Math.PI * 2) * 0.1),
  );
  const b1Y = useDerivedValue(
    () => height * (0.3 + Math.cos(blob1Pos.value * Math.PI * 2) * 0.1),
  );

  const b2X = useDerivedValue(
    () => width * (0.8 + Math.cos(blob2Pos.value * Math.PI * 2) * 0.1),
  );
  const b2Y = useDerivedValue(
    () => height * (0.5 + Math.sin(blob2Pos.value * Math.PI * 2) * 0.1),
  );

  const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => i), []);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {/* Deep Background */}
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={["#0a0514", "#1a0b36", "#3d1866", "#67298a"]}
        />
      </Fill>

      {/* Ambient Light Blobs with distortion */}
      <Group>
        <Circle cx={b1X} cy={b1Y} r={width * 0.7} color="#471d73" opacity={0.4}>
          <BlurMask blur={80} style="normal" />
        </Circle>
        <Circle cx={b2X} cy={b2Y} r={width * 0.6} color="#22a8d3" opacity={0.3}>
          <BlurMask blur={100} style="normal" />
        </Circle>

        {/* Organic Distortion */}
        <DisplacementMap channelX="r" channelY="g" scale={20}>
          <Turbulence freqX={0.01} freqY={0.01} octaves={2} seed={1} />
        </DisplacementMap>
      </Group>

      {/* Stars */}
      <Group>
        {stars.map((i) => (
          <Star key={i} width={width} height={height} index={i} />
        ))}
      </Group>

      {/* Terrain/Hills with glassmorphism glow */}
      <Group>
        <BlurMask blur={10} style="normal" />
        <Rect x={0} y={height * 0.75} width={width} height={height * 0.25}>
          <LinearGradient
            start={vec(0, height * 0.75)}
            end={vec(0, height)}
            colors={["rgba(103, 41, 138, 0.2)", "#170530"]}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}
