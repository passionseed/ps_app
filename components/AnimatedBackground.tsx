import { Animated, Dimensions, StyleSheet } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  RadialGradient,
} from "react-native-svg";
import { useEffect, useRef } from "react";

const { width, height } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnimatedBackground() {
  const twinkles = Array.from({ length: 70 }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * (height * 0.7), // Stars reach a bit lower
    size: Math.random() * 2 + 0.5, // Different star sizes
    delay: Math.random() * 3000,
    duration: 1500 + Math.random() * 3000,
    animValue: useRef(new Animated.Value(Math.random())).current,
  }));

  useEffect(() => {
    twinkles.forEach((star) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(star.animValue, {
            toValue: 1,
            duration: star.duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(star.animValue, {
            toValue: 0.1,
            duration: star.duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []);

  return (
    <Animated.View style={StyleSheet.absoluteFillObject}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Deep Purple Starry Sky Gradient */}
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0a0514" stopOpacity="1" />
            <Stop offset="0.4" stopColor="#1a0b36" stopOpacity="1" />
            <Stop offset="0.8" stopColor="#3d1866" stopOpacity="1" />
            <Stop offset="1" stopColor="#67298a" stopOpacity="1" />
          </LinearGradient>

          {/* Moon Gradient */}
          <RadialGradient id="moonGrad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0.7" stopColor="#fff" stopOpacity="1" />
            <Stop offset="1" stopColor="#ffebb3" stopOpacity="0.8" />
          </RadialGradient>

          {/* River Gradient */}
          <LinearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#67298a" stopOpacity="1" />
            <Stop offset="1" stopColor="#22a8d3" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Sky */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#skyGrad)" />

        {/* Moon */}
        <Circle
          cx={width * 0.8}
          cy={height * 0.15}
          r={40}
          fill="url(#moonGrad)"
        />

        {/* Stars */}
        {twinkles.map((star, i) => (
          <AnimatedCircle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="#FFFCD6" // Yellowish-white star
            opacity={star.animValue}
          />
        ))}

        {/* Far Background Mountains */}
        <Path
          d={`M -50 ${height * 0.55} L ${width * 0.3} ${
            height * 0.38
          } L ${width * 0.6} ${height * 0.55} L ${width * 0.9} ${
            height * 0.4
          } L ${width + 50} ${height * 0.65} L ${width + 50} ${height} L -50 ${height} Z`}
          fill="#1c0b3b"
        />

        {/* Mid-Background Mountains */}
        <Path
          d={`M -20 ${height * 0.65} L ${width * 0.15} ${
            height * 0.5
          } L ${width * 0.5} ${height * 0.68} L ${width * 0.8} ${
            height * 0.52
          } L ${width + 50} ${height * 0.75} L ${width + 50} ${height} L -50 ${height} Z`}
          fill="#2d1252"
        />

        {/* Front Mountains/Hills */}
        <Path
          d={`M -50 ${height * 0.75} Q ${width * 0.25} ${height * 0.6} ${
            width * 0.55
          } ${height * 0.75} T ${width + 50} ${height * 0.7} L ${width + 50} ${
            height
          } L -50 ${height} Z`}
          fill="#471d73"
        />

        {/* Foreground terrain (darker) */}
        <Path
          d={`M -50 ${height * 0.88} Q ${width * 0.2} ${height * 0.8} ${
            width * 0.4
          } ${height * 0.9} T ${width + 50} ${height * 0.85} L ${width + 50} ${
            height
          } L -50 ${height} Z`}
          fill="#170530"
        />

        {/* Beautiful winding river */}
        <Path
          d={`M ${width * 0.55} ${height * 0.68} Q ${width * 0.45} ${
            height * 0.75
          } ${width * 0.5} ${height * 0.8} T ${width * 0.35} ${
            height * 0.95
          } T -10 ${height} L ${width * 0.3} ${height} Q ${width * 0.5} ${height * 0.95} ${width * 0.55} ${height * 0.85} T ${width * 0.55} ${height * 0.75} Z`}
          fill="url(#riverGrad)"
        />

        {/* River Reflection Accents */}
        <Path
          d={`M ${width * 0.5} ${height * 0.72} Q ${width * 0.47} ${height * 0.76} ${width * 0.52} ${height * 0.78}`}
          stroke="#fff0cf"
          strokeWidth="2"
          opacity="0.3"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.42} ${height * 0.82} Q ${width * 0.45} ${height * 0.86} ${width * 0.4} ${height * 0.9}`}
          stroke="#fff0cf"
          strokeWidth="3"
          opacity="0.4"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
