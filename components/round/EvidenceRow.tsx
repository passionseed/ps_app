import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Depth, Glass, Ink, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";
import { StatusTag, type StatusKind } from "./StatusTag";

/** Evidence row (DESIGN.md v4): a glass list row with the status in words. */
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
      style={({ pressed }) => [styles.row, Depth.row, pressed && styles.pressed]}
    >
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
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
      {onPress ? <Icon name="chevron" size={18} color={Violet[700]} /> : null}
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
    backgroundColor: Platform.OS === "android" ? Glass.fillAndroid : "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: Glass.border,
    borderRadius: 18,
  },
  pressed: { backgroundColor: Violet[50], transform: [{ translateY: 1 }] },
  top: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
});
