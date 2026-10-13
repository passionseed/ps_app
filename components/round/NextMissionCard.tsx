import React from "react";
import { StyleSheet, View } from "react-native";
import { Ink, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { Card, Tag } from "./primitives";
import { RText } from "./RText";

/** "Now" card from the mockup: mission tag, count, title, next step, optional slots. */
export function NextMissionCard({
  tag,
  count,
  title,
  body,
  slots,
  slotLabel,
  filledLabel = "",
  footer,
}: {
  tag: string;
  count: string;
  title: string;
  body: string;
  slots?: { filled: boolean; label: number }[] | null;
  slotLabel?: (n: number) => string;
  filledLabel?: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Tag label={tag} />
        <RText variant="meta" color={Ink.secondary} weight="500">
          {count}
        </RText>
      </View>
      <RText variant="title" accessibilityRole="header">
        {title}
      </RText>
      <RText variant="body">{body}</RText>
      {slots && slots.length ? (
        <View style={styles.slots}>
          {slots.map((slot) => (
            <View
              key={slot.label}
              style={[styles.slot, slot.filled ? styles.slotFilled : styles.slotEmpty]}
              accessibilityLabel={`${slotLabel ? slotLabel(slot.label) : slot.label} ${slot.filled ? filledLabel : ""}`}
            >
              {slot.filled ? <Icon name="check" size={15} color={Violet[700]} strokeWidth={2.6} /> : null}
              <RText variant="meta" color={slot.filled ? Violet[700] : Ink.tertiary} weight={slot.filled ? "700" : "500"}>
                {slotLabel ? slotLabel(slot.label) : String(slot.label)}
              </RText>
            </View>
          ))}
        </View>
      ) : null}
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slots: { flexDirection: "row", gap: 8, marginTop: 4 },
  slot: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  slotFilled: { backgroundColor: Violet[50] },
  slotEmpty: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "#B9B1D6" },
});
