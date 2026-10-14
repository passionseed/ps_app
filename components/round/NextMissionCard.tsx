import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Gem, Ink, Violet } from "../../lib/theme";
import { HeroCard } from "./HeroCard";
import { Icon } from "./Icons";
import { Tag } from "./primitives";
import { RText } from "./RText";

/**
 * "Now" card (DESIGN.md v4): the raised hero with a big faded numeral, mission tag, count,
 * title, next step and optional slots (done = glowing gem, next = ringed, later = dashed).
 */
export function NextMissionCard({
  tag,
  count,
  title,
  body,
  slots,
  slotLabel,
  filledLabel = "",
  footer,
  watermark,
}: {
  tag: string;
  count: string;
  title: string;
  body: string;
  slots?: { filled: boolean; label: number }[] | null;
  slotLabel?: (n: number) => string;
  filledLabel?: string;
  footer?: React.ReactNode;
  /** Big faded numeral; defaults to the number in `tag` ("MISSION 4" -> "4"). */
  watermark?: string;
}) {
  const mark = watermark ?? tag.match(/(\d+)\s*$/)?.[1];
  const nextIndex = slots?.findIndex((s) => !s.filled) ?? -1;
  return (
    <HeroCard watermark={mark} style={styles.card}>
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
          {slots.map((slot, i) => {
            const label = slotLabel ? slotLabel(slot.label) : String(slot.label);
            const next = i === nextIndex;
            return (
              <View
                key={slot.label}
                style={[styles.slot, slot.filled ? [styles.slotFilled, Depth.glow] : next ? styles.slotNext : styles.slotEmpty]}
                accessible
                accessibilityLabel={`${label} ${slot.filled ? filledLabel : ""}`}
              >
                {slot.filled ? (
                  <>
                    <LinearGradient colors={[...Gem.face]} style={[StyleSheet.absoluteFill, styles.slotRadius]} />
                    <View style={styles.slotHighlight} />
                    <Icon name="check" size={15} color="#FFFFFF" strokeWidth={2.8} />
                  </>
                ) : null}
                <RText
                  variant="meta"
                  color={slot.filled ? "#FFFFFF" : next ? Violet[700] : Ink.tertiary}
                  weight={slot.filled || next ? "700" : "500"}
                >
                  {label}
                </RText>
              </View>
            );
          })}
        </View>
      ) : null}
      {footer}
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  slots: { flexDirection: "row", gap: 8, marginTop: 6 },
  slot: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  slotRadius: { borderRadius: 14 },
  slotFilled: { backgroundColor: Platform.OS === "android" ? Gem.face[1] : undefined },
  slotHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderTopWidth: 1,
    borderTopColor: Gem.highlight,
    pointerEvents: "none",
  },
  slotNext: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: Violet[300],
    ...(Platform.OS === "android" ? null : { boxShadow: "0px 0px 0px 4px rgba(147,132,213,0.12)" }),
  },
  slotEmpty: { backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D4D2E2" },
});
