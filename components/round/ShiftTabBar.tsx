import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ink, Surface, Violet } from "../../lib/theme";
import { Icon, type IconName } from "./Icons";
import { RText } from "./RText";

export type ShiftTab = { name: string; label: string; icon: IconName };

/**
 * Tab bar (DS10, DESIGN.md v3): white, line pictograms with visible labels, active violet-700
 * with a 3pt top indicator, `accessibilityRole="tab"` and `selected` state. No emoji.
 */
export function ShiftTabBar({
  tabs,
  activeName,
  onSelect,
}: {
  tabs: ShiftTab[];
  activeName: string | undefined;
  onSelect: (name: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.name === activeName;
        const color = active ? Violet[700] : Ink.tertiary;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!active) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onSelect(tab.name);
              }
            }}
            style={styles.tab}
          >
            {active ? <View style={styles.indicator} /> : null}
            <Icon name={tab.icon} size={24} color={color} />
            <RText variant="meta" color={color} weight={active ? "700" : "500"} style={{ fontSize: 12 }} numberOfLines={1}>
              {tab.label}
            </RText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Surface.card,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Surface.line,
  },
  tab: { minWidth: 76, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: 6 },
  indicator: {
    position: "absolute",
    top: -8,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: Violet[600],
  },
});
