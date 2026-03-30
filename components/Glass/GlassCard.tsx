import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Radius } from "../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";

type CardVariant = "master" | "education" | "experience" | "destination" | "neutral";
type CardSize = "small" | "medium" | "large";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  noShadow?: boolean;
}

// Renamed internally but keeping component name GlassCard for compatibility
export function GlassCard({
  children,
  variant = "neutral",
  size = "medium",
  style,
  noPadding = false,
  noShadow = false,
}: GlassCardProps) {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <View
      style={[
        styles.card,
        sizeStyles.container,
        !noShadow && styles.softShadow,
        style,
      ]}
    >
      <View
        style={[
          styles.surface,
          sizeStyles.container,
          variantStyles.container,
        ]}
      >
        {variantStyles.gradient ? (
          <LinearGradient
            colors={variantStyles.gradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: sizeStyles.container.borderRadius },
            ]}
          />
        ) : null}

        {/* Content */}
        <View style={[!noPadding && sizeStyles.padding, styles.content]}>
          {children}
        </View>
      </View>
      
      {/* Subtle border to frame the gradient slightly */}
      <View
        style={[
          styles.borderOverlay,
          {
            borderRadius: sizeStyles.container.borderRadius,
            borderWidth: variantStyles.borderWidth || 0,
            borderColor: variantStyles.borderColor || "transparent",
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

function getVariantStyles(variant: CardVariant) {
  switch (variant) {
    case "master":
      return {
        gradient: ["#FFFFFF", "#F9F5FF", "#EEF2FF"] as const,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.04)",
      };
    case "education":
      return {
        gradient: ["#FFFFFF", "#FDFCFF"] as const,
        borderWidth: 1,
        borderColor: "rgba(139, 92, 246, 0.15)",
      };
    case "experience":
      return {
        gradient: ["#FFFFFF", "#FCFDFF"] as const,
        borderWidth: 1,
        borderColor: "rgba(59, 130, 246, 0.15)",
      };
    case "destination":
      return {
        gradient: ["#FFFFFF", "#FCFEFD"] as const,
        borderWidth: 1,
        borderColor: "rgba(16, 185, 129, 0.15)",
      };
    case "neutral":
    default:
      return {
        container: {
          backgroundColor: "#FFFFFF",
        } as ViewStyle,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.04)",
      };
  }
}

function getSizeStyles(size: CardSize) {
  switch (size) {
    case "small":
      return {
        container: {
          borderRadius: 16,
        } as ViewStyle,
        padding: {
          padding: 16,
        } as ViewStyle,
      };

    case "medium":
      return {
        container: {
          borderRadius: 24,
        } as ViewStyle,
        padding: {
          padding: 24,
        } as ViewStyle,
      };

    case "large":
      return {
        container: {
          borderRadius: 32,
        } as ViewStyle,
        padding: {
          padding: 32,
        } as ViewStyle,
      };
  }
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "visible",
    backgroundColor: "#FFFFFF",
  },
  surface: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  softShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
});
