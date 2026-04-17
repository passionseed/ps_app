import { useEffect } from "react";
import { StyleSheet, View, Platform, ActivityIndicator } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Oval,
  Path,
} from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const SIZE = 132;
const CENTER = SIZE / 2;

export function HackathonJellyfishLoader() {
  // Web fallback - Skia not supported on web
  if (Platform.OS === "web") {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color="#91C4E3" />
      </View>
    );
  }

  const spin = useSharedValue(0);
  const bob = useSharedValue(0);
  const pulse = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(5, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    ring.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
      -1,
      false,
    );
  }, [bob, pulse, ring, spin]);

  const jellyfishTransform = useDerivedValue(() => [
    { translateX: CENTER },
    { translateY: CENTER + bob.value },
    { rotate: spin.value },
    { scale: pulse.value },
    { translateX: -CENTER },
    { translateY: -CENTER },
  ]);

  const ringRadius = useDerivedValue(() => 26 + ring.value * 24);
  const ringOpacity = useDerivedValue(() => 0.34 * (1 - ring.value));

  return (
    <View style={styles.root} pointerEvents="none">
      <Canvas style={styles.canvas}>
        <Circle cx={CENTER} cy={CENTER} r={26} color="rgba(101,171,252,0.18)">
          <BlurMask blur={24} style="normal" />
        </Circle>
        <Circle cx={CENTER} cy={CENTER} r={18} color="rgba(145,196,227,0.28)">
          <BlurMask blur={14} style="normal" />
        </Circle>

        <Circle
          cx={CENTER}
          cy={CENTER}
          r={ringRadius}
          color="rgba(145,196,227,0.6)"
          style="stroke"
          strokeWidth={1.4}
          opacity={ringOpacity}
        />

        <Group transform={jellyfishTransform}>
          <Oval
            x={CENTER - 20}
            y={CENTER - 30}
            width={40}
            height={30}
            color="rgba(145,196,227,0.16)"
          >
            <BlurMask blur={2} style="normal" />
          </Oval>
          <Oval
            x={CENTER - 20}
            y={CENTER - 30}
            width={40}
            height={30}
            color="rgba(145,196,227,0.65)"
            style="stroke"
            strokeWidth={1.25}
          />
          <Oval
            x={CENTER - 11}
            y={CENTER - 23}
            width={22}
            height={16}
            color="rgba(255,255,255,0.12)"
          />
          <Path
            path={`M ${CENTER - 12} ${CENTER - 1} Q ${CENTER - 16} ${CENTER + 16} ${CENTER - 11} ${CENTER + 30}`}
            color="rgba(145,196,227,0.7)"
            style="stroke"
            strokeWidth={1.5}
          />
          <Path
            path={`M ${CENTER - 4} ${CENTER} Q ${CENTER - 7} ${CENTER + 18} ${CENTER - 6} ${CENTER + 34}`}
            color="rgba(145,196,227,0.52)"
            style="stroke"
            strokeWidth={1.4}
          />
          <Path
            path={`M ${CENTER + 4} ${CENTER} Q ${CENTER + 7} ${CENTER + 18} ${CENTER + 6} ${CENTER + 34}`}
            color="rgba(145,196,227,0.52)"
            style="stroke"
            strokeWidth={1.4}
          />
          <Path
            path={`M ${CENTER + 12} ${CENTER - 1} Q ${CENTER + 16} ${CENTER + 16} ${CENTER + 11} ${CENTER + 30}`}
            color="rgba(145,196,227,0.7)"
            style="stroke"
            strokeWidth={1.5}
          />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    width: SIZE,
    height: SIZE,
  },
});
