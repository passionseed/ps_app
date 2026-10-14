import React from "react";
import { StyleSheet, View } from "react-native";
import { Key } from "./Key";

export type Chip<T extends string> = { value: T; label: string };

/**
 * Radio keys (DESIGN.md section 6): small porcelain keys with an unlit LED ring. The selected
 * key latches down, turns violet and lights its LED; pressing another pops it back up, like the
 * preset buttons on a car radio. Selection is said three ways: position, colour and the LED
 * (plus the radio a11y state). A selection tick on press.
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
          <Key
            key={chip.value}
            size="sm"
            tone={selected ? "shift" : "porcelain"}
            label={chip.label}
            accessibilityRole="radio"
            selected={selected}
            down={selected}
            led={selected ? "on" : "off"}
            haptic="select"
            labelWeight={selected ? "700" : "500"}
            onPress={() => onChange(chip.value)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
