import React from "react";
import { Platform, StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { Ink } from "../../lib/theme";

/**
 * Text for SHIFT round screens (DESIGN.md v3 section 3): Bai Jamjuree for Thai, Libre Franklin for
 * Latin words, tags and numbers. Thai gets enough line height so stacked marks never clip at
 * 200% text. Default colour is ink (AppText defaults to white, which is wrong on lavender).
 */
export type RTextVariant = "display" | "title" | "h3" | "body" | "meta" | "label" | "tag" | "small";

const VARIANTS: Record<RTextVariant, { fontSize: number; weight: "400" | "500" | "700"; color: string; lineHeight?: number }> = {
  display: { fontSize: 30, weight: "500", color: Ink.primary, lineHeight: 38 },
  title: { fontSize: 22, weight: "700", color: Ink.primary, lineHeight: 30 },
  h3: { fontSize: 18, weight: "700", color: Ink.primary, lineHeight: 26 },
  body: { fontSize: 15, weight: "400", color: Ink.secondary, lineHeight: 23 },
  meta: { fontSize: 13, weight: "500", color: Ink.tertiary, lineHeight: 20 },
  label: { fontSize: 15, weight: "700", color: Ink.primary, lineHeight: 22 },
  tag: { fontSize: 12, weight: "700", color: "#5B2FD6", lineHeight: 16 },
  small: { fontSize: 13, weight: "400", color: Ink.secondary, lineHeight: 19 },
};

const THAI = /[฀-๿]/;

function containsThai(children: React.ReactNode): boolean {
  if (typeof children === "string") return THAI.test(children);
  if (typeof children === "number") return false;
  if (Array.isArray(children)) return children.some(containsThai);
  return false;
}

function family(thai: boolean, weight: "400" | "500" | "700"): string {
  if (thai) return weight === "700" ? "BaiJamjuree_700Bold" : weight === "500" ? "BaiJamjuree_500Medium" : "BaiJamjuree_400Regular";
  return weight === "700" ? "LibreFranklin_700Bold" : "LibreFranklin_400Regular";
}

export type RTextProps = TextProps & {
  variant?: RTextVariant;
  weight?: "400" | "500" | "700";
  color?: string;
  /** Force Libre Franklin with tabular figures (numbers, tags). */
  latin?: boolean;
  style?: StyleProp<TextStyle>;
};

export function RText({ variant = "body", weight, color, latin, style, children, ...rest }: RTextProps) {
  const v = VARIANTS[variant];
  const w = weight ?? v.weight;
  const thai = !latin && containsThai(children);
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = typeof flat.fontSize === "number" ? flat.fontSize : v.fontSize;
  const requested = typeof flat.lineHeight === "number" ? flat.lineHeight : v.lineHeight ?? fontSize * 1.4;
  const lineHeight = thai ? Math.max(requested, Math.round(fontSize * 1.5)) : requested;
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: family(thai, w),
          fontSize: v.fontSize,
          color: color ?? v.color,
          fontVariant: latin ? ["tabular-nums"] : undefined,
        },
        variant === "tag" && !thai ? { letterSpacing: 0.7 } : null,
        style,
        { lineHeight },
        thai && Platform.OS === "android" ? { includeFontPadding: true } : null,
      ]}
    >
      {children}
    </Text>
  );
}
