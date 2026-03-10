import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText as Text } from "../AppText";
import Svg, { Circle } from "react-native-svg";

interface DonutScoreProps {
  score: number | null;
  label: string;
  icon: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export function DonutScore({
  score,
  label,
  icon,
  color,
  size = 80,
  strokeWidth = 7,
}: DonutScoreProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? score / 100 : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.container}>
      <View style={[styles.donutWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          {score !== null && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          )}
        </Svg>
        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={styles.scoreIcon}>{icon}</Text>
          <Text
            style={[
              styles.scoreValue,
              { color: score !== null ? "#111" : "#bbb" },
            ]}
          >
            {score !== null ? score : "—"}
          </Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 6,
  },
  donutWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  scoreIcon: {
    fontSize: 12,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
