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
    variant === "bold" ? "LibreFranklin_Bold" : "LibreFranklin_Regular";
  const fontSize =
    typeof resolvedStyle.fontSize === "number" ? resolvedStyle.fontSize : 16;

  if (hasThai) {
    fontFamily =
      variant === "bold" ? "BaiJamjuree_700Bold" : "BaiJamjuree_400Regular";
  }

  return (
    <Text
      style={[
        styles.base,
        { fontFamily },
        hasThai && {
          lineHeight: Math.max(fontSize * 1.45, fontSize + 8),
          includeFontPadding: true,
          paddingTop: 1,
          ...(Platform.OS === "android"
            ? { textAlignVertical: "center" as const }
            : {}),
        },
        style,
      ]}
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
