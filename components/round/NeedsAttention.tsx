import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Ink, Status, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { TextButton } from "./primitives";
import { RText } from "./RText";

/**
 * Needs-attention card (DS1, DS5; DESIGN.md v4): a warm tinted card that sits on the page with a
 * soft shadow; the state is said with an icon and words, one action.
 */
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
  const warm = tone === "warning";
  const fg = warm ? Status.warning : Violet[700];
  return (
    <View style={[styles.card, { borderColor: warm ? "#FBE1BC" : "#E7E5FB" }, Depth.row]} accessibilityRole="summary">
      <LinearGradient
        colors={warm ? ["#FFF7EC", Status.warningBg] : ["#FFFFFF", Violet[50]]}
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
      />
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: warm ? "#FFE7C7" : "#EBE8FD" }]}>
          <Icon name="alert" size={18} color={fg} />
        </View>
        <RText variant="label" color={warm ? fg : Ink.primary} style={{ flex: 1 }}>
          {text}
        </RText>
      </View>
      {detail ? (
        <RText variant="small" color={warm ? fg : Ink.secondary}>
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
  card: { borderRadius: 20, padding: 14, gap: 6, borderWidth: 1, backgroundColor: Status.warningBg },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
