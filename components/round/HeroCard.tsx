import React from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from "react-native-svg";
import { Depth, Hero } from "../../lib/theme";
import { splitCardStyle } from "./layout";
import { useSvgId } from "./svgId";

/** The big faded numeral in the top-right corner (gradient text, decorative). */
function Watermark({ text }: { text: string }) {
  const id = useSvgId("wm");
  const size = 128;
  const width = Math.round(size * 0.64 * Math.max(1, text.length)) + 8;
  return (
    <View style={styles.watermark} aria-hidden>
      <Svg width={width} height={size}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#8B6BFF" stopOpacity={0.2} />
            <Stop offset={0.85} stopColor="#8B6BFF" stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <SvgText
          x={width - 4}
          y={size * 0.86}
          textAnchor="end"
          fontSize={size}
          fontWeight="700"
          fontFamily="LibreFranklin_700Bold"
          fill={`url(#${id})`}
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
}

/**
 * Hero card (DESIGN.md v4): the one raised surface per screen. White -> lavender gradient
 * (160deg), an inner top highlight, a deep violet shadow and an optional big faded numeral.
 */
export function HeroCard({
  children,
  watermark,
  style,
  padding = 18,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  watermark?: string;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { outer, inner } = splitCardStyle(style);
  const surface = (
    <View style={styles.clip}>
      <LinearGradient
        colors={[...Hero.colors]}
        locations={[...Hero.locations]}
        start={Hero.start}
        end={Hero.end}
        style={[StyleSheet.absoluteFill, styles.none]}
      />
      {watermark ? <Watermark text={watermark} /> : null}
      <View style={[styles.rim, styles.none]} />
      <View style={[{ padding }, inner]}>{children}</View>
    </View>
  );
  if (!onPress) return <View style={[styles.shadow, Depth.hero, outer]}>{surface}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.shadow, Depth.hero, outer, pressed && styles.pressed]}
    >
      {surface}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: Hero.radius,
    // Android elevation needs a background to cast from.
    backgroundColor: Platform.OS === "android" ? "#FFFFFF" : undefined,
  },
  clip: { borderRadius: Hero.radius, overflow: "hidden" },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Hero.radius,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(109,63,240,0.06)",
  },
  watermark: { position: "absolute", right: -6, top: -26 },
  none: { pointerEvents: "none" },
  pressed: { transform: [{ translateY: 1 }], ...Depth.raised },
});
