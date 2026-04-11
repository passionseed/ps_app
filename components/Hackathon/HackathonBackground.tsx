// components/hackathon/HackathonBackground.tsx
import { useEffect } from "react";
import { StyleSheet, Dimensions, View } from "react-native";
import { Canvas, Circle as SkiaCircle, Blur, Group, Oval, Path, Rect, LinearGradient, vec } from "@shopify/react-native-skia";
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue, SharedValue, runOnJS } from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Pure Skia Jellyfish component to avoid costly .svg parsing
export const SkiaJellyfish = ({ scale = 1, opacity = 1, time, seed = 0 }: { scale?: number; opacity?: number; time: SharedValue<number>; seed?: number }) => {
  // Start randomly within screen bounds
  const startX = Math.random() * (SCREEN_WIDTH - 100) + 50;
  const startY = Math.random() * (SCREEN_HEIGHT - 100) + 50;
  
  const posX = useSharedValue(startX);
  const posY = useSharedValue(startY);
  
  const lastX = useSharedValue(startX);
  const lastY = useSharedValue(startY);
  const angle = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;
    const swimToNext = () => {
      if (!isMounted) return;
      
      const marginX = 40 * scale;
      const marginY = 40 * scale;
      const targetX = marginX + Math.random() * (SCREEN_WIDTH - 2 * marginX);
      const targetY = marginY + Math.random() * (SCREEN_HEIGHT - 2 * marginY);
      
      const dx = targetX - posX.value;
      const dy = targetY - posY.value;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Speed roughly constant. Duration = dist / speed
      const duration = (dist / 30) * 1000 + Math.random() * 2000;

      posX.value = withTiming(targetX, { duration, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) {
          runOnJS(swimToNext)();
        }
      });
      posY.value = withTiming(targetY, { duration, easing: Easing.inOut(Easing.quad) });
    };

    const t = setTimeout(swimToNext, Math.random() * 1000);
    return () => { isMounted = false; clearTimeout(t); };
  }, [scale, posX, posY]);

  const transform = useDerivedValue(() => {
    const dx = posX.value - lastX.value;
    const dy = posY.value - lastY.value;
    
    let targetAngle = angle.value;
    const speedSq = dx*dx + dy*dy;
    if (speedSq > 0.0001) {
      targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
    }

    // Shortest-path angle interpolation to prevent violent 360 snaps
    const diff = targetAngle - angle.value;
    const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    angle.value += normalizedDiff * 0.04;

    lastX.value = posX.value;
    lastY.value = posY.value;

    const currentSpeed = Math.sqrt(speedSq);
    // Breathing amplifies based on swimming speed
    const breath = 1 + (Math.sin(time.value * 4 + seed) * (0.02 + currentSpeed * 0.015));

    return [
      { translateX: posX.value },
      { translateY: posY.value },
      { translateX: 32 },  // Shift to center of mass for rotation (w: 64, h: 80 -> center around 32, 40)
      { translateY: 40 },
      { scale: scale * breath },
      { rotate: angle.value },
      { translateX: -32 }, // Shift back
      { translateY: -40 }
    ];
  });

  return (
    <Group transform={transform} opacity={opacity}>
      {/* Bell outer  (cx:32, cy:28, rx:22, ry:18) -> x: 10, y: 10, w: 44, h: 36 */}
      <Oval x={10} y={10} width={44} height={36} color="rgba(145,196,227,0.07)" style="fill" />
      <Oval x={10} y={10} width={44} height={36} color="rgba(145,196,227,0.3)" style="stroke" strokeWidth={1} />
      
      {/* Bell inner (cx:32, cy:26, rx:14, ry:11) -> x: 18, y: 15, w: 28, h: 22 */}
      <Oval x={18} y={15} width={28} height={22} color="rgba(145,196,227,0.05)" style="fill" />
      <Oval x={18} y={15} width={28} height={22} color="rgba(145,196,227,0.15)" style="stroke" strokeWidth={0.8} />

      {/* Core glow (cx:32, cy:24, rx:6, ry:5) -> x: 26, y: 19, w: 12, h: 10 */}
      <Oval x={26} y={19} width={12} height={10} color="rgba(145,196,227,0.12)" style="fill" />

      {/* Tentacles */}
      <Path path="M20 44 Q18 56 20 68" color="rgba(145,196,227,0.3)" style="stroke" strokeWidth={1} />
      <Path path="M25 46 Q22 58 24 70" color="rgba(145,196,227,0.2)" style="stroke" strokeWidth={1} />
      <Path path="M32 46 Q32 60 30 72" color="rgba(145,196,227,0.3)" style="stroke" strokeWidth={1} />
      <Path path="M38 46 Q40 58 38 70" color="rgba(145,196,227,0.2)" style="stroke" strokeWidth={1} />
      <Path path="M44 44 Q46 56 44 68" color="rgba(145,196,227,0.25)" style="stroke" strokeWidth={1} />
    </Group>
  );
};

export function HackathonBackground({ topGlowOffsetY = 0 }: { topGlowOffsetY?: number }) {
  // Global time driver
  const time = useSharedValue(0);
  useEffect(() => {
    time.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, [time]);

  // Derived parallax coordinates for the background glow orbs
  const orb1Cx = useDerivedValue(() => 50 + Math.sin(time.value) * 30);
  const orb1Cy = useDerivedValue(() => 50 + Math.cos(time.value * 0.8) * 30);
  
  const orb2Cx = useDerivedValue(() => SCREEN_WIDTH - 20 + Math.cos(time.value * 1.2) * 50);
  const orb2Cy = useDerivedValue(() => SCREEN_HEIGHT - 60 + Math.sin(time.value * 1.5) * 50);
  
  const orb3Cx = useDerivedValue(() => SCREEN_WIDTH * 0.4 + Math.sin(time.value * 0.9 + 1) * 60);
  const orb3Cy = useDerivedValue(() => SCREEN_HEIGHT * 0.4 + Math.cos(time.value * 1.1 + 2) * 60);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Ocean sunlight from above */}
        <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <LinearGradient
            start={vec(SCREEN_WIDTH / 2, -150 + topGlowOffsetY)}
            end={vec(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2.2 + topGlowOffsetY)}
            colors={["rgba(101,171,252,0.45)", "transparent"]}
          />
        </Rect>

        {/* Glows */}
        <SkiaCircle cx={orb1Cx} cy={orb1Cy} r={110} color="rgba(145,196,227,0.055)">
          <Blur blur={80} />
        </SkiaCircle>
        <SkiaCircle cx={orb2Cx} cy={orb2Cy} r={100} color="rgba(165,148,186,0.08)">
          <Blur blur={90} />
        </SkiaCircle>
        <SkiaCircle cx={orb3Cx} cy={orb3Cy} r={80} color="rgba(101,171,252,0.04)">
          <Blur blur={80} />
        </SkiaCircle>

        {/* Skia Native Creatures */}
        <SkiaJellyfish time={time} seed={0} scale={1.2} opacity={0.85} />
        <SkiaJellyfish time={time} seed={2.5} scale={0.7} opacity={0.6} />
        <SkiaJellyfish time={time} seed={5.1} scale={1.8} opacity={0.4} />
      </Canvas>

      {/* Star particles */}
      <View style={[styles.star, { top: "18%", left: "15%", width: 2, height: 2, opacity: 0.4 }]} />
      <View style={[styles.star, { top: "30%", left: "80%", width: 1.5, height: 1.5, opacity: 0.3 }]} />
      <View style={[styles.star, { top: "55%", left: "88%", width: 2, height: 2, opacity: 0.25 }]} />
      <View style={[styles.star, { top: "70%", left: "8%", width: 1.5, height: 1.5, opacity: 0.3 }]} />
      <View style={[styles.star, { top: "85%", left: "55%", width: 2, height: 2, opacity: 0.2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
});
