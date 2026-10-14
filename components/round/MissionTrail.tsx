import React from "react";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Gem, Ink, Violet } from "../../lib/theme";
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

function Node({ state, number }: { state: TrailItem["state"]; number: number }) {
  if (state === "done") {
    return (
      <View style={[styles.node, styles.nodeDone]}>
        <Icon name="check" size={15} color={Violet[700]} strokeWidth={2.8} />
      </View>
    );
  }
  if (state === "current") {
    return (
      <View style={styles.ring}>
        <View style={[styles.gem, Depth.glow]}>
          <LinearGradient colors={[...Gem.face]} style={[StyleSheet.absoluteFill, { borderRadius: 15 }]} />
          <RText variant="label" latin color="#FFFFFF" style={styles.num}>
            {String(number)}
          </RText>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.node, styles.nodeTodo]}>
      <RText variant="label" latin color={Ink.tertiary} style={styles.num}>
        {String(number)}
      </RText>
    </View>
  );
}

/**
 * Mission trail (DESIGN.md v4): done = violet-50 + check, current = glowing violet gem with a
 * soft ring, not yet = white with a hairline. Horizontal at normal sizes; a vertical list at
 * accessibility text sizes. Every node also says its state in words.
 */
export function MissionTrail({ items, onPress }: { items: TrailItem[]; onPress?: (key: string) => void }) {
  const { fontScale } = useWindowDimensions();
  const vertical = fontScale >= 1.3;
  return (
    <View style={vertical ? styles.vertical : styles.horizontal} accessibilityRole="list">
      {!vertical ? (
        <LinearGradient
          colors={["rgba(139,107,255,0.10)", "rgba(139,107,255,0.28)", "rgba(139,107,255,0.10)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.line}
        />
      ) : null}
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={`MISSION ${item.number}, ${item.title}, ${item.stateLabel}`}
          onPress={onPress ? () => onPress(item.key) : undefined}
          style={({ pressed }) => [vertical ? styles.rowV : styles.colH, pressed && { opacity: 0.7 }]}
        >
          <Node state={item.state} number={item.number} />
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
  line: { position: "absolute", left: 24, right: 24, top: 21, height: 2, borderRadius: 1 },
  colH: { flex: 1, alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 1 },
  labelH: { alignItems: "center" },
  titleH: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  metaH: { fontSize: 12, textAlign: "center" },
  vertical: { gap: 4 },
  rowV: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  node: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 6 },
  nodeDone: { backgroundColor: Violet[50], borderWidth: 1, borderColor: "#E4DAFF" },
  nodeTodo: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#CFC8E6" },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: "rgba(139,107,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  gem: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Platform.OS === "android" ? Gem.face[1] : undefined,
  },
  num: { fontSize: 13, lineHeight: 17 },
});
