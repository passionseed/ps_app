import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Gem, Ink, Violet } from "../../lib/theme";
import { RText } from "./RText";

export type Chip<T extends string> = { value: T; label: string };

/**
 * Chips (DESIGN.md v4): 44pt+. Unselected: white with a #CFC8E6 rim. Selected: a glowing violet
 * gem gradient with white text (>= 5:1 where the text sits) and a top highlight.
 */
export function ChipPicker<T extends string>({
  chips,
  value,
  onChange,
  accessibilityLabel,
  multiline = true,
}: {
  chips: Chip<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  multiline?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[styles.row, !multiline && { flexWrap: "nowrap" }]}>
      {chips.map((chip) => {
        const selected = chip.value === value;
        return (
          <Pressable
            key={chip.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={chip.label}
            onPress={() => onChange(chip.value)}
            style={({ pressed }) => [
              styles.chip,
              selected ? [styles.chipOn, Depth.glow] : Depth.row,
              pressed && !selected && { backgroundColor: Violet[50] },
              pressed && { transform: [{ translateY: 1 }] },
            ]}
          >
            {selected ? (
              <>
                <LinearGradient colors={[...Gem.face]} style={[StyleSheet.absoluteFill, styles.radius]} />
                <View style={styles.highlight} />
              </>
            ) : null}
            <RText variant="label" color={selected ? "#FFFFFF" : Ink.primary} weight={selected ? "700" : "500"} style={{ fontSize: 15 }}>
              {chip.label}
            </RText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#CFC8E6",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  chipOn: { borderColor: "transparent", backgroundColor: Platform.OS === "android" ? Gem.face[1] : Violet[600] },
  radius: { borderRadius: 999 },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderTopWidth: 1,
    borderTopColor: Gem.highlight,
    pointerEvents: "none",
  },
});
