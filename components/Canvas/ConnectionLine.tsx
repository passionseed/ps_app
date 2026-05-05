import React from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, Line, vec } from "@shopify/react-native-skia";
import type { StepType } from "../../types/journey";

const COLOR_MAP: Record<StepType, string> = {
  university: "#8B5CF6",
  internship: "#3B82F6",
  job: "#10B981",
};

interface ConnectionLineProps {
  fromType: StepType;
  toType: StepType;
  hasChildren: boolean;
  height?: number;
}

export function ConnectionLine({
  fromType,
  hasChildren,
  height = 40,
}: ConnectionLineProps) {
  const lineColor = COLOR_MAP[fromType];
  const lineWidth = 2;

  return (
    <View style={[styles.container, { height }]}>
      <Canvas style={styles.canvas}>
        <Line
          p1={vec(18, 0)}
          p2={vec(18, hasChildren ? height * 0.4 : height)}
          color={lineColor}
          style="stroke"
          strokeWidth={lineWidth}
          strokeCap="round"
        />
        {hasChildren && (
          <>
            <Line
              p1={vec(18, height * 0.4)}
              p2={vec(4, height * 0.55)}
              color={lineColor}
              style="stroke"
              strokeWidth={lineWidth}
              strokeCap="round"
            />
            <Line
              p1={vec(18, height * 0.4)}
              p2={vec(32, height * 0.55)}
              color={lineColor}
              style="stroke"
              strokeWidth={lineWidth}
              strokeCap="round"
            />
            <Line
              p1={vec(4, height * 0.55)}
              p2={vec(4, height)}
              color={lineColor}
              style="stroke"
              strokeWidth={lineWidth}
              strokeCap="round"
            />
            <Line
              p1={vec(32, height * 0.55)}
              p2={vec(32, height)}
              color={lineColor}
              style="stroke"
              strokeWidth={lineWidth}
              strokeCap="round"
            />
          </>
        )}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    alignSelf: "center",
  },
  canvas: {
    flex: 1,
  },
});
