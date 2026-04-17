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
import {
  preloadHackathonHomeBundle,
  preloadHackathonJourneyBundle,
} from "../../lib/hackathonScreenData";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { readHackathonToken } from "../../lib/hackathon-mode";
import { AppText } from "../../components/AppText";
import { useAuth } from "../../lib/auth";

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

function HackathonActivePill({
  index,
  animatedIndex,
  glow,
  accent,
}: {
  index: number;
  animatedIndex: SharedValue<number>;
  glow: string;
  accent: string;
}) {
  const activeOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      "clamp"
    );
    return { opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, activeOpacityStyle]}>
      <View
        style={[
          styles.activePill,
          {
            backgroundColor: glow,
            borderColor: accent,
            shadowColor: accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 10,
          },
        ]}
      />
    </Animated.View>
  );
}

function CustomHackathonTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Filter only routes that are meant to be visible tabs
  const visibleRoutes = state.routes.filter(r => TAB_THEMES[r.name as TabRoute]);
  
  // Resolve active index relative to the visible array
  const activeRouteName = state.routes[state.index]?.name;
  let activeVisibleIndex = visibleRoutes.findIndex(r => r.name === activeRouteName);

  // Hide tab bar on nested screens (activity, phase, module, etc.)
  if (!TAB_THEMES[activeRouteName as TabRoute]) {
    return null;
  }

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
                  return (
                    <HackathonActivePill
                      key={`pill-${route.key}`}
                      index={i}
                      animatedIndex={animatedIndex}
                      glow={theme.glow}
                      accent={theme.accent}
                    />
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
                    if (routeName === "home") {
                      void preloadHackathonHomeBundle();
                    }
                    if (routeName === "journey") {
                      void preloadHackathonJourneyBundle();
                    }
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

import { Canvas, Path as SkiaPath, Shadow, Group } from "@shopify/react-native-skia";

const ICONS = {
  home: "M 9 9 H 16 A 6 6 0 0 1 22 15 A 6 6 0 0 1 16 21 H 9 A 6 6 0 0 1 3 15 A 6 6 0 0 1 9 9 Z M 16 13 A 2 2 0 1 0 16 17 A 2 2 0 1 0 16 13 M 12 9 V 6 A 2 2 0 0 1 14 4 H 16 M 3 15 H 1 M 1 12 L 1 18",
  journey: "M 4 7 C 8 4, 11 5, 12 7 C 13 9, 16 10, 20 7 V 17 C 16 20, 13 19, 12 17 C 11 15, 8 14, 4 17 Z M 12 7 V 17 M 14.5 10.5 L 17.5 13.5 M 17.5 10.5 L 14.5 13.5",
  profile: "M 4 15 A 8 8 0 0 1 20 15 V 19 C 20 21, 18 22, 12 22 C 6 22, 4 21, 4 19 Z M 10 7 V 5 C 10 3, 14 3, 14 5 V 7 M 12 9 A 4 4 0 1 0 12 17 A 4 4 0 1 0 12 9 M 4 13 H 2 M 20 13 H 22"
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
      <Animated.View style={[styles.iconContainer, animatedIconStyle, { width: 24, height: 24, zIndex: -1 }]}>
        <Canvas style={{ width: 64, height: 64, position: "absolute", top: -20, left: -20 }} pointerEvents="none">
          <Group transform={[{ translateX: 20 }, { translateY: 20 }]}>
            <SkiaPath
              path={pathStr}
              color={isFocused ? theme.accent : "rgba(255,255,255,0.4)"}
              style="stroke"
              strokeWidth={1.5}
              strokeJoin="round"
              strokeCap="round"
            >
              {isFocused && <Shadow dx={0} dy={0} blur={4.8} color={theme.accent} />}
              {isFocused && <Shadow dx={0} dy={0} blur={9.6} color={theme.accent} />}
            </SkiaPath>
          </Group>
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
  const [teamGate, setTeamGate] = useState<"loading" | "ok" | "blocked">("loading");
  const { signOutHackathon } = useAuth();

  useEffect(() => {
    void preloadHackathonHomeBundle();
    void preloadHackathonJourneyBundle();
  }, []);

  useFocusEffect(
    useCallback(() => {
      readHackathonToken().then(async (token) => {
        if (!token) { signOutHackathon(); return; }
        try {
          const r = await fetch("https://www.passionseed.org/api/hackathon/student/team", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.status === 401) { signOutHackathon(); return; }
          const data = await r.json();
          if (!data.team || data.member_count <= 1) setTeamGate("blocked");
          else setTeamGate("ok");
        } catch {
          setTeamGate("ok"); // fail open on network error
        }
      });
    }, [])
  );

  if (teamGate === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: HACK_COLORS.bgDeep, alignItems: "center", justifyContent: "center" }}>
        <HackathonBackground />
        <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "rgba(145,196,227,0.3)", borderTopColor: "#91C4E3" }} />
      </View>
    );
  }

  if (teamGate === "blocked") {
    return (
      <View style={{ flex: 1, backgroundColor: HACK_COLORS.bgDeep, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 20 }}>
        <HackathonBackground />
        <AppText variant="bold" style={{ fontSize: 22, color: "#FFFFFF", textAlign: "center" }}>
          คุณยังไม่มีทีม
        </AppText>
        <AppText style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 24 }}>
          การเข้าร่วม Hackathon ต้องมีทีมที่มีสมาชิกอย่างน้อย 2 คน{"\n"}กรุณาติดต่อผู้จัดงานเพื่อเข้าร่วมทีม
        </AppText>
        <Pressable
          onPress={() => signOutHackathon()}
          style={{ marginTop: 8, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}
        >
          <AppText style={{ fontSize: 15, color: "rgba(255,255,255,0.7)" }}>กลับไปหน้าเข้าสู่ระบบ</AppText>
        </Pressable>
      </View>
    );
  }

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
      <Tabs.Screen name="mentor-booking" options={{ href: null }} />
      <Tabs.Screen name="mentor-guides" options={{ href: null }} />
      <Tabs.Screen name="guide/[guideId]" options={{ href: null }} />
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
