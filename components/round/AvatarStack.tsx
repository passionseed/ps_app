import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Gem } from "../../lib/theme";
import { RText } from "./RText";

export type AvatarPerson = { label: string; tone?: "violet" | "ink" };

/** One avatar gem: gradient face, white ring, initials (>= 4.9:1 white on the gradient). */
export function AvatarGem({
  label,
  tone = "violet",
  index = 0,
  size = 32,
  ring = true,
}: {
  label: string;
  tone?: "violet" | "ink";
  index?: number;
  size?: number;
  ring?: boolean;
}) {
  const colors = tone === "ink" ? Gem.ink : Gem.avatars[index % Gem.avatars.length];
  const text = tone === "ink" ? label.slice(0, 3) : Array.from(label.trim())[0] ?? "?";
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, borderWidth: ring ? 2 : 0 },
        Platform.OS === "android" && { backgroundColor: colors[1] },
        Depth.avatar,
      ]}
    >
      <LinearGradient colors={[...colors]} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      <View style={[styles.shine, { borderRadius: size / 2 }]} />
      <RText variant="label" color="#FFFFFF" style={{ fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.62) }} maxFontSizeMultiplier={1.2}>
        {text.toUpperCase()}
      </RText>
    </View>
  );
}

/** Avatar stack (DESIGN.md v4): overlapping gradient gems with white rings. */
export function AvatarStack({ people, size = 32 }: { people: AvatarPerson[]; size?: number }) {
  let violet = 0;
  return (
    <View style={styles.row} accessible accessibilityLabel={people.map((p) => p.label).join(", ")}>
      {people.map((p, i) => (
        <View key={`${p.label}-${i}`} style={i ? { marginLeft: -Math.round(size * 0.26) } : null}>
          <AvatarGem label={p.label} tone={p.tone} index={p.tone === "ink" ? 0 : violet++} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { alignItems: "center", justifyContent: "center", borderColor: "#FFFFFF", overflow: "visible" },
  shine: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.4)",
    pointerEvents: "none",
  },
});
