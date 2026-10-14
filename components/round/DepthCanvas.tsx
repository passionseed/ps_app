import React, { memo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { Canvas, Orb, Wash } from "../../lib/theme";
import { useSvgId } from "./svgId";

/**
 * Gaussian falloff of a CSS `filter: blur(σ)` disc, as radial-gradient stops over radius R + 2σ.
 * Drawing the falloff directly keeps orbs to one cheap gradient fill (no blur filter, DESIGN.md v4).
 */
const ORB_STOPS: [number, number][] = [
  [0, 1],
  [0.27, 0.98],
  [0.45, 0.84],
  [0.64, 0.5],
  [0.82, 0.16],
  [1, 0],
];

export type OrbSpec = { color: string; cx: number; cy: number; r: number };

/** Default orbs, scaled from the 320pt mockup phone to the window width. */
export function defaultOrbs(width: number, height: number): OrbSpec[] {
  const k = Math.min(width, 520) / 320;
  return [
    // Violet orb hanging off the top-right corner.
    { color: Orb.violet, cx: width - 15 * k, cy: 55 * k, r: 105 * k },
    // Pink-lilac orb on the left, a bit above the middle.
    { color: Orb.pink, cx: 5 * k, cy: Math.min(height * 0.58, 405 * k), r: 75 * k },
  ];
}

function OrbDisc({ spec, id }: { spec: OrbSpec; id: string }) {
  const blur = 30 * (spec.r / 105);
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {ORB_STOPS.map(([offset, opacity]) => (
            <Stop key={offset} offset={offset} stopColor={spec.color} stopOpacity={opacity * Orb.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={spec.cx} cy={spec.cy} r={spec.r + 2 * blur} fill={`url(#${id})`} />
    </>
  );
}

/**
 * The v4 page background: vertical lavender canvas, a violet wash from the top-right, a pink
 * wash from the left and (optionally) soft orbs. Static and behind everything (no touches).
 */
export const DepthCanvas = memo(function DepthCanvas({
  orbs = true,
  customOrbs,
}: {
  orbs?: boolean;
  /** Override the default orbs (e.g. the sign-in screen). */
  customOrbs?: OrbSpec[];
}) {
  const { width, height } = useWindowDimensions();
  const base = useSvgId("canvas");
  const list = orbs ? customOrbs ?? defaultOrbs(width, height) : [];
  return (
    <View style={[StyleSheet.absoluteFill, styles.none]} aria-hidden>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${base}l`} x1="0" y1="0" x2="0" y2="1">
            {Canvas.colors.map((c, i) => (
              <Stop key={c} offset={Canvas.locations[i]} stopColor={c} />
            ))}
          </LinearGradient>
          <RadialGradient id={`${base}w1`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={Wash.topRight} stopOpacity={1} />
            <Stop offset={1} stopColor={Wash.topRight} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${base}w2`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={Wash.left} stopOpacity={1} />
            <Stop offset={1} stopColor={Wash.left} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${base}l)`} />
        {/* radial-gradient(120% 55% at 100% 0%, wash 0%, transparent 62%) */}
        <Ellipse cx={width} cy={0} rx={width * 1.2 * 0.62} ry={height * 0.55 * 0.62} fill={`url(#${base}w1)`} />
        {/* radial-gradient(70% 40% at 0% 34%, wash 0%, transparent 72%) */}
        <Ellipse cx={0} cy={height * 0.34} rx={width * 0.7 * 0.72} ry={height * 0.4 * 0.72} fill={`url(#${base}w2)`} />
        {list.map((spec, i) => (
          <OrbDisc key={i} spec={spec} id={`${base}o${i}`} />
        ))}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({ none: { pointerEvents: "none", overflow: "hidden" } });
