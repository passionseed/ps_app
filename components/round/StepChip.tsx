import React from "react";
import { StyleSheet, View } from "react-native";
import { Ink, Status, Surface, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";

export type StepChipState = "done" | "progress" | "todo";

/**
 * Step chip (DESIGN.md v4): done = success tint with a check, progress = violet-50 with
 * violet-700 text, todo = white with a hairline. The label always carries the words.
 */
export function StepChip({ label, state }: { label: string; state: StepChipState }) {
  const palette =
    state === "done"
      ? { bg: Status.successBg, border: "#CFEBDD", fg: Status.success }
      : state === "progress"
        ? { bg: Violet[50], border: "#D4CFF7", fg: Violet[700] }
        : { bg: "#FFFFFF", border: Surface.line, fg: Ink.secondary };
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      {state === "done" ? <Icon name="check" size={13} color={palette.fg} strokeWidth={2.8} /> : null}
      <RText variant="small" weight="700" color={palette.fg} style={styles.text}>
        {label}
      </RText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
});
