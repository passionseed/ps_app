import React from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ink, Surface, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";

export type TrailItem = {
  key: string;
  number: number;
  title: string;
  /** Word for the state: "เสร็จแล้ว", "1/3", "ยังไม่ถึง" (never colour alone). */
  stateLabel: string;
  state: "done" | "current" | "todo";
};

function Node({ state }: { state: TrailItem["state"] }) {
  if (state === "done") {
    return (
      <View style={[styles.node, { backgroundColor: Violet[50] }]}>
        <Icon name="check" size={16} color={Violet[700]} strokeWidth={2.6} />
      </View>
    );
  }
  if (state === "current") {
    return (
      <View style={styles.ring}>
        <View style={[styles.node, { backgroundColor: Violet[600], width: 26, height: 26 }]} />
      </View>
    );
  }
  return <View style={[styles.node, { borderWidth: 2, borderColor: Surface.control, backgroundColor: Surface.card }]} />;
}

/**
 * Mission trail (DESIGN.md v3): done = violet-50 + check, current = solid violet-600 with ring,
 * not yet = hollow. Horizontal at normal sizes; a vertical list at accessibility text sizes.
 */
export function MissionTrail({ items, onPress }: { items: TrailItem[]; onPress?: (key: string) => void }) {
  const { fontScale } = useWindowDimensions();
  const vertical = fontScale >= 1.3;
  return (
    <View style={vertical ? styles.vertical : styles.horizontal} accessibilityRole="list">
      {!vertical ? <View style={styles.line} /> : null}
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={`MISSION ${item.number}, ${item.title}, ${item.stateLabel}`}
          onPress={onPress ? () => onPress(item.key) : undefined}
          style={({ pressed }) => [vertical ? styles.rowV : styles.colH, pressed && { opacity: 0.7 }]}
        >
          <Node state={item.state} />
          <View style={vertical ? { flex: 1 } : styles.labelH}>
            <RText
              variant="small"
              color={Ink.primary}
              weight={item.state === "current" ? "700" : "500"}
              style={vertical ? { fontSize: 15 } : styles.titleH}
              numberOfLines={vertical ? undefined : 3}
            >
              {item.title}
            </RText>
            <RText
              variant="meta"
              color={item.state === "current" ? Violet[700] : Ink.tertiary}
              style={vertical ? undefined : styles.metaH}
              latin={/^\d/.test(item.stateLabel)}
            >
              {item.stateLabel}
            </RText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontal: { flexDirection: "row", justifyContent: "space-between", position: "relative" },
  line: { position: "absolute", left: 24, right: 24, top: 21, height: 2, backgroundColor: Surface.line },
  colH: { flex: 1, alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 1 },
  labelH: { alignItems: "center" },
  titleH: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  metaH: { fontSize: 12, textAlign: "center" },
  vertical: { gap: 4 },
  rowV: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  node: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 6 },
  ring: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: Violet[100],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
