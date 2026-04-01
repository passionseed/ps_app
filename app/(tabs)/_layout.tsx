import React, { useEffect } from "react";
import { Tabs, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
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
import { PageBg } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { FloatingProgressButton } from "../../components/FloatingProgressButton";

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
    halo: "rgba(59, 130, 246, 0.12)",
    accent: "#3B82F6", // Experience blue
    glow: "rgba(59, 130, 246, 0.25)",
  },
  "my-paths": {
    label: "My Paths",
    icon: "📚",
    activeIcon: "📖",
    halo: "rgba(16, 185, 129, 0.12)",
    accent: "#10B981", // Destination green
    glow: "rgba(16, 185, 129, 0.25)",
  },
  profile: {
    label: "Profile",
    icon: "👤",
    activeIcon: "🧠",
    halo: "rgba(139, 92, 246, 0.12)",
    accent: "#8B5CF6", // Education purple
    glow: "rgba(139, 92, 246, 0.25)",
  },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const animatedIndex = useSharedValue(state.index);
  const { appLanguage } = useAuth();

  const tabLabels =
    appLanguage === "th"
      ? {
          discover: "ค้นหา",
          "my-paths": "เส้นทาง",
          profile: "โปรไฟล์",
        }
      : {
          discover: "Discover",
          "my-paths": "My Paths",
          profile: "Profile",
        };

  useEffect(() => {
    animatedIndex.value = withSpring(state.index, {
      damping: 25,
      stiffness: 120,
      mass: 0.8,
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
          "#FFFFFF",
          "#F9F5FF",
          "#EEF2FF",
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
              {state.routes.map((route: { key: string; name: string; params?: object }, i: number) => {
                const theme =
                  TAB_THEMES[route.name as TabRoute] || TAB_THEMES["my-paths"];
                const activeOpacityStyle = useAnimatedStyle(() => {
                  const opacity = interpolate(
                    animatedIndex.value,
                    [i - 1, i, i + 1],
                    [0, 1, 0],
                    "clamp",
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
                          backgroundColor: theme.halo,
                          borderColor: theme.glow,
                          shadowColor: theme.accent,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.2,
                          shadowRadius: 8,
                        },
                      ]}
                    />
                  </Animated.View>
                );
              })}
            </Animated.View>

            {state.routes.map((route: { key: string; name: string; params?: object }, index: number) => {
              const isFocused = state.index === index;
              const routeName = route.name as TabRoute;
              const theme = TAB_THEMES[routeName] || TAB_THEMES["my-paths"];
              const label = tabLabels[routeName];

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
                  theme={{ ...theme, label }}
                  onPress={onPress}
                  appLanguage={appLanguage}
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
  appLanguage,
}: {
  isFocused: boolean;
  index: number;
  animatedIndex: SharedValue<number>;
  theme: TabTheme;
  onPress: () => void;
  appLanguage: string;
  key?: string;
}) {
  const animatedIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [1, 1.05, 1],
      "clamp",
    );
    return {
      transform: [{ scale }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [index - 0.8, index, index + 0.8],
      [0.5, 1, 0.5],
      "clamp",
    );
    return {
      opacity,
    };
  });

  const colorStyle = useAnimatedStyle(() => {
    const isActive = Math.abs(animatedIndex.value - index) < 0.5;
    return {
      color: isActive ? theme.accent : "#4B5563", // Secondary text for inactive
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Animated.Text style={styles.iconText}>
          {isFocused ? theme.activeIcon : theme.icon}
        </Animated.Text>
      </Animated.View>

      <Animated.Text
        style={[
          styles.labelText,
          {
            fontFamily:
              appLanguage === "th"
                ? (isFocused ? "BaiJamjuree_700Bold" : "BaiJamjuree_400Regular")
                : (isFocused ? "LibreFranklin_700Bold" : "LibreFranklin_400Regular"),
            fontSize: appLanguage === "th" ? 13 : 11,
          },
          appLanguage === "th" && {
            lineHeight: 20,
            includeFontPadding: true,
            paddingTop: Platform.OS === "android" ? 1 : 0,
          },
          animatedTextStyle,
          colorStyle,
        ]}
        numberOfLines={1}
      >
        {theme.label}
      </Animated.Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const tabBarHeight = Platform.OS === "ios" ? Math.max(insets.bottom, 24) + 44 + 24 : 24 + 44 + 24;
  
  // Only show on discover page
  const isDiscoverPage = pathname === "/discover" || pathname === "/(tabs)/discover";

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: PageBg.default },
        }}
      >
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="my-paths" />
        <Tabs.Screen name="profile" />
      </Tabs>
      {isDiscoverPage && (
        <FloatingProgressButton 
          bottomOffset={tabBarHeight} 
          visible={isDiscoverPage}
        />
      )}
    </View>
  );
}

// Design System Colors
const PREMIUM_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

const TAB_BAR_RADIUS = 32;
const PILL_RADIUS = 16;

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    borderRadius: TAB_BAR_RADIUS,
    ...PREMIUM_SHADOW,
  },
  tabBarGradient: {
    borderRadius: TAB_BAR_RADIUS,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
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
    left: 2,
    right: 2,
    borderRadius: PILL_RADIUS,
    borderWidth: 1,
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
    color: "#6B7280", // Tertiary text
    textAlign: "center",
    overflow: "hidden",
  },
});
