import React from "react";
import { View, StyleSheet } from "react-native";

export default function SkiaBackground() {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "#0a0514" },
      ]}
      pointerEvents="none"
    />
  );
}
