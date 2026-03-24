import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Shadow, Radius } from "../../lib/theme";

type CardVariant = "master" | "education" | "experience" | "destination" | "neutral";
type CardSize = "small" | "medium" | "large";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  style?: ViewStyle;
  noPadding?: boolean;
  noShadow?: boolean;
}

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
        !noShadow && variantStyles.shadow,
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

        {/* Top highlight reflection */}
        <View style={styles.topHighlight} />

        {/* Content */}
        <View style={[!noPadding && sizeStyles.padding, styles.content]}>
          {children}
        </View>
      </View>

      {/* Border */}
      <View
        style={[
          styles.borderOverlay,
          {
            borderRadius: sizeStyles.container.borderRadius,
            borderWidth: variantStyles.borderWidth,
            borderColor: variantStyles.borderColor,
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
        borderColor: "rgb(206, 206, 206)",
        shadow: Shadow.card,
      };

    case "education":
      return {
        gradient: ["#FFFFFF", "#FDFCFF"] as const,
        borderWidth: 1,
        borderColor: "rgba(139, 92, 246, 0.15)",
        shadow: {
          shadowColor: "rgba(139, 92, 246, 0.25)",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 4,
        },
      };

    case "experience":
      return {
        gradient: ["#FFFFFF", "#FCFDFF"] as const,
        borderWidth: 1,
        borderColor: "rgba(59, 130, 246, 0.15)",
        shadow: {
          shadowColor: "rgba(59, 130, 246, 0.25)",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 4,
        },
      };

    case "destination":
      return {
        gradient: ["#FFFFFF", "#FCFEFD"] as const,
        borderWidth: 1,
        borderColor: "rgba(16, 185, 129, 0.15)",
        shadow: {
          shadowColor: "rgba(16, 185, 129, 0.25)",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 4,
        },
      };

    case "neutral":
    default:
      return {
        container: {
          backgroundColor: "#FFFFFF",
        } as ViewStyle,
        borderWidth: 1,
        borderColor: "rgb(206, 206, 206)",
        shadow: Shadow.card,
      };
  }
}

function getSizeStyles(size: CardSize) {
  switch (size) {
    case "small":
      return {
        container: {
          borderRadius: Radius.lg,
        } as ViewStyle,
        padding: {
          padding: 16,
        } as ViewStyle,
      };

    case "medium":
      return {
        container: {
          borderRadius: Radius.xl,
        } as ViewStyle,
        padding: {
          padding: 24,
        } as ViewStyle,
      };

    case "large":
      return {
        container: {
          borderRadius: Radius["2xl"],
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
  },
  surface: {
    position: "relative",
    overflow: "hidden",
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    zIndex: 2,
  },
});
