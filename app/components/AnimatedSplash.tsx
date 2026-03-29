import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { height } = Dimensions.get("window");

export function AnimatedSplash() {
  // Gradient animation - moves upward
  const gradientY = useRef(new Animated.Value(0)).current;
  
  // Logo animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous gradient movement - subtle upward drift
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientY, {
          toValue: -50,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(gradientY, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo entrance
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 12,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo pulse - continuous breathing effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const gradientStyle = {
    transform: [{ translateY: gradientY }],
  };

  const logoStyle = {
    opacity: logoOpacity,
    transform: [
      { scale: logoScale },
      { scale: logoPulse },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Animated gradient background */}
      <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
        <LinearGradient
          colors={[
            "#F3F4F6",      // Cool grey (top)
            "#E8E4F3",      // Light purple
            "#F3F4F6",      // Cool grey
            "#EDE9FE",      // Soft lavender
            "#F5F3FF",      // Light violet
            "#F3F4F6",      // Cool grey (bottom)
          ]}
          locations={[0, 0.15, 0.35, 0.55, 0.75, 1]}
          style={[StyleSheet.absoluteFill, { height: height + 100 }]}
        />
      </Animated.View>

      {/* Logo container */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        {/* Glow behind logo */}
        <View style={styles.logoGlow} />
        
        {/* Logo */}
        <Image
          source={require("../../assets/passionseed-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
  },
  logo: {
    width: 100,
    height: 100,
    zIndex: 2,
  },
});
