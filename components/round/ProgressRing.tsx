import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Depth, Glow, Violet } from "../../lib/theme";
import { RText } from "./RText";
import { useSvgId } from "./svgId";

/**
 * Progress ring (DESIGN.md v4, mockup B): violet gradient arc on a faint track around a white
 * centre with the `value/total` label in tabular figures.
 */
export function ProgressRing({ value, total, size = 46 }: { value: number; total: number; size?: number }) {
  const id = useSvgId("ring");
  const stroke = Math.max(4, Math.round(size * 0.11));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <View
      style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, Depth.ring]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${value}/${total}`}
      accessibilityValue={{ min: 0, max: total, now: value }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset={0} stopColor={Glow.fill[0]} />
            <Stop offset={1} stopColor={Glow.fill[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#FFFFFF" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(114,92,191,0.13)" strokeWidth={stroke} fill="none" />
        {ratio > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c * ratio} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <RText variant="label" latin color={Violet[700]} style={{ fontSize: Math.max(11, Math.round(size * 0.27)), lineHeight: Math.round(size * 0.36) }}>
        {`${value}/${total}`}
      </RText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Platform.OS === "android" ? "#FFFFFF" : undefined,
  },
});
