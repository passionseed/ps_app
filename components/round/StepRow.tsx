import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Gem, Glass, Ink, Status, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";

export type StepRowState = "done" | "current" | "todo";

function Badge({ n, state }: { n: number; state: StepRowState }) {
  if (state === "done") {
    return (
      <View style={[styles.badge, { backgroundColor: Violet[50] }]}>
        <Icon name="check" size={15} color={Violet[700]} strokeWidth={2.8} />
      </View>
    );
  }
  if (state === "current") {
    return (
      <View style={[styles.badge, styles.badgeRing]}>
        <LinearGradient colors={[...Gem.face]} style={[StyleSheet.absoluteFill, styles.badgeRadius]} />
        <RText variant="label" latin color="#FFFFFF" style={styles.badgeText}>
          {String(n)}
        </RText>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeTodo]}>
      <RText variant="label" latin color={Ink.tertiary} style={styles.badgeText}>
        {String(n)}
      </RText>
    </View>
  );
}

/**
 * Step row (DESIGN.md v4, mockup C): glass row with a number badge, the step title and a
 * trailing word or count. The current step is raised (gradient, deeper shadow, gem badge).
 */
export function StepRow({
  n,
  title,
  state,
  trailing,
  onPress,
}: {
  n: number;
  title: string;
  state: StepRowState;
  trailing: string;
  onPress?: () => void;
}) {
  const current = state === "current";
  const trailingColor = state === "done" ? Status.success : current ? Violet[700] : Ink.tertiary;
  const content = (
    <>
      {current ? (
        <LinearGradient
          colors={["#FFFFFF", "#F3EEFF"]}
          start={{ x: 0.33, y: 0 }}
          end={{ x: 0.67, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.radius]}
        />
      ) : null}
      <Badge n={n} state={state} />
      <RText variant="body" color={Ink.primary} weight={current ? "500" : "400"} style={styles.title}>
        {title}
      </RText>
      {trailing ? (
        <RText variant="meta" weight="700" color={trailingColor} latin={/^[\d/ ]+/.test(trailing)} style={styles.trailing}>
          {trailing}
        </RText>
      ) : null}
    </>
  );
  const style = [styles.row, current ? [styles.current, Depth.raised] : [styles.glass, Depth.row]];
  const a11y = `${n}. ${title}. ${trailing}`;
  if (!onPress) {
    return (
      <View style={style} accessible accessibilityLabel={a11y}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 58,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  radius: { borderRadius: 18 },
  glass: {
    backgroundColor: Platform.OS === "android" ? Glass.fillAndroid : "rgba(255,255,255,0.7)",
    borderColor: Glass.border,
  },
  current: { borderColor: "#E3D9FF", backgroundColor: "#FFFFFF" },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  badgeRadius: { borderRadius: 15 },
  badgeRing: { borderWidth: 3, borderColor: "rgba(139,107,255,0.18)", width: 36, height: 36, borderRadius: 18, marginHorizontal: -3 },
  badgeTodo: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#CFC8E6" },
  badgeText: { fontSize: 13, lineHeight: 17 },
  title: { flex: 1, minWidth: 0, fontSize: 15 },
  trailing: { fontSize: 13, flexShrink: 0, maxWidth: "40%", textAlign: "right" },
  pressed: { transform: [{ translateY: 1 }] },
});
