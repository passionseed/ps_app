import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export function ShimmerOverlay() {
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: width,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }, { rotate: "-15deg" }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    position: "absolute",
    top: -height,
    bottom: -height,
    width: 200,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
});
