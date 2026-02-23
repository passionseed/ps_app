import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable } from "react-native";

const TAB_ICONS: Record<string, { label: string; icon: string; activeIcon: string }> = {
  goals: {
    label: "Goals",
    icon: "○",
    activeIcon: "●",
  },
  proofs: {
    label: "Proofs",
    icon: "□",
    activeIcon: "■",
  },
  profile: {
    label: "Profile",
    icon: "△",
    activeIcon: "▲",
  },
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tab = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [
              styles.tabItem,
              pressed && styles.tabItemPressed,
            ]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
          >
            <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
              {isFocused ? tab.activeIcon : tab.icon}
            </Text>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isFocused && <View style={styles.tabIndicator} />}
          </Pressable>
        );
      })}
    </View>
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
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="proofs" />
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
    flexDirection: "row",
    backgroundColor: "#FDFFF5",
    borderRadius: 40,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    position: "relative",
    paddingVertical: 4,
  },
  tabItemPressed: {
    opacity: 0.6,
  },
  tabIcon: {
    fontSize: 20,
    color: "#999",
  },
  tabIconActive: {
    color: "#111",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#999",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#111",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -4,
    width: 24,
    height: 3,
    backgroundColor: "#BFFF00",
    borderRadius: 2,
  },
});
