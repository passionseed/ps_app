import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

type TabRoute = "discover" | "my-paths" | "profile";

type TabTheme = {
  label: string;
  icon: string;
  activeIcon: string;
  halo: string;
  accent: string;
  glow: string;
};

const TAB_THEMES: Record<TabRoute, TabTheme> = {
  discover: {
    label: "Discover",
    icon: "🔍",
    activeIcon: "🔎",
    halo: "rgba(59, 130, 246, 0.15)", // Premium Blue
    accent: "#3B82F6",
    glow: "rgba(59, 130, 246, 0.35)",
  },
  "my-paths": {
    label: "My Paths",
    icon: "📚",
    activeIcon: "📖",
    halo: "rgba(16, 185, 129, 0.15)", // Premium Green
    accent: "#10B981",
    glow: "rgba(16, 185, 129, 0.35)",
  },
  profile: {
    label: "Profile",
    icon: "👤",
    activeIcon: "🧠",
    halo: "rgba(139, 92, 246, 0.15)", // Premium Purple
    accent: "#8B5CF6",
    glow: "rgba(139, 92, 246, 0.35)",
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const animatedIndex = useSharedValue(state.index);

  useEffect(() => {
    animatedIndex.value = withSpring(state.index, {
      damping: 20,
      stiffness: 150,
    });
  }, [state.index]);

  const slidingIndicatorStyle = useAnimatedStyle(() => {
    return {
      left: `${(animatedIndex.value * 100) / state.routes.length}%` as any,
    };
  });

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          bottom: Platform.OS === "ios" ? Math.max(insets.bottom, 24) : 24,
        },
      ]}
    >
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 0.95)",
          "rgba(249, 245, 255, 0.95)",
          "rgba(238, 242, 255, 0.95)",
        ]}
        locations={[0, 0.5, 1]}
        style={styles.tabBarGradient}
      >
        <View style={styles.tabBarInner}>
          <View style={styles.tabsWrapper}>
            <Animated.View
              style={[
                styles.slidingIndicatorContainer,
                slidingIndicatorStyle,
                { width: `${100 / state.routes.length}%` },
              ]}
            >
              {state.routes.map((route, i) => {
                const theme =
                  TAB_THEMES[route.name as TabRoute] || TAB_THEMES["my-paths"];
                const activeOpacityStyle = useAnimatedStyle(() => {
                  return {
                    opacity: Math.max(0, 1 - Math.abs(animatedIndex.value - i)),
                  };
                });

                return (
                  <Animated.View
                    key={`pill-${route.key}`}
                    style={[StyleSheet.absoluteFill, activeOpacityStyle]}
                  >
                    <GlassView
                      glassEffectStyle="regular"
                      colorScheme="light"
                      tintColor={theme.halo}
                      style={[
                        styles.activePill,
                        {
                          shadowColor: theme.accent,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.5,
                          shadowRadius: 8,
                          borderColor: theme.glow,
                          borderWidth: 1,
                          overflow: "hidden",
                        },
                      ]}
                    />
                  </Animated.View>
                );
              })}
            </Animated.View>

            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const routeName = route.name as TabRoute;
              const theme = TAB_THEMES[routeName] || TAB_THEMES["my-paths"];

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: "tabLongPress",
                  target: route.key,
                });
              };

              return (
                <TabBarButton
                  key={route.key}
                  isFocused={isFocused}
                  index={index}
                  animatedIndex={animatedIndex}
                  theme={theme}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function TabBarButton({
  isFocused,
  index,
  animatedIndex,
  theme,
  onPress,
  onLongPress,
}: {
  isFocused: boolean;
  index: number;
  animatedIndex: SharedValue<number>;
  theme: TabTheme;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const animatedIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [1, 1.15, 1],
      "clamp",
    );
    return {
      transform: [{ scale }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      "clamp",
    );
    const height = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [0, 14, 0],
      "clamp",
    );
    const marginTop = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [0, 4, 0],
      "clamp",
    );
    const translateY = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [8, 0, 8],
      "clamp",
    );

    return {
      opacity,
      height,
      marginTop,
      transform: [{ translateY }],
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Animated.Text style={styles.iconText}>
          {isFocused ? theme.activeIcon : theme.icon}
        </Animated.Text>
      </Animated.View>

      <Animated.Text
        style={[styles.labelText, animatedTextStyle]}
        numberOfLines={1}
      >
        {theme.label}
      </Animated.Text>
    </AnimatedPressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#F3F4F6" }, // matching Page Background from guidelines
      }}
    >
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="my-paths" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    borderRadius: 40,
    // Premium Wow Effect Shadow from guidelines
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 }, // increased slightly for floating effect
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  tabBarGradient: {
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    overflow: "hidden",
  },
  tabBarInner: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabsWrapper: {
    flexDirection: "row",
    position: "relative",
  },
  slidingIndicatorContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
    zIndex: 1,
  },
  activePill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "15%",
    right: "15%",
    borderRadius: 24,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 24,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
    overflow: "hidden",
  },
});
