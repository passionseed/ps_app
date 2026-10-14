import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PageBg } from "../../lib/theme";
import { ShiftTabBar, type ShiftTab } from "../../components/round/ShiftTabBar";
import { useRoundLang, useShiftMode } from "../../lib/round/hooks";

/**
 * Tabs (scale spec D1): the app is SHIFT. หน้าแรก (Home, route `shift`), สควอด (only while the
 * user has an entry in a round) and โปรไฟล์. PathLab (discover, explore, my-paths), Build and the
 * old camp tabs (today, projects, group) stay as files with `href: null` and no entry points;
 * `decideRoute` sends old deep links to them back to Home.
 */
type TabRoute = "shift" | "squad" | "profile";

const ICONS: Record<TabRoute, ShiftTab["icon"]> = { shift: "house", squad: "people", profile: "person" };

export default function TabsLayout() {
  const { squadTab } = useShiftMode();
  const { t } = useRoundLang();
  const visible: TabRoute[] = squadTab ? ["shift", "squad", "profile"] : ["shift", "profile"];
  const labels: Record<TabRoute, string> = { shift: t("tab.home"), squad: t("tab.squad"), profile: t("tab.profile") };
  const shown = (name: TabRoute) => (visible.includes(name) ? undefined : null);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props: BottomTabBarProps) => (
          <ShiftTabBar
            tabs={visible.map((name) => ({ name, icon: ICONS[name], label: labels[name] }))}
            activeName={props.state.routes[props.state.index]?.name}
            onSelect={(name) => props.navigation.navigate(name)}
          />
        )}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: PageBg.default },
        }}
      >
        <Tabs.Screen name="shift" />
        <Tabs.Screen name="squad" options={{ href: shown("squad") }} />
        <Tabs.Screen name="profile" />
        {/* Hidden by D1: files stay, no entry points. */}
        <Tabs.Screen name="discover" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="my-paths" options={{ href: null }} />
        <Tabs.Screen name="build" options={{ href: null }} />
        <Tabs.Screen name="today" options={{ href: null }} />
        <Tabs.Screen name="projects" options={{ href: null }} />
        <Tabs.Screen name="group" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
