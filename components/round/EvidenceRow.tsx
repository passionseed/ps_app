import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ink, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";
import { StatusTag, type StatusKind } from "./StatusTag";

export function EvidenceRow({
  title,
  summary,
  meta,
  status,
  statusLabel,
  onPress,
}: {
  title: string;
  summary: string;
  meta: string;
  status: StatusKind;
  statusLabel: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${summary}. ${statusLabel}. ${meta}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Violet[50] }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.top}>
          <RText variant="label" style={{ flexShrink: 1 }}>
            {title}
          </RText>
          <StatusTag kind={status} label={statusLabel} />
        </View>
        {summary ? (
          <RText variant="small" numberOfLines={2}>
            {summary}
          </RText>
        ) : null}
        <RText variant="meta">{meta}</RText>
      </View>
      {onPress ? <Icon name="chevron" size={18} color={Ink.tertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 64,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
});
