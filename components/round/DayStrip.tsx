import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Gem, Ink, Violet } from "../../lib/theme";
import { useRoundLang } from "../../lib/round/hooks";
import { Icon } from "./Icons";
import { RText } from "./RText";

export type DayStripState = "done" | "today" | "future" | "missed";
export type DayStripDay = { day: number; label: string; state: DayStripState; session: boolean };

/**
 * Day strip (DESIGN.md v4, mockup B): one 44pt cell per round day. Today is a glowing violet
 * gem, done days are violet-50 with a check, a dot marks session days. Each cell says its state
 * in words for screen readers (never colour alone).
 */
export function DayStrip({ days, onPress }: { days: DayStripDay[]; onPress?: (day: number) => void }) {
  const { t } = useRoundLang();
  return (
    <View style={styles.row} accessibilityRole="list">
      {days.map((d) => {
        const today = d.state === "today";
        const done = d.state === "done";
        const fg = today ? "#FFFFFF" : done ? Violet[700] : Ink.tertiary;
        const stateWord = today ? t("ui.a11y.today") : done ? t("mission.done") : d.state === "missed" ? t("ui.a11y.missed") : "";
        const a11y = [t("ui.a11y.day", { day: d.day }), d.label, stateWord, d.session ? t("ui.a11y.session") : ""]
          .filter(Boolean)
          .join(", ");
        const content = (
          <>
            {today ? (
              <>
                <LinearGradient colors={[...Gem.face]} style={[StyleSheet.absoluteFill, styles.cellRadius]} />
                <View style={[styles.highlight, styles.none]} />
              </>
            ) : null}
            {d.session ? <View style={[styles.dot, { backgroundColor: today ? "#FFFFFF" : Violet[400] }]} /> : null}
            <RText variant="label" latin color={fg} style={styles.num} maxFontSizeMultiplier={1.3}>
              {String(d.day)}
            </RText>
            {done ? (
              <Icon name="check" size={12} color={Violet[700]} strokeWidth={3} />
            ) : (
              <RText variant="meta" color={fg} weight={today ? "700" : "500"} style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {d.label}
              </RText>
            )}
          </>
        );
        const cellStyle = [styles.cell, today ? [styles.today, Depth.glow] : done ? styles.done : d.state === "missed" ? styles.missed : styles.future];
        return onPress ? (
          <Pressable
            key={d.day}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            accessibilityState={{ selected: today }}
            onPress={() => onPress(d.day)}
            style={({ pressed }) => [cellStyle, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={d.day} style={cellStyle} accessible accessibilityLabel={a11y}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  cell: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderWidth: 1,
  },
  cellRadius: { borderRadius: 14 },
  future: { backgroundColor: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.9)" },
  missed: { backgroundColor: "rgba(255,255,255,0.45)", borderColor: "#D4D2E2", borderStyle: "dashed" },
  done: { backgroundColor: Violet[50], borderColor: "#E7E5FB" },
  today: {
    borderColor: "transparent",
    // Android elevation needs a background to cast from; the gradient covers it.
    backgroundColor: Platform.OS === "android" ? Gem.face[1] : undefined,
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderTopWidth: 1,
    borderTopColor: Gem.highlight,
  },
  dot: { position: "absolute", top: 5, right: 6, width: 5, height: 5, borderRadius: 3 },
  num: { fontSize: 15, lineHeight: 19 },
  label: { fontSize: 11, lineHeight: 15 },
  none: { pointerEvents: "none" },
  pressed: { transform: [{ translateY: 1 }] },
});
