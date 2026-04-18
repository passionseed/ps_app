import React from "react";
import { View, StyleSheet } from "react-native";

export function SplashSkiaAtmosphere() {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "#F3F4F6" },
      ]}
      pointerEvents="none"
    />
  );
}
