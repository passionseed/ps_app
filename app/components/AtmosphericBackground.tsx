import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export function AtmosphericBackground() {
  // Animated values for floating orbs
  const orb1X = useRef(new Animated.Value(0)).current;
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb1Scale = useRef(new Animated.Value(1)).current;

  const orb2X = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb2Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Orb 1 animation - 18s cycle
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb1X, {
            toValue: 20,
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Y, {
            toValue: -10,
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Scale, {
            toValue: 1.08,
            duration: 9000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb1X, {
            toValue: 0,
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Y, {
            toValue: 0,
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Scale, {
            toValue: 1,
            duration: 9000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Orb 2 animation - 22s cycle (different timing for organic feel)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb2X, {
            toValue: -18,
            duration: 11000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Y, {
            toValue: 16,
            duration: 11000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Scale, {
            toValue: 1.04,
            duration: 11000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb2X, {
            toValue: 0,
            duration: 11000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Y, {
            toValue: 0,
            duration: 11000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Scale, {
            toValue: 1,
            duration: 11000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const orb1Style = {
    transform: [
      { translateX: orb1X },
      { translateY: orb1Y },
      { scale: orb1Scale },
    ],
  };

  const orb2Style = {
    transform: [
      { translateX: orb2X },
      { translateY: orb2Y },
      { scale: orb2Scale },
    ],
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base gradient - sunrise effect */}
      <LinearGradient
        colors={[
          "#1a0a2e",
          "#2d1449",
          "#4a1d6b",
          "#6b2d5b",
          "#8b3a4a",
          "#c45c3a",
          "#e87a3a",
          "#fbbf24",
        ]}
        locations={[0, 0.25, 0.45, 0.6, 0.7, 0.85, 0.95, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Left cloud - purple-violet mass */}
      <Animated.View style={[styles.cloudLeft, orb1Style]} />

      {/* Right cloud - amber-rose mass */}
      <Animated.View style={[styles.cloudRight, orb2Style]} />

      {/* Radial glow from bottom center */}
      <View style={styles.horizonGlow} />

      {/* Top fade to deep space */}
      <LinearGradient
        colors={["rgba(26, 10, 46, 0.8)", "transparent"]}
        locations={[0, 0.4]}
        style={styles.topFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cloudLeft: {
    position: "absolute",
    left: "-20%",
    top: "5%",
    width: "70%",
    height: "70%",
    backgroundColor: "rgba(160, 80, 220, 0.35)",
    borderRadius: 999,
    opacity: 0.75,
    transform: [{ scale: 1.5 }],
  },
  cloudRight: {
    position: "absolute",
    right: "-20%",
    top: "8%",
    width: "70%",
    height: "70%",
    backgroundColor: "rgba(220, 80, 60, 0.30)",
    borderRadius: 999,
    opacity: 0.7,
    transform: [{ scale: 1.5 }],
  },
  horizonGlow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255, 107, 74, 0.15)",
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
  },
});
