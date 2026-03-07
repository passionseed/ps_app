import { Tabs } from "expo-router";
import { Platform, Text } from "react-native";

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

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#FDFFF5" },
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: TAB_THEMES.discover.label,
          tabBarIcon: ({ focused, color }) => (
            <TabsEmoji
              icon={
                focused
                  ? TAB_THEMES.discover.activeIcon
                  : TAB_THEMES.discover.icon
              }
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-paths"
        options={{
          title: TAB_THEMES["my-paths"].label,
          tabBarIcon: ({ focused, color }) => (
            <TabsEmoji
              icon={
                focused
                  ? TAB_THEMES["my-paths"].activeIcon
                  : TAB_THEMES["my-paths"].icon
              }
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: TAB_THEMES.profile.label,
          tabBarIcon: ({ focused, color }) => (
            <TabsEmoji
              icon={
                focused
                  ? TAB_THEMES.profile.activeIcon
                  : TAB_THEMES.profile.icon
              }
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabsEmoji({ icon }: { icon: string; color: string }) {
  return <Text>{icon}</Text>;
}
