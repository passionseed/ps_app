const fs = require('fs');
const path = require('path');

const content = `import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming 
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";

interface WrappedButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WrappedButton({ onPress, disabled, style, textStyle, children }: WrappedButtonProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.95, { damping: 12, stiffness: 200 });
    glowOpacity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    glowOpacity.value = withTiming(0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.container,
        style,
        disabled && styles.disabled,
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={["#362B42", "#1E1925"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        {/* Base top highlight */}
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.4 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Animated tap glow / shader-like highlight */}
        <Animated.View style={[StyleSheet.absoluteFillObject, glowStyle]}>
          <LinearGradient
            colors={["rgba(167, 139, 250, 0.4)", "rgba(157, 129, 172, 0.0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <AppText variant="bold" style={[styles.text, textStyle]}>
          {children}
        </AppText>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Space.lg,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderRadius: 100,
  },
  gradient: {
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderWidth: 1,
    borderColor: "rgba(157, 129, 172, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 160,
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 15,
    color: "#E8DDF0",
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
`;

fs.writeFileSync(path.join(__dirname, 'components/Wrapped/WrappedButton.tsx'), content, 'utf8');
console.log('Updated WrappedButton.tsx with delightful animations');
