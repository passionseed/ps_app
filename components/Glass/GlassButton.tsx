import React from "react";
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Shadow, Radius, Text as ThemeText } from "../../lib/theme";
import { AppText } from "../AppText";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "small" | "medium" | "large";

interface GlassButtonProps {
  onPress: () => void;
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function GlassButton({
  onPress,
  children,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: GlassButtonProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  // For primary variant, use gradient background
  if (variant === "primary") {
    return (
      <Animated.View
        style={[
          styles.buttonWrapper,
          fullWidth && styles.fullWidth,
          animatedStyle,
          style,
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={[
            styles.button,
            sizeStyles.container,
            variantStyles.container,
            disabled && styles.disabled,
          ]}
        >
          <LinearGradient
            colors={["#BFFF00", "#9FE800"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {loading ? (
            <ActivityIndicator color={variantStyles.text.color} size="small" />
          ) : (
            <>
              {icon && <Animated.View style={styles.icon}>{icon}</Animated.View>}
              <AppText variant="bold" style={[sizeStyles.text, variantStyles.text, styles.primaryText]}>
                {children}
              </AppText>
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // For other variants, use regular view with background
  return (
    <Animated.View
      style={[
        styles.buttonWrapper,
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          sizeStyles.container,
          variantStyles.container,
          disabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variantStyles.text.color} size="small" />
        ) : (
          <>
            {icon && <Animated.View style={styles.icon}>{icon}</Animated.View>}
            <AppText variant="bold" style={[sizeStyles.text, variantStyles.text]}>
              {children}
            </AppText>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function getVariantStyles(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 0,
          ...Shadow.ctaGlow,
        } as ViewStyle,
        text: {
          color: "#111827",
          fontWeight: "700" as TextStyle["fontWeight"],
        } as TextStyle,
      };

    case "secondary":
      return {
        container: {
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "rgb(206, 206, 206)",
          ...Shadow.card,
        } as ViewStyle,
        text: {
          color: ThemeText.primary,
          fontWeight: "600" as TextStyle["fontWeight"],
        } as TextStyle,
      };

    case "ghost":
      return {
        container: {
          backgroundColor: "rgba(255, 255, 255, 0.5)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.3)",
        } as ViewStyle,
        text: {
          color: ThemeText.secondary,
          fontWeight: "600" as TextStyle["fontWeight"],
        } as TextStyle,
      };

    case "danger":
      return {
        container: {
          backgroundColor: "#FEE2E2",
          borderWidth: 1,
          borderColor: "rgba(239, 68, 68, 0.2)",
        } as ViewStyle,
        text: {
          color: "#991B1B",
          fontWeight: "600" as TextStyle["fontWeight"],
        } as TextStyle,
      };
  }
}

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case "small":
      return {
        container: {
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: Radius.full,
        } as ViewStyle,
        text: {
          fontSize: 14,
        } as TextStyle,
      };

    case "medium":
      return {
        container: {
          paddingVertical: 14,
          paddingHorizontal: 28,
          borderRadius: Radius.full,
        } as ViewStyle,
        text: {
          fontSize: 16,
        } as TextStyle,
      };

    case "large":
      return {
        container: {
          paddingVertical: 18,
          paddingHorizontal: 36,
          borderRadius: Radius.full,
        } as ViewStyle,
        text: {
          fontSize: 18,
        } as TextStyle,
      };
  }
}

const styles = StyleSheet.create({
  buttonWrapper: {
    alignSelf: "flex-start",
  },
  fullWidth: {
    width: "100%",
    alignSelf: "stretch",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  primaryText: {
    textShadowColor: "rgba(191, 255, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disabled: {
    opacity: 0.4,
  },
  icon: {
    marginRight: 4,
  },
});
