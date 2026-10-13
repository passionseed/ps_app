import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ink, Surface, Violet } from "../../lib/theme";
import { RText } from "./RText";

export type Chip<T extends string> = { value: T; label: string };

/** Chips (DESIGN.md v3): 44pt+, unselected white with a #CFC8E6 border, selected solid violet-600. */
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
            style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && !selected && { backgroundColor: Violet[50] }]}
          >
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
    backgroundColor: Surface.card,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: Violet[600], borderColor: Violet[600] },
});
