import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { Depth, Glass, Ink, Violet } from "../../lib/theme";
import { Icon, type IconName } from "./Icons";
import { RText } from "./RText";

export type ShiftTab = { name: string; label: string; icon: IconName };

export const SHIFT_TAB_BAR_HEIGHT = 60;

/** Distance from the screen bottom to the floating bar (just above the home indicator). */
export function shiftTabBarBottom(safeBottom: number): number {
  return safeBottom > 0 ? Math.max(safeBottom - 6, 10) : 12;
}

/**
 * Tab bar (DESIGN.md v4): a floating frosted-glass bar with a sliding selection pill, line
 * pictograms with visible labels (หน้าแรก / สควอด / โปรไฟล์), `tab` roles with `selected`
 * state. No emoji. Blur on iOS and web; Android gets an opaque white glass (no blur cost).
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
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((tab) => tab.name === activeName));
  const tabWidth = tabs.length ? width / tabs.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    const target = index * tabWidth;
    x.value = reduced || !tabWidth ? target : withSpring(target, { damping: 22, stiffness: 240, mass: 0.7 });
  }, [index, reduced, tabWidth, x]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { bottom: shiftTabBarBottom(insets.bottom) }]}>
      <View style={[styles.bar, Depth.tab]}>
        <View style={styles.clip}>
          {Platform.OS !== "android" ? <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, styles.frost]} />
          <View style={styles.row} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {tabWidth > 0 ? (
              <Animated.View style={[styles.pill, { width: tabWidth - 8 }, pillStyle]}>
                <LinearGradient colors={["#F6F2FF", "#ECE4FF"]} style={[StyleSheet.absoluteFill, styles.pillRadius]} />
                <View style={styles.pillHighlight} />
              </Animated.View>
            ) : null}
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
                  <Icon name={tab.icon} size={22} color={color} strokeWidth={active ? 2.2 : 1.9} />
                  <RText
                    variant="meta"
                    color={color}
                    weight={active ? "700" : "500"}
                    style={styles.label}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {tab.label}
                  </RText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 14, pointerEvents: "box-none" },
  bar: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
    backgroundColor: Platform.OS === "android" ? "#FFFFFF" : undefined,
  },
  clip: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Glass.border,
  },
  frost: { backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.74)" },
  row: { flexDirection: "row", height: SHIFT_TAB_BAR_HEIGHT - 2, alignItems: "center" },
  pill: { position: "absolute", left: 4, top: 5, bottom: 5, borderRadius: 17 },
  pillRadius: { borderRadius: 17 },
  pillHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 17,
    borderTopWidth: 1,
    borderTopColor: "#FFFFFF",
  },
  tab: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 1, minHeight: 48 },
  label: { fontSize: 12, lineHeight: 17 },
});
