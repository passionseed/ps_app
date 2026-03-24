import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function RisingParticles({ count = 12 }: { count?: number }) {
  // Generate random particles
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      size: 2 + Math.random() * 3,
      duration: 8000 + Math.random() * 6000,
      delay: Math.random() * 5000,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, [count]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle) => (
        <ParticleDot key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

function ParticleDot({ particle }: { particle: Particle }) {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        // Fade in and rise
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -50,
            duration: particle.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: particle.opacity,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.delay(particle.duration - 1000),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Reset delay
        Animated.delay(particle.delay),
      ])
    );

    // Start with initial delay
    setTimeout(() => {
      animation.start();
    }, particle.delay);

    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          width: particle.size,
          height: particle.size,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#fbbf24",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
