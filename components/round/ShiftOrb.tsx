import React, { useEffect } from "react";
import { Platform, StyleSheet, View, type TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Depth, Gem, Glass, Ink } from "../../lib/theme";
import { RText } from "./RText";
import { useSvgId } from "./svgId";

const WORDMARK_SHADOW: TextStyle =
  Platform.OS === "web"
    ? ({ textShadow: "0px 2px 10px rgba(78,64,132,0.45)" } as TextStyle)
    : { textShadowColor: "rgba(78,64,132,0.45)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 };

/** Where the floating chips sit around the orb (fractions of the orb size, mockup depth-v4). */
const CHIP_SPOTS = [
  { left: -0.16, top: 0.14 },
  { right: -0.2, top: 0.68 },
  { left: -0.09, bottom: -0.03 },
] as const;

function FloatingChip({ label, spot, size, index }: { label: string; spot: (typeof CHIP_SPOTS)[number]; size: number; index: number }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    y.value = withDelay(
      index * 420,
      withRepeat(withTiming(1, { duration: 2600 + index * 380, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(y);
  }, [index, reduced, y]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -3 + y.value * 6 }] }));
  const pos: Record<string, number> = {};
  for (const [k, v] of Object.entries(spot)) pos[k] = Math.round(v * size);
  return (
    <Animated.View style={[styles.chip, Depth.float, pos, float]}>
      <View style={styles.chipDot}>
        <LinearGradient colors={[...Gem.face]} style={[StyleSheet.absoluteFill, { borderRadius: 5 }]} />
      </View>
      <RText variant="meta" weight="700" color={Ink.secondary} style={styles.chipText} numberOfLines={1}>
        {label}
      </RText>
    </Animated.View>
  );
}

/**
 * The glossy SHIFT orb (DESIGN.md v4, depth-v4 sign-in and v5 landing): a lit lavender sphere
 * with the wordmark, an optional subtitle and up to three floating glass chips. The wordmark is
 * a logo; the subtitle is deep violet so it reads at >= 6:1 on the sphere.
 */
export function ShiftOrb({
  size = 220,
  subtitle,
  chips = [],
  wordmark = "SHIFT",
}: {
  size?: number;
  subtitle?: string;
  chips?: string[];
  wordmark?: string;
}) {
  const id = useSvgId("orb");
  const r = size / 2;
  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessible accessibilityLabel={[wordmark, subtitle, ...chips].filter(Boolean).join(", ")}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: r }, styles.shadowBase, Depth.orb]} />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* radial-gradient(circle at 35% 30%, #FFF 0%, #E7E4FE 35%, #C4BDEC 70%, #9F92DE 100%) */}
          <RadialGradient id={`${id}b`} cx="35%" cy="30%" fx="35%" fy="30%" r="95.5%">
            <Stop offset={0} stopColor="#FFFFFF" />
            <Stop offset={0.35} stopColor="#E7E4FE" />
            <Stop offset={0.7} stopColor="#C4BDEC" />
            <Stop offset={1} stopColor="#9F92DE" />
          </RadialGradient>
          {/* inset 0 -14px 30px rgba(78,64,132,.3): shade along the lower rim */}
          <RadialGradient id={`${id}s`} cx="50%" cy="30%" r="78%">
            <Stop offset={0.62} stopColor="#634EA8" stopOpacity={0} />
            <Stop offset={0.9} stopColor="#634EA8" stopOpacity={0.3} />
            <Stop offset={1} stopColor="#634EA8" stopOpacity={0.42} />
          </RadialGradient>
          {/* inset 0 10px 20px rgba(255,255,255,.9): light along the upper rim */}
          <RadialGradient id={`${id}h`} cx="50%" cy="72%" r="76%">
            <Stop offset={0.7} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={0.93} stopColor="#FFFFFF" stopOpacity={0.75} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0.9} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${id}b)`} />
        <Circle cx={r} cy={r} r={r} fill={`url(#${id}s)`} />
        <Circle cx={r} cy={r} r={r} fill={`url(#${id}h)`} />
      </Svg>
      <View style={styles.words}>
        <RText
          variant="display"
          latin
          weight="700"
          color="#FFFFFF"
          style={[{ fontSize: Math.round(size * 0.165), lineHeight: Math.round(size * 0.2), letterSpacing: size * 0.0125 }, WORDMARK_SHADOW]}
        >
          {wordmark}
        </RText>
        {subtitle ? (
          <RText variant="meta" weight="700" color="#493A7D" style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </RText>
        ) : null}
      </View>
      {chips.slice(0, CHIP_SPOTS.length).map((label, i) => (
        <FloatingChip key={label} label={label} spot={CHIP_SPOTS[i]} size={size} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center" },
  shadowBase: { backgroundColor: Platform.OS === "android" ? "#C4BDEC" : undefined },
  words: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 2 },
  subtitle: { fontSize: 13, lineHeight: 20, opacity: 0.92 },
  chip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Glass.border,
    backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.86)",
  },
  chipDot: { width: 9, height: 9, borderRadius: 5, overflow: "hidden" },
  chipText: { fontSize: 13, lineHeight: 19 },
});
