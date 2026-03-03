import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { ComponentType, useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { GlassView } from "expo-glass-effect";
import { AppText } from "../../components/AppText";

type TabRoute = "discover" | "my-paths" | "profile";

type TabTheme = {
  label: string;
  icon: string;
  activeIcon: string;
  halo: string;
};

const TAB_THEMES: Record<TabRoute, TabTheme> = {
  discover: {
    label: "Discover",
    icon: "🔍",
    activeIcon: "🔎",
    halo: "rgba(20, 184, 255, 0.3)",
  },
  "my-paths": {
    label: "My Paths",
    icon: "📚",
    activeIcon: "📖",
    halo: "rgba(191, 255, 0, 0.3)",
  },
  profile: {
    label: "Profile",
    icon: "👤",
    activeIcon: "🧠",
    halo: "rgba(255, 255, 255, 0.28)",
  },
};

type TabIndicatorProps = {
  focused: boolean;
};

function TabIndicator({ focused }: TabIndicatorProps) {
  const pulse = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    Animated.timing(pulse, {
      toValue: focused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [focused, pulse]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.activePulse,
        {
          opacity: pulse,
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 1],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const SelectorShell: ComponentType<any> = Platform.OS === "web" ? View : GlassView;

function GlassTabBarItem({
  route,
  tab,
  isFocused,
  onPress,
  onLongPress,
}: {
  route: BottomTabBarProps["state"]["routes"][number];
  tab: TabTheme;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const activeAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    activeAnim.stopAnimation();
    Animated.timing(activeAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, activeAnim]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tabItem,
        pressed && styles.tabItemPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={route.name}
    >
      <Animated.View
        style={[
          styles.selectorShell,
          {
            opacity: activeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
            transform: [
              {
                scaleX: activeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.72, 1],
                }),
              },
              {
                scaleY: activeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1],
                }),
              },
            ],
          },
        ]}
      />
      <SelectorShell
        style={[
          styles.selectorGlass,
          {
            opacity: activeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
        ]}
        {...(Platform.OS === "web" ? {} : { glassEffectStyle: "clear" })}
      >
        <Animated.View
          style={[
            styles.selectorGlow,
            {
              opacity: activeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.7],
              }),
              backgroundColor: isFocused ? tab.halo : "transparent",
            },
          ]}
        />
      </SelectorShell>
      <Animated.View
        style={[
          styles.tabContentZ,
          {
            transform: [
              {
                scale: activeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.12],
                }),
              },
            ],
          },
        ]}
      >
        <AppText style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
          {isFocused ? tab.activeIcon : tab.icon}
        </AppText>
      </Animated.View>
      <AppText style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
        {tab.label}
      </AppText>
      {isFocused && <TabIndicator focused />}
    </Pressable>
  );
}

const TAB_ICONS: Record<
  string,
  TabTheme
> = TAB_THEMES;

function triggerTabHaptics(isFocused: boolean) {
  if (Platform.OS === "web") return;

  void (async () => {
    try {
      if (isFocused) {
        await Haptics.selectionAsync();
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error("Haptics error:", error);
    }
  })();
};

const TabShell: ComponentType<any> = Platform.OS === "web" ? View : GlassView;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <TabShell
      style={styles.tabBar}
      {...(Platform.OS === "web" ? {} : { glassEffectStyle: "clear" })}
    >
      <View style={styles.glassHalo} />
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = TAB_ICONS[route.name];

        if (!tab) return null;
        const onPress = () => {
          triggerTabHaptics(isFocused);

          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
          triggerTabHaptics(isFocused);
        };

        return (
          <GlassTabBarItem
            key={route.key}
            route={route}
            tab={tab}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </TabShell>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#FDFFF5" },
      }}
    >
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="my-paths" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 20,
    left: 20,
    right: 20,
    borderRadius: 40,
    overflow: "hidden",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(10, 10, 15, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "rgba(20, 0, 45, 0.35)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 26,
    elevation: 16,
    flexDirection: "row",
    gap: 8,
  },
  glassHalo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    opacity: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    position: "relative",
    borderRadius: 30,
    paddingVertical: 10,
    overflow: "hidden",
  },
  tabItemPressed: {
    opacity: 0.6,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabIconActive: {
    // Active state handled by emoji swap
  },
  tabLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#fff",
  },
  tabContentZ: {
    zIndex: 2,
  },
  selectorShell: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 6,
    bottom: 30,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectorGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.36)",
  },
  selectorGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  activePulse: {
    position: "absolute",
    bottom: 4,
    width: 24,
    height: 3,
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
});
