# Flashy Splash Screen Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create an atmospheric, multi-layered splash screen animation inspired by the PassionSeed "Dawn & Dusk" design system with rising sun effects, floating orbs, and ember particles.

**Architecture:** Replace the current simple logo + ring animation with a layered atmospheric background featuring: (1) gradient sky background, (2) animated floating glow orbs, (3) rising ember particles, (4) pulsing logo with glow effect, (5) shimmer overlay. Uses React Native Animated API with prime-number durations for organic, non-repeating motion.

**Tech Stack:** React Native, Expo, React Native Animated API, LinearGradient (expo-linear-gradient)

---

## Design Reference

From PassionSeed UI Design System:

### Dawn Theme (Students)
- Background gradient: Deep blue-black → cool purple → soft rose
- Primary accent: `#3b82f6` → `#6366f1` → `#a855f7`
- Gold horizon glow: `rgba(254, 217, 92, 0.12)`
- Cloud orbs: Blue/lavender tints with blur

### Animation Principles
- **Easing:** `cubic-bezier(0.05, 0.7, 0.35, 0.99)` for tension builds
- **Prime durations:** 4231ms, 5711ms for infinite pulses (never sync)
- **Layer order:** Background → Clouds → Horizon glow → Particles → Content

---

## Task 1: Create Atmospheric Background Component

**Files:**
- Create: `app/components/AtmosphericBackground.tsx`

**Step 1: Create the base background component with gradient and animated orbs**

```tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export function AtmosphericBackground() {
  // Animated values for floating orbs
  const orb1X = useRef(new Animated.Value(0)).current;
  const orb1Y = useRef(new Animated.Value(0));
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
        colors={['#1a0a2e', '#2d1449', '#4a1d6b', '#6b2d5b', '#8b3a4a', '#c45c3a', '#e87a3a', '#fbbf24']}
        locations={[0, 0.25, 0.45, 0.6, 0.7, 0.85, 0.95, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Left cloud - purple-violet mass */}
      <Animated.View
        style={[
          styles.cloudLeft,
          orb1Style,
        ]}
      />

      {/* Right cloud - amber-rose mass */}
      <Animated.View
        style={[
          styles.cloudRight,
          orb2Style,
        ]}
      />

      {/* Radial glow from bottom center */}
      <View style={styles.horizonGlow} />

      {/* Top fade to deep space */}
      <LinearGradient
        colors={['rgba(26, 10, 46, 0.8)', 'transparent']}
        locations={[0, 0.4]}
        style={styles.topFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cloudLeft: {
    position: 'absolute',
    left: '-20%',
    top: '5%',
    width: '70%',
    height: '70%',
    backgroundColor: 'rgba(160, 80, 220, 0.35)',
    borderRadius: 999,
    opacity: 0.75,
    transform: [{ scale: 1.5 }],
  },
  cloudRight: {
    position: 'absolute',
    right: '-20%',
    top: '8%',
    width: '70%',
    height: '70%',
    backgroundColor: 'rgba(220, 80, 60, 0.30)',
    borderRadius: 999,
    opacity: 0.70,
    transform: [{ scale: 1.5 }],
  },
  horizonGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 107, 74, 0.15)',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
});
```

**Step 2: Test the component renders without errors**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add app/components/AtmosphericBackground.tsx
git commit -m "feat: add atmospheric background component with animated orbs"
```

---

## Task 2: Create Rising Particles Component

**Files:**
- Create: `app/components/RisingParticles.tsx`

**Step 1: Create particle system with rising ember dots**

```tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function RisingParticles({ count = 15 }: { count?: number }) {
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
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fbbf24',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
```

**Step 2: Test the component**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add app/components/RisingParticles.tsx
git commit -m "feat: add rising particles component with ember effect"
```

---

## Task 3: Create Shimmer Overlay Component

**Files:**
- Create: `app/components/ShimmerOverlay.tsx`

**Step 1: Create diagonal shimmer animation**

```tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

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
            transform: [
              { translateX },
              { rotate: '-15deg' },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    position: 'absolute',
    top: -height,
    bottom: -height,
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
});
```

**Step 2: Commit**

```bash
git add app/components/ShimmerOverlay.tsx
git commit -m "feat: add shimmer overlay component"
```

---

## Task 4: Update AppLaunchScreen with New Animation

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Import new components and update AppLaunchScreen**

Replace the current `AppLaunchScreen` function with:

```tsx
function AppLaunchScreen() {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // Logo fades in and scales up
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 12,
          stiffness: 100,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Glow appears
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(glowScale, {
          toValue: 1,
          damping: 10,
          stiffness: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous glow pulse (prime duration for organic feel)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 4231,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 4231,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.launchRoot}>
      {/* Atmospheric background */}
      <AtmosphericBackground />
      
      {/* Rising particles */}
      <RisingParticles count={12} />
      
      {/* Shimmer overlay */}
      <ShimmerOverlay />

      {/* Logo container */}
      <View style={styles.logoContainer}>
        {/* Glow effect behind logo */}
        <Animated.View
          style={[
            styles.logoGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        
        {/* Logo */}
        <Animated.Image
          source={require("../assets/passionseed-logo.png")}
          style={[
            styles.launchLogo,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Loading indicator */}
      <View style={styles.launchFooter}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    </View>
  );
}
```

**Step 2: Add imports at top of file**

Add to imports:
```tsx
import { AtmosphericBackground } from "./components/AtmosphericBackground";
import { RisingParticles } from "./components/RisingParticles";
import { ShimmerOverlay } from "./components/ShimmerOverlay";
```

**Step 3: Update styles**

Replace launch screen styles:
```tsx
  launchRoot: {
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
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(251, 191, 36, 0.3)",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  launchLogo: {
    width: 120,
    height: 120,
    zIndex: 2,
  },
  launchFooter: {
    position: "absolute",
    bottom: 60,
    zIndex: 10,
  },
```

**Step 4: Test the app launches without errors**

Run: `npx expo start --ios` (or android)
Expected: App launches with new splash screen animation

**Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: integrate new splash screen with atmospheric effects"
```

---

## Task 5: Add Grid Texture Overlay (Optional Polish)

**Files:**
- Modify: `app/components/AtmosphericBackground.tsx`

**Step 1: Add subtle grid texture**

Add to the AtmosphericBackground component after the topFade:

```tsx
      {/* Grid texture */}
      <View style={styles.gridTexture} />
```

Add to styles:
```tsx
  gridTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.04,
    backgroundColor: 'transparent',
    // Use a pattern or keep simple for performance
  },
```

**Step 2: Commit**

```bash
git add app/components/AtmosphericBackground.tsx
git commit -m "feat: add subtle grid texture to background"
```

---

## Summary

The new splash screen features:

1. **Atmospheric Background** - Multi-stop gradient from deep purple to sunrise gold
2. **Floating Cloud Orbs** - Two large blurred circles drifting at different speeds (18s and 22s cycles)
3. **Rising Particles** - 12 ember-like dots rising from bottom with fade in/out
4. **Shimmer Overlay** - Diagonal light sweep every 5 seconds
5. **Logo Animation** - Spring entrance with pulsing glow behind
6. **Prime Duration Pulses** - 4231ms glow pulse for organic, non-repeating motion

**Performance considerations:**
- All animations use `useNativeDriver: true`
- Particles are limited to 12 for mobile performance
- Cloud orbs use simple translate/scale transforms
- Shimmer is a single animated view

**Testing checklist:**
- [ ] Splash screen shows immediately on app launch
- [ ] Logo animates in with spring effect
- [ ] Background orbs float smoothly
- [ ] Particles rise and fade naturally
- [ ] No frame drops on mid-range devices
- [ ] Animation works on both iOS and Android
