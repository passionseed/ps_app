import { useState, useRef, useCallback, useEffect } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { SvgXml, Svg, Defs, RadialGradient, Stop, Polygon } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";

const svgs = [
  `<svg width="130" height="254" viewBox="0 0 130 254" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="63.6232" cy="27.6719" r="24.3776" stroke="black" stroke-width="6.58854"/><path d="M89.4513 23.8411L122.451 33.5L66.2586 85.3411M66.2586 158.841L11.9513 252.341M66.2586 158.841L126.951 252.341M66.2586 158.841V85.3411M66.2586 85.3411L4.95128 35.8411L40.5633 19.3411M66.2586 85.3411V54.026" stroke="black" stroke-width="5.27083"/></svg>`,
  `<svg width="119" height="254" viewBox="0 0 119 254" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="27.6719" cy="27.6719" r="24.3776" stroke="black" stroke-width="6.58854"/><path d="M30.3073 54.026L23.0599 81.6979M39.5313 158.125L4.612 252.341M39.5313 158.125L96.8516 252.341M39.5313 158.125L23.0599 81.6979M23.0599 81.6979L106.076 21.7422M23.0599 81.6979L117.276 48.0964" stroke="black" stroke-width="5.27083"/></svg>`,
  `<svg width="143" height="256" viewBox="0 0 143 256" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="71.1615" cy="30.068" r="24.3776" stroke="black" stroke-width="6.58854"/><path d="M73.7969 56.4221L76.4824 86.7294M83.0209 160.521L48.1016 254.737M83.0209 160.521L106.081 254.737M83.0209 160.521L76.4824 86.7294M76.4824 86.7294L140.341 1.73718M76.4824 86.7294L1.98181 1.73718" stroke="black" stroke-width="5.27083"/></svg>`,
  `<svg width="119" height="254" viewBox="0 0 119 254" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="27.6719" cy="27.6719" r="24.3776" transform="matrix(-1 0 0 1 118.161 0)" stroke="black" stroke-width="6.58854"/><path d="M87.8541 54.026L95.1015 81.6979M78.6301 158.125L113.549 252.341M78.6301 158.125L21.3098 252.341M78.6301 158.125L95.1015 81.6979M95.1015 81.6979L12.0858 21.7422M95.1015 81.6979L0.885312 48.0964" stroke="black" stroke-width="5.27083"/></svg>`,
];

const COLORS = [
  { r: 255, g: 230, b: 0 },
  { r: 255, g: 100, b: 200 },
  { r: 100, g: 200, b: 255 },
  { r: 180, g: 100, b: 255 },
  { r: 100, g: 255, b: 150 },
  { r: 255, g: 150, b: 50 },
];

export default function Page() {
  const { signInWithGoogle, loading: authLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [hypeActive, setHypeActive] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);

  const glowAnim = useRef(new Animated.Value(0)).current;
  const spotlightScale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const spotlightLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Line glow animation (loop)
  useEffect(() => {
    glowLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    glowLoopRef.current.start();
    return () => glowLoopRef.current?.stop();
  }, [glowAnim]);

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#BFFF00", "#9FE800"],
  });

  const handleHypePress = useCallback(() => {
    setHypeActive(true);
    setColorIdx(0);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    spotlightLoopRef.current?.stop();

    // Cycle colors
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % COLORS.length;
      setColorIdx(idx);
    }, 200);

    // Pulse spotlight scale
    spotlightLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(spotlightScale, {
          toValue: 1.15,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(spotlightScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    );
    spotlightLoopRef.current.start();

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      spotlightLoopRef.current?.stop();
      spotlightScale.setValue(1);
      setHypeActive(false);
      setColorIdx(0);
    }, 2500);
  }, [spotlightScale]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const c = COLORS[colorIdx];
  const spotlightOpacity = hypeActive ? 0.7 : 0.45;

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>prova</Text>
      </View>

      {/* Hero content */}
      <View style={styles.hero}>
        <Text style={styles.tagline}>
          Accountability that actually feels{" "}
        </Text>
        <View style={styles.goodRow}>
          <Text style={styles.tagline}>good</Text>
          <Animated.View
            style={[styles.goodUnderline, { backgroundColor: glowColor }]}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signInBtn,
            pressed && styles.signInBtnPressed,
          ]}
          onPress={async () => {
            setSigningIn(true);
            try {
              await signInWithGoogle();
            } catch (e) {
              console.error("Sign in error:", e);
              setSigningIn(false);
            }
          }}
          disabled={signingIn || authLoading}
        >
          {({ pressed }) => (
            <Text
              style={[styles.signInText, pressed && styles.signInTextPressed]}
            >
              {signingIn || authLoading ? <ActivityIndicator color="#111" /> : "Sign in"}
            </Text>
          )}
        </Pressable>

        <View style={styles.subText}>
          <Text style={styles.subLine}>Set goals, Add friends.</Text>
          <Text style={styles.subLine}>
            Post proof, Get{" "}
            <Text style={styles.hypeWord} onPress={handleHypePress}>
              hype
            </Text>
            , Keep going.
          </Text>
        </View>
      </View>

      {/* Stage */}
      <View style={styles.stage}>
        <View style={styles.figuresRow}>
          <SvgXml xml={svgs[0]} width={70} height={140} />
          <SvgXml xml={svgs[1]} width={64} height={140} />
          <View style={styles.stickman3Wrap}>
            <Animated.View
              style={[
                styles.spotlight,
                {
                  opacity: spotlightOpacity,
                  transform: [{ scale: spotlightScale }],
                },
              ]}
              pointerEvents="none"
            >
              <Svg width={160} height={220} viewBox="0 0 160 220">
                <Defs>
                  <RadialGradient
                    id="spotGrad"
                    cx="50%"
                    cy="15%"
                    rx="70%"
                    ry="75%"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(80,0) scale(1,1)"
                  >
                    <Stop offset="0%" stopColor={`rgb(${c.r},${c.g},${c.b})`} stopOpacity="0.9" />
                    <Stop offset="30%" stopColor={`rgb(${c.r},${c.g},${c.b})`} stopOpacity="0.5" />
                    <Stop offset="60%" stopColor={`rgb(${c.r},${c.g},${c.b})`} stopOpacity="0.15" />
                    <Stop offset="100%" stopColor={`rgb(${c.r},${c.g},${c.b})`} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Polygon
                  points="64,0 96,0 160,220 0,220"
                  fill="url(#spotGrad)"
                />
              </Svg>
            </Animated.View>
            <SvgXml xml={svgs[2]} width={77} height={140} />
          </View>
          <SvgXml xml={svgs[3]} width={64} height={140} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 40,
    color: "#111",
    letterSpacing: 2,
    fontWeight: "400",
    fontFamily: "Orbit_400Regular",
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flex: 1,
  },
  tagline: {
    fontSize: 32,
    lineHeight: 42,
    color: "#111",
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
  },
  goodRow: {
    position: "relative",
    alignSelf: "flex-start",
    marginBottom: 28,
  },
  goodUnderline: {
    position: "absolute",
    bottom: 2,
    left: 0,
    right: 0,
    height: 5,
    borderRadius: 3,
  },
  signInBtn: {
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  signInBtnPressed: {
    backgroundColor: "#111",
  },
  signInText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111",
  },
  signInTextPressed: {
    color: "#FDFFF5",
  },
  subText: {
    gap: 4,
  },
  subLine: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#111",
  },
  hypeWord: {
    cursor: "pointer",
  } as any,
  stage: {
    justifyContent: "flex-end",
    paddingBottom: 40,
    position: "relative",
  },
  stickman3Wrap: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  spotlight: {
    position: "absolute",
    bottom: 0,
  },
  figuresRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingHorizontal: 16,
  },
});
