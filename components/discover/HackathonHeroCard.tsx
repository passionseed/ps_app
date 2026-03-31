import { useEffect, useCallback } from "react";
import { View, Pressable, Image, StyleSheet, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  withSequence,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { AppText as Text } from "../AppText";
import { styles } from "./discoverStyles";
import {
  Canvas,
  Text as SkiaText,
  useFont,
  LinearGradient as SkiaLinearGradient,
  vec,
  Fill,
  Mask,
  Rect as SkiaRect,
  Group,
  BlurMask,
} from "@shopify/react-native-skia";

const CinematicGlow = ({
  color,
  size,
  animationVal,
  xRange,
  yRange,
  baseX,
  baseY,
  scaleRange,
}: {
  color: string;
  size: number;
  animationVal: SharedValue<number>;
  xRange: [number, number];
  yRange: [number, number];
  baseX: number;
  baseY: number;
  scaleRange: [number, number];
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: baseX,
      top: baseY,
      width: size,
      height: size,
      transform: [
        { translateX: interpolate(animationVal.value, [0, 1], xRange) },
        { translateY: interpolate(animationVal.value, [0, 1], yRange) },
        { scale: interpolate(animationVal.value, [0, 1], scaleRange) },
      ],
      opacity: interpolate(animationVal.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
    };
  });

  return (
    <Reanimated.View style={animatedStyle} pointerEvents="none">
      <Svg height="100%" width="100%">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <Stop offset="30%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="70%" stopColor={color} stopOpacity="0.05" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
      </Svg>
    </Reanimated.View>
  );
};

export function HackathonHeroCard({ isThai }: { isThai: boolean }) {
  const { width } = useWindowDimensions();
  const float1 = useSharedValue(0);
  const float2 = useSharedValue(0);
  const float3 = useSharedValue(0);
  
  // Parallax elements for underwater feel
  const dust1 = useSharedValue(0);
  const dust2 = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);

  const press = useSharedValue(0);
  const logoAnim = useSharedValue(0);
  const subtitleAnim = useSharedValue(0);
  const arrowPulse = useSharedValue(0);

  // Shimmer animation for Enter text - cinematic sweep
  const shimmer = useSharedValue(0);
  const textShimmer = useSharedValue(-1);

  useEffect(() => {
    // Complex asynchronous floating for cinematic flares
    float1.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.ease) }), -1, true);
    float2.value = withRepeat(withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.ease) }), -1, true);
    float3.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.ease) }), -1, true);

    // Constant smooth linear shifting for underwater particles and light rays
    dust1.value = withRepeat(withTiming(1, { duration: 25000, easing: Easing.linear }), -1, false);
    dust2.value = withRepeat(withTiming(1, { duration: 32000, easing: Easing.linear }), -1, false);
    
    // Slow drifting "water surface" caustic reflections
    wave1.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }), -1, true);
    wave2.value = withRepeat(withTiming(1, { duration: 19000, easing: Easing.inOut(Easing.sin) }), -1, true);

    // Cinematic shimmer sweep across text
    textShimmer.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );

    // 1. Logo glow-up animation (starts immediately)
    logoAnim.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) });

    // 2. Subtitle handwriting wipe animation (starts after logo flash, at ~700ms)
    subtitleAnim.value = withDelay(
      700,
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) })
    );
  }, []);

  const cardPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.96]) }],
    opacity: interpolate(press.value, [0, 1], [1, 0.9]),
  }));

  // Match the titleGlowUp keyframes from CSS
  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logoAnim.value, [0, 0.5, 1], [0, 1, 1]),
    transform: [
      { scale: interpolate(logoAnim.value, [0, 0.5, 1], [0.8, 1.05, 1]) },
    ],
  }));

  // Match the clipPath: inset(0 100% 0 0) wipe - CINEMATIC
  const subtitleWipeStyle = useAnimatedStyle(() => ({
    width: `${interpolate(subtitleAnim.value, [0, 1], [0, 100])}%`,
    overflow: "hidden",
    alignItems: "center",
  }));

  // Fade in the bottom content naturally after title
  const bottomContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(subtitleAnim.value, [0.5, 1], [0, 1]),
    transform: [
      { translateY: interpolate(subtitleAnim.value, [0.5, 1], [10, 0]) }
    ]
  }));

  // Cinematic text shimmer - sweep effect
  const textShimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(textShimmer.value, [-1, 1], [-100, 100]) }
    ]
  }));

  // Foreground fast particles moving diagonally up
  const particle1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(dust1.value, [0, 1], [-width * 0.2, width * 1.2]) },
      { translateY: interpolate(dust1.value, [0, 1], [200, -100]) },
    ]
  }));

  // Background slow particles moving diagonally up other way
  const particle2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(dust2.value, [0, 1], [width * 1.2, -width * 0.2]) },
      { translateY: interpolate(dust2.value, [0, 1], [250, -50]) },
    ]
  }));

  // Light rays filtering from top "surface"
  const waveCausticStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wave1.value, [0, 1], [0.1, 0.3]),
    transform: [
      { translateX: interpolate(wave1.value, [0, 1], [-30, 30]) },
      { scaleY: interpolate(wave2.value, [0, 1], [1, 1.4]) }
    ]
  }));

  const onHeroPress = useCallback(async () => {
    // Heavy "dooming" haptic pattern
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid), 350);

    // Wait slightly to let the user feel the dooming effect before navigating
    setTimeout(() => {
      router.push("/hackathon-program");
    }, 400);
  }, []);

  return (
    <View style={styles.hackathonHeroWrap}>
      {/* Letterbox bars for the movie look */}
      <View style={styles.hackathonLetterboxTop} />
      <View style={styles.hackathonLetterboxBottom} />

      <Pressable
        onPress={onHeroPress}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });
        }}
        style={{ flex: 1 }}
      >
        <Reanimated.View style={[styles.hackathonHero, cardPressStyle]}>
          <LinearGradient
            colors={["#01040A", "#030B17", "#010814"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Cinematic Soft Glows via SVG */}
          <CinematicGlow
            color="#00F0FF"
            size={400}
            animationVal={float1}
            xRange={[-50, 50]}
            yRange={[-20, 30]}
            baseX={-150}
            baseY={-100}
            scaleRange={[0.8, 1.2]}
          />
          <CinematicGlow
            color="#7B2CBF"
            size={500}
            animationVal={float2}
            xRange={[40, -60]}
            yRange={[-40, 20]}
            baseX={width * 0.4}
            baseY={-150}
            scaleRange={[0.9, 1.3]}
          />
          <CinematicGlow
            color="#00E5FF"
            size={350}
            animationVal={float3}
            xRange={[-30, 60]}
            yRange={[40, -40]}
            baseX={0}
            baseY={80}
            scaleRange={[1, 1.4]}
          />

          {/* Underwater Ray / Caustic Effect */}
          <Reanimated.View style={[{ position: 'absolute', top: -50, left: 0, right: 0, height: 250 }, waveCausticStyle]} pointerEvents="none">
             <LinearGradient
                colors={["rgba(0,240,255,0.25)", "rgba(0,102,255,0.05)", "transparent"]}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
             />
          </Reanimated.View>

          {/* Floating Underwater Particles/Dust */}
          <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,240,255,0.9)', shadowColor: '#00F0FF', shadowOpacity: 1, shadowRadius: 6 }, particle1Style]} pointerEvents="none" />
          <Reanimated.View style={[{ position: 'absolute', left: 50, top: 40, width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(0,255,204,0.9)', shadowColor: '#00FFCC', shadowOpacity: 1, shadowRadius: 5 }, particle1Style]} pointerEvents="none" />
          <Reanimated.View style={[{ position: 'absolute', left: -20, top: 80, width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(123,44,191,0.8)', shadowColor: '#7B2CBF', shadowOpacity: 1, shadowRadius: 8 }, particle2Style]} pointerEvents="none" />
          <Reanimated.View style={[{ position: 'absolute', left: 80, top: 120, width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.8)', shadowColor: '#fff', shadowOpacity: 1, shadowRadius: 4 }, particle2Style]} pointerEvents="none" />

          {/* Heavy Vignette */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,6,15,0.4)', zIndex: 1 }]} pointerEvents="none" />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.95)",
              "rgba(0,0,0,0.4)",
              "transparent",
              "rgba(0,0,0,0.4)",
              "rgba(0,0,0,0.95)",
            ]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            style={styles.hackathonVignette}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.9)",
              "rgba(0,0,0,0.2)",
              "transparent",
              "rgba(0,0,0,0.2)",
              "rgba(0,0,0,0.9)",
            ]}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.hackathonVignette, { zIndex: 1 }]}
            pointerEvents="none"
          />

          <Reanimated.View style={[styles.hackathonHeroContent]}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <View style={{ alignItems: "center", width: "100%" }}>
                <Reanimated.View style={[logoStyle, { width: "100%", height: 110, alignItems: "center" }]}>
                  <Image
                    source={require("../../assets/HackLogo.png")}
                    style={styles.hackathonLogo}
                    resizeMode="contain"
                  />
                </Reanimated.View>
                
                <Reanimated.View style={subtitleWipeStyle}>
                  {/* Provide a fixed width wrapper slightly larger than text so it doesn't wrap during wipe */}
                  <View style={{ width: 400, alignItems: "center" }}>
                    <Text style={[styles.hackathonSubtitle, { fontSize: 12, letterSpacing: 2 }]} numberOfLines={1}>
                      Preventive & Predictive Healthcare
                    </Text>
                  </View>
                </Reanimated.View>
              </View>
            </View>

            <Reanimated.View style={[styles.hackathonBottomRow, bottomContentStyle]}>
              <Pressable onPress={onHeroPress} style={{ alignItems: "center" }}>
                {/* Cinematic shimmer text effect */}
                <View style={{ overflow: "hidden", borderRadius: 4 }}>
                  <Reanimated.View style={[textShimmerStyle, { flexDirection: "row", alignItems: "center" }]}>
                    <LinearGradient
                      colors={[
                        "transparent",
                        "rgba(255,255,255,0.8)",
                        "rgba(255,255,255,1)",
                        "rgba(255,255,255,0.8)",
                        "transparent"
                      ]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ width: 60, height: 24 }}
                    />
                  </Reanimated.View>
                </View>
                <Text style={[styles.hackathonSubtitle, { fontSize: 18, color: "rgba(255,255,255,0.9)", letterSpacing: 4, textTransform: "uppercase", marginTop: -24 }]}>
                  {isThai ? "เข้าร่วม" : "Enter"}
                </Text>
              </Pressable>
            </Reanimated.View>
          </Reanimated.View>
        </Reanimated.View>
      </Pressable>
    </View>
  );
}
