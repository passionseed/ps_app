// app/(hackathon)/_layout.tsx
import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { Accent, PageBg, Text as ThemeText } from "../../lib/theme";

export default function HackathonLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PageBg.default,
          borderTopColor: "rgba(0,0,0,0.08)",
        },
        tabBarActiveTintColor: Accent.purple,
        tabBarInactiveTintColor: ThemeText.secondary,
        tabBarLabelStyle: {
          fontFamily: "LibreFranklin_400Regular",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
