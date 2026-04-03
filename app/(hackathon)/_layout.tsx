import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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
import { HackathonBackground } from "../../components/Hackathon/HackathonBackground";

// Design Tokens from Hackathon Design System
export const HACK_COLORS = {
  bgDeep: "#03050a",
  bgCard: "#0d1219",
  cyan: "#91C4E3",
  blue: "#65ABFC",
  purpleLight: "#A594BA",
  purpleMuted: "#9D81AC",
  borderLight: "#7aa4c4",
  borderMuted: "#5a7a94",
};

type TabRoute = "home" | "journey" | "profile";

type TabTheme = {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  accent: string;
  glow: string;
};

const TAB_THEMES: Record<TabRoute, TabTheme> = {
  home: {
    label: "Home",
    icon: "home",
    accent: HACK_COLORS.blue,
    glow: "rgba(101, 171, 252, 0.2)",
  },
  journey: {
    label: "Journey",
    icon: "map",
    accent: HACK_COLORS.cyan,
    glow: "rgba(145, 196, 227, 0.2)",
  },
  profile: {
    label: "You",
    icon: "user",
    accent: HACK_COLORS.purpleLight,
    glow: "rgba(165, 148, 186, 0.2)",
  },
};

function CustomHackathonTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Filter only routes that are meant to be visible tabs
  const visibleRoutes = state.routes.filter(r => TAB_THEMES[r.name as TabRoute]);
  
  // Resolve active index relative to the visible array
  const activeRouteName = state.routes[state.index]?.name;
  let activeVisibleIndex = visibleRoutes.findIndex(r => r.name === activeRouteName);

  // If navigating to a nested hidden screen, fallback to 0 or leave indicator where it was
  const animatedIndex = useSharedValue(activeVisibleIndex >= 0 ? activeVisibleIndex : 0);

  useEffect(() => {
    if (activeVisibleIndex >= 0) {
      animatedIndex.value = withSpring(activeVisibleIndex, {
        damping: 20,
        stiffness: 90,
        mass: 0.8,
      });
    }
  }, [activeVisibleIndex]);

  const slidingIndicatorStyle = useAnimatedStyle(() => {
    return {
      left: `${(animatedIndex.value * 100) / visibleRoutes.length}%` as any,
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
      <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
        <LinearGradient
          colors={["rgba(13, 18, 25, 0.9)", "rgba(18, 28, 41, 0.8)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFill}
        >
          <View style={styles.tabBarInner}>
            <View style={styles.tabsWrapper}>
              <Animated.View
                style={[
                  styles.slidingIndicatorContainer,
                  slidingIndicatorStyle,
                  { width: `${100 / visibleRoutes.length}%` },
                ]}
              >
                {visibleRoutes.map((route, i) => {
                  const theme = TAB_THEMES[route.name as TabRoute];
                  const activeOpacityStyle = useAnimatedStyle(() => {
                    const opacity = interpolate(
                      animatedIndex.value,
                      [i - 1, i, i + 1],
                      [0, 1, 0],
                      "clamp"
                    );
                    return { opacity };
                  });

                  return (
                    <Animated.View
                      key={`pill-${route.key}`}
                      style={[StyleSheet.absoluteFill, activeOpacityStyle]}
                    >
                      <View
                        style={[
                          styles.activePill,
                          {
                            backgroundColor: theme.glow,
                            borderColor: theme.accent,
                            shadowColor: theme.accent,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.6,
                            shadowRadius: 10,
                          },
                        ]}
                      />
                    </Animated.View>
                  );
                })}
              </Animated.View>

              {visibleRoutes.map((route, index) => {
                const isFocused = activeVisibleIndex === index;
                const routeName = route.name as TabRoute;
                const theme = TAB_THEMES[routeName];

                const onPress = () => {
                  if (!isFocused) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate(route.name, route.params);
                  }
                };

                return (
                  <TabBarButton
                    key={route.key}
                    isFocused={isFocused}
                    index={index}
                    animatedIndex={animatedIndex}
                    theme={theme}
                    onPress={onPress}
                    routeName={routeName}
                  />
                );
              })}
            </View>
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
}

import { Canvas, Path as SkiaPath, Shadow } from "@shopify/react-native-skia";

const ICONS = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  journey: "M15 5.1L9 3 3 5.02v16.2l6-2.33 6 2.1 6-2.02V2.77L15 5.1zm0 13.79l-6-2.11V5.11l6 2.11v11.67z",
  profile: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
};

function TabBarButton({
  isFocused,
  index,
  animatedIndex,
  theme,
  onPress,
  routeName,
}: {
  isFocused: boolean;
  index: number;
  animatedIndex: SharedValue<number>;
  theme: TabTheme;
  onPress: () => void;
  routeName: TabRoute;
}) {
  const animatedIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [1, 1.15, 1],
      "clamp"
    );
    return {
      transform: [{ scale }],
    };
  });

  const colorStyle = useAnimatedStyle(() => {
    const isActive = Math.abs(animatedIndex.value - index) < 0.5;
    return {
      color: isActive ? theme.accent : "rgba(255,255,255,0.4)",
    };
  });

  const pathStr = ICONS[routeName] ?? ICONS.home;

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Canvas style={{ width: 24, height: 24 }}>
          <SkiaPath path={pathStr} color={isFocused ? theme.accent : "rgba(255,255,255,0.4)"}>
            {isFocused && <Shadow dx={0} dy={0} blur={8} color={theme.accent} />}
          </SkiaPath>
        </Canvas>
      </Animated.View>

      <Animated.Text
        style={[
          styles.labelText,
          {
            fontFamily: isFocused ? "BaiJamjuree_700Bold" : "BaiJamjuree_400Regular",
          },
          colorStyle,
        ]}
        numberOfLines={1}
      >
        {theme.label}
      </Animated.Text>
    </Pressable>
  );
}

export default function HackathonLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: HACK_COLORS.bgDeep }}>
      <HackathonBackground />
      <Tabs
        tabBar={(props: BottomTabBarProps) => <CustomHackathonTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="journey" />
      <Tabs.Screen name="profile" />
      
      {/* Hidden Screens */}
      <Tabs.Screen name="phase/[phaseId]" options={{ href: null }} />
      <Tabs.Screen name="module/[moduleId]" options={{ href: null }} />
      <Tabs.Screen name="activity/[nodeId]" options={{ href: null }} />
      <Tabs.Screen name="reflection/[phaseId]" options={{ href: null }} />
    </Tabs>
    </View>
  );
}

const TAB_BAR_RADIUS = 32;
const PILL_RADIUS = 16;

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    borderRadius: TAB_BAR_RADIUS,
    shadowColor: HACK_COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  blurContainer: {
    borderRadius: TAB_BAR_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.15)",
  },
  gradientFill: {
    flex: 1,
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
    paddingVertical: 6,
    position: "relative",
    zIndex: 1,
  },
  activePill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 2,
    right: 2,
    borderRadius: PILL_RADIUS,
    borderWidth: 1,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  labelText: {
    fontSize: 11,
    textAlign: "center",
    overflow: "hidden",
  },
});
