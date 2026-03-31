import React, { useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SplashSkiaAtmosphere } from "./SplashSkiaAtmosphere";

export function AnimatedSplash() {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const logoBreath = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 140 });
    logoBreath.value = withRepeat(
      withSequence(
        withTiming(1.035, {
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1, {
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value * logoBreath.value }],
  }));

  return (
    <View style={styles.container}>
      <SplashSkiaAtmosphere />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <View style={styles.logoGlow} />
        <Image
          source={require("../assets/passionseed-logo.png")}
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
    backgroundColor: "#F3F4F6",
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
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  logo: {
    width: 100,
    height: 100,
    zIndex: 2,
  },
});
