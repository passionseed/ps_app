import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextProps,
  StyleProp,
  TextStyle,
} from "react-native";

interface AppTextProps extends TextProps {
  variant?: "regular" | "bold";
}

const isThai = (text: string) => {
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text);
};

export const AppText: React.FC<AppTextProps> = ({
  children,
  style,
  variant = "regular",
  ...props
}) => {
  const resolvedStyle = StyleSheet.flatten(style as StyleProp<TextStyle>) || {};
  const hasThai = (() => {
    if (typeof children === "string") {
      return isThai(children);
    }

    if (Array.isArray(children)) {
      return children.some(
        (child) => typeof child === "string" && isThai(child),
      );
    }

    return false;
  })();

  let fontFamily =
    variant === "bold" ? "LibreFranklin_700Bold" : "LibreFranklin_400Regular";
  const fontSize =
    typeof resolvedStyle.fontSize === "number" ? resolvedStyle.fontSize : 16;

  if (hasThai) {
    fontFamily =
      variant === "bold" ? "BaiJamjuree_700Bold" : "BaiJamjuree_400Regular";
  }

  // Thai stacks vowel+tone marks (นี้ = น+ี+้); a too-tight lineHeight from the
  // caller's `style` clips the top mark. Force enough headroom — take the max with
  // whatever the caller asked for, and apply it AFTER `style` so it always wins.
  const providedLine =
    typeof resolvedStyle.lineHeight === "number" ? resolvedStyle.lineHeight : 0;
  const thaiOverride = hasThai
    ? {
        lineHeight: Math.max(fontSize * 1.5, fontSize + 10, providedLine),
        includeFontPadding: true,
        paddingTop: 2,
        ...(Platform.OS === "android"
          ? { textAlignVertical: "center" as const }
          : {}),
      }
    : null;

  return (
    <Text
      style={[styles.base, { fontFamily }, style, thaiOverride]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: "#fff",
  },
});
