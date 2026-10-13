import React, { useEffect, useState } from "react";
import { Tabs, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, View, Alert } from "react-native";
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
import { hasBuildAccess } from "../../lib/build-todos";
import { useShift } from "../../lib/shift-context";
import { ShiftTabBar, type ShiftTab } from "../../components/round/ShiftTabBar";
import { useRoundLang, useShiftMode } from "../../lib/round/hooks";

type TabRoute = "discover" | "explore" | "my-paths" | "profile" | "build" | "today" | "projects" | "group" | "shift" | "squad";

type TabTheme = {
  label: string;
  icon: string;
  activeIcon: string;
  halo: string;
  accent: string;
  glow: string;
};

const TAB_THEMES: Record<TabRoute, TabTheme> = {
  // SHIFT tabs render with ShiftTabBar (line pictograms); these entries only satisfy the type.
  shift: { label: "Shift", icon: "", activeIcon: "", halo: "transparent", accent: "#5B2FD6", glow: "transparent" },
  squad: { label: "Squad", icon: "", activeIcon: "", halo: "transparent", accent: "#5B2FD6", glow: "transparent" },
  today: {
    label: "Today",
    icon: "☀️",
    activeIcon: "☀️",
    halo: "rgba(16, 185, 129, 0.12)",
    accent: "#10B981",
    glow: "rgba(16, 185, 129, 0.25)",
  },
  projects: {
    label: "Projects",
    icon: "🛠️",
    activeIcon: "🛠️",
    halo: "rgba(59, 130, 246, 0.12)",
    accent: "#3B82F6",
    glow: "rgba(59, 130, 246, 0.25)",
  },
  group: {
    label: "My group",
    icon: "👥",
    activeIcon: "👥",
    halo: "rgba(139, 92, 246, 0.12)",
    accent: "#8B5CF6",
    glow: "rgba(139, 92, 246, 0.25)",
  },
  discover: {
    label: "Discover",
    icon: "🔍",
    activeIcon: "🔎",
    halo: "rgba(59, 130, 246, 0.12)",
    accent: "#3B82F6", // Experience blue
    glow: "rgba(59, 130, 246, 0.25)",
  },
  explore: {
    label: "Explore",
    icon: "🧭",
    activeIcon: "🧭",
    halo: "rgba(249, 115, 22, 0.12)",
    accent: "#F97316", // Passion orange
    glow: "rgba(249, 115, 22, 0.25)",
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
  build: {
    label: "Build",
    icon: "🛠️",
    activeIcon: "⚡",
    halo: "rgba(245, 158, 11, 0.12)",
    accent: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.25)",
  },
};

function ActivePill({
  index,
  animatedIndex,
  halo,
  glow,
  accent,
}: {
  index: number;
  animatedIndex: SharedValue<number>;
  halo: string;
  glow: string;
  accent: string;
}) {
  const activeOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      "clamp",
    );
    return { opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, activeOpacityStyle]}>
      <View
        style={[
          styles.activePill,
          {
            backgroundColor: halo,
            borderColor: glow,
            shadowColor: accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          },
        ]}
      />
    </Animated.View>
  );
}

function CustomTabBar({
  state,
  navigation,
  visibleTabs,
  isCamp,
}: BottomTabBarProps & { visibleTabs: TabRoute[]; isCamp: boolean }) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => visibleTabs.includes(route.name as TabRoute));
  const selectedIndex = Math.max(0, routes.findIndex((route) => route.key === state.routes[state.index]?.key));
  const animatedIndex = useSharedValue(selectedIndex);
  const { appLanguage } = useAuth();

  const tabLabels =
    appLanguage === "th"
      ? {
          discover: "ค้นหา",
          explore: "สำรวจ",
          "my-paths": "เส้นทาง",
          profile: "โปรไฟล์",
          build: "Build",
          today: "วันนี้",
          projects: "โปรเจกต์",
          group: "กลุ่มของฉัน",
          shift: "Shift",
          squad: "สควอด",
        }
      : {
          discover: "Discover",
          explore: "Explore",
          "my-paths": "My Paths",
          profile: "Profile",
          build: "Build",
          today: "Today",
          projects: "Projects",
          group: "My group",
          shift: "Shift",
          squad: "Squad",
        };

  useEffect(() => {
    animatedIndex.value = withSpring(selectedIndex, {
      damping: 25,
      stiffness: 120,
      mass: 0.8,
    });
  }, [animatedIndex, selectedIndex]);

  const slidingIndicatorStyle = useAnimatedStyle(() => {
    return {
      left: `${(animatedIndex.value * 100) / routes.length}%` as any,
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
                { width: `${100 / routes.length}%` },
              ]}
            >
              {routes.map((route: { key: string; name: string; params?: object }, i: number) => {
                const theme =
                  TAB_THEMES[route.name as TabRoute] || TAB_THEMES["my-paths"];
                return (
                  <ActivePill
                    key={`pill-${route.key}`}
                    index={i}
                    animatedIndex={animatedIndex}
                    halo={theme.halo}
                    glow={theme.glow}
                    accent={theme.accent}
                  />
                );
              })}
            </Animated.View>

            {routes.map((route: { key: string; name: string; params?: object }, index: number) => {
              const isFocused = state.routes[state.index]?.key === route.key;
              const routeName = route.name as TabRoute;
              const theme = TAB_THEMES[routeName] || TAB_THEMES["my-paths"];
              const label = tabLabels[routeName];

              const onPress = () => {
                if (!isCamp && (routeName === "discover" || routeName === "my-paths")) {
                  Alert.alert("Coming Soon", "This feature is coming soon!");
                  return;
                }
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

const SHIFT_ICONS: Partial<Record<TabRoute, ShiftTab["icon"]>> = {
  shift: "house",
  squad: "people",
  profile: "person",
  discover: "search",
  explore: "compass",
  "my-paths": "book",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { session, isGuest } = useAuth();
  const { cohorts } = useShift();
  const { shiftMode } = useShiftMode();
  const { t } = useRoundLang();
  const isCamp = cohorts.length > 0 && !shiftMode;
  const [isBuildUser, setIsBuildUser] = useState(false);
  // 5.2: SHIFT users get Shift / Squad / Profile; guests get the Shift teaser plus legacy tabs.
  const useShiftBar = shiftMode || isGuest;
  const visibleTabs: TabRoute[] = shiftMode
    ? ["shift", "squad", "profile"]
    : isGuest
      ? ["shift", "discover", "explore", "my-paths", "profile"]
      : isCamp
        ? ["discover", "today", "projects", "group", "profile"]
        : ["discover", "explore", "my-paths", "profile"];
  if (isBuildUser && !shiftMode) visibleTabs.push("build");
  const tabBarHeight = Platform.OS === "ios" ? Math.max(insets.bottom, 24) + 44 + 24 : 24 + 44 + 24;
  const shown = (name: TabRoute) => (visibleTabs.includes(name) ? undefined : null);

  useEffect(() => {
    if (session) hasBuildAccess().then(setIsBuildUser);
  }, [session]);

  // Only show on discover page
  const isDiscoverPage = !shiftMode && (pathname === "/discover" || pathname === "/(tabs)/discover");

  const legacyLabels: Partial<Record<TabRoute, string>> = {
    discover: t("ui.legacy.discover"),
    explore: TAB_THEMES.explore.label,
    "my-paths": t("ui.legacy.my_paths"),
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props: BottomTabBarProps) =>
          useShiftBar ? (
            <ShiftTabBar
              tabs={visibleTabs
                .filter((name) => SHIFT_ICONS[name])
                .map((name) => ({
                  name,
                  icon: SHIFT_ICONS[name]!,
                  label:
                    name === "shift"
                      ? t("tab.shift")
                      : name === "squad"
                        ? t("tab.squad")
                        : name === "profile"
                          ? t("tab.profile")
                          : legacyLabels[name] ?? name,
                }))}
              activeName={props.state.routes[props.state.index]?.name}
              onSelect={(name) => props.navigation.navigate(name)}
            />
          ) : (
            <CustomTabBar {...props} visibleTabs={visibleTabs} isCamp={isCamp} />
          )
        }
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: PageBg.default },
        }}
      >
        <Tabs.Screen name="shift" options={{ href: shown("shift") }} />
        <Tabs.Screen name="squad" options={{ href: shown("squad") }} />
        <Tabs.Screen name="discover" options={{ href: shown("discover") }} />
        <Tabs.Screen name="explore" options={{ href: shown("explore") }} />
        <Tabs.Screen name="my-paths" options={{ href: shown("my-paths") }} />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="build" options={{ href: shown("build") }} />
        <Tabs.Screen name="today" options={{ href: shown("today") }} />
        <Tabs.Screen name="projects" options={{ href: shown("projects") }} />
        <Tabs.Screen name="group" options={{ href: shown("group") }} />
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
