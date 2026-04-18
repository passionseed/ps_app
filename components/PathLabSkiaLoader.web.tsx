import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Accent } from "../lib/theme";

export type PathLabSkiaLoaderSize = "large" | "small" | "tiny";

type Props = {
  size?: PathLabSkiaLoaderSize;
  style?: any;
};

const SIZE_MAP = {
  large: 108,
  small: 44,
  tiny: 24,
};

export function PathLabSkiaLoader({ size = "large", style }: Props) {
  const dim = SIZE_MAP[size];

  return (
    <View
      style={[
        styles.container,
        { width: dim, height: dim },
        style,
      ]}
    >
      <ActivityIndicator
        size={size === "large" ? "large" : "small"}
        color={Accent.purple}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
