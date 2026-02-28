import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

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
  let fontFamily =
    variant === "bold" ? "LibreFranklin_Bold" : "LibreFranklin_Regular";

  if (typeof children === "string" && isThai(children)) {
    fontFamily = variant === "bold" ? "GoogleSans_Bold" : "GoogleSans_Regular";
  } else if (Array.isArray(children)) {
    // If any part of the array is Thai, we might want to switch or just let it be.
    // Simplifying: if the first string part is Thai, use Google Sans.
    const hasThai = children.some(
      (child) => typeof child === "string" && isThai(child),
    );
    if (hasThai) {
      fontFamily =
        variant === "bold" ? "GoogleSans_Bold" : "GoogleSans_Regular";
    }
  }

  return (
    <Text style={[styles.base, { fontFamily }, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: "#fff",
  },
});
