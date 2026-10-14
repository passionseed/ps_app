import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { Depth, Gem } from "../../lib/theme";
import { Icon, type IconName } from "./Icons";
import { useSvgId } from "./svgId";

/**
 * Glossy violet gem with a white icon (DESIGN.md v4). `circle` is the radial gem used in the
 * lists and headers; `tile` is the rounded-square gem (session, calendar) with a linear
 * face. Both carry a top highlight and a violet drop shadow. Decorative: hidden from a11y.
 */
export function GemIcon({
  icon,
  size = 30,
  shape = "circle",
  iconSize,
  muted = false,
  style,
  children,
}: {
  icon?: IconName;
  size?: number;
  shape?: "circle" | "tile";
  iconSize?: number;
  /** Disabled look (control grey). */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Custom content instead of an icon (e.g. a spinner or a number). */
  children?: React.ReactNode;
}) {
  const id = useSvgId("gem");
  const radius = shape === "circle" ? size / 2 : Math.round(size * 0.33);
  const glyph = iconSize ?? Math.round(size * (shape === "circle" ? 0.5 : 0.45));
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: radius },
        // Android elevation needs a background to cast from; the gem face covers it.
        Platform.OS === "android" && { backgroundColor: muted ? "#8C89A0" : Gem.tile[1] },
        !muted && (shape === "circle" ? Depth.gem : Depth.tile),
        style,
      ]}
      aria-hidden
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          {shape === "circle" ? (
            // radial-gradient(circle at 35% 30%, Gem.orb stops), farthest-corner
            <RadialGradient id={`${id}f`} cx="35%" cy="30%" fx="35%" fy="30%" r="95.5%">
              {Gem.orb.map((c, i) => (
                <Stop key={c} offset={Gem.orbLocations[i]} stopColor={muted ? "#A4A2B7" : c} />
              ))}
            </RadialGradient>
          ) : (
            <LinearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor={muted ? "#A4A2B7" : Gem.tile[0]} />
              <Stop offset={1} stopColor={muted ? "#8C89A0" : Gem.tile[1]} />
            </LinearGradient>
          )}
          <LinearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={shape === "circle" ? 0.75 : 0.45} />
            <Stop offset={0.32} stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {shape === "circle" ? (
          <>
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id}f)`} />
            <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.8} fill="none" stroke={`url(#${id}h)`} strokeWidth={1.4} />
          </>
        ) : (
          <>
            <Rect x={0} y={0} width={size} height={size} rx={radius} fill={`url(#${id}f)`} />
            <Rect x={0.6} y={0.6} width={size - 1.2} height={size - 1.2} rx={radius - 0.6} fill="none" stroke={`url(#${id}h)`} strokeWidth={1.2} />
          </>
        )}
      </Svg>
      <View style={styles.center}>{children ?? (icon ? <Icon name={icon} size={glyph} color="#FFFFFF" strokeWidth={2.4} /> : null)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
