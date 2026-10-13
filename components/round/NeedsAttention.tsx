import React from "react";
import { StyleSheet, View } from "react-native";
import { Status } from "../../lib/theme";
import { Icon } from "./Icons";
import { TextButton } from "./primitives";
import { RText } from "./RText";

/** Needs-attention card (DS1, DS5): warning tone with a word and an icon, one action. */
export function NeedsAttention({
  text,
  detail,
  actionLabel,
  onAction,
  tone = "warning",
}: {
  text: string;
  detail?: string | null;
  actionLabel: string;
  onAction: () => void;
  tone?: "warning" | "violet";
}) {
  const bg = tone === "warning" ? Status.warningBg : "#F1ECFF";
  const fg = tone === "warning" ? Status.warning : "#5B2FD6";
  return (
    <View style={[styles.card, { backgroundColor: bg }]} accessibilityRole="summary">
      <View style={styles.row}>
        <Icon name="alert" size={20} color={fg} />
        <RText variant="label" color={fg} style={{ flex: 1 }}>
          {text}
        </RText>
      </View>
      {detail ? (
        <RText variant="small" color={fg}>
          {detail}
        </RText>
      ) : null}
      <View style={{ alignItems: "flex-start" }}>
        <TextButton label={actionLabel} onPress={onAction} tone="ink" icon="chevron" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, gap: 6 },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
});
