import React from "react";
import { Tabs } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShift } from "../../lib/shift-context";
import { Accent, PageBg, Text as Colors } from "../../lib/theme";

export default function TabsLayout() {
  const { snapshot } = useShift();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const camp = !!snapshot;
  const thai = snapshot?.introduction?.language === "th";
  const icon =
    (name: "sun" | "project" | "people") =>
    ({ color }: { color: string }) => (
      <Svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {name === "sun" ? (
          <>
            <Circle cx={12} cy={12} r={4} />
            <Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
          </>
        ) : name === "project" ? (
          <>
            <Path d="M4 5h6l2 3h8v12H4z" />
            <Path d="m8 14 2 2 5-5" />
          </>
        ) : (
          <>
            <Circle cx={9} cy={8} r={3} />
            <Path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2" />
          </>
        )}
      </Svg>
    );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: PageBg.default },
        tabBarActiveTintColor: Accent.green,
        tabBarInactiveTintColor: Colors.tertiary,
        tabBarStyle: {
          backgroundColor: "#fff",
          height: 64 + 20 * (fontScale - 1) + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 18 },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: thai ? "วันนี้" : "Today",
          href: camp ? undefined : null,
          tabBarIcon: icon("sun"),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: thai ? "โปรเจกต์" : "Projects",
          href: camp ? undefined : null,
          tabBarIcon: icon("project"),
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          title: thai ? "กลุ่มของฉัน" : "My Group",
          href: camp ? undefined : null,
          tabBarIcon: icon("people"),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          href: camp ? null : undefined,
          tabBarIcon: icon("sun"),
        }}
      />
      <Tabs.Screen
        name="my-paths"
        options={{
          title: "My Paths",
          href: camp ? null : undefined,
          tabBarIcon: icon("project"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: camp ? null : undefined,
          tabBarIcon: icon("people"),
        }}
      />
    </Tabs>
  );
}
