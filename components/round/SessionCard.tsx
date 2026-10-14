import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Depth, Ink, Violet } from "../../lib/theme";
import { GemIcon } from "./GemIcon";
import { GlassCard } from "./GlassCard";
import { Icon } from "./Icons";
import { RText } from "./RText";

export type SessionState = "upcoming" | "live" | "ended" | "none";

/** Small glossy pill action (white -> violet-50, violet rim), 44pt touch target. */
export function PillAction({ label, onPress, icon }: { label: string; onPress: () => void; icon?: "external" | "chevron" | "copy" | "share" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [styles.pill, Depth.control, pressed && styles.pillPressed]}
    >
      <LinearGradient colors={["#FFFFFF", Violet[50]]} style={[StyleSheet.absoluteFill, styles.pillRadius]} />
      <RText variant="label" color={Violet[700]} style={styles.pillText} numberOfLines={1}>
        {label}
      </RText>
      {icon ? <Icon name={icon} size={14} color={Violet[700]} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

function LivePulse() {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(p);
  }, [p, reduced]);
  const ring = useAnimatedStyle(() => ({
    opacity: reduced ? 0.35 : 0.45 * (1 - p.value),
    transform: [{ scale: reduced ? 1.12 : 1 + 0.3 * p.value }],
  }));
  return <Animated.View style={[styles.pulse, ring]} />;
}

/**
 * Session card (DESIGN.md v4, mockup B): glass row with a 42pt violet gem tile, title,
 * subtitle and a small pill action. `live` pulses gently (static ring with reduce motion);
 * `none` (no session today) uses a quiet violet-50 tile.
 */
export function SessionCard({
  state,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  state: SessionState;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const quiet = state === "none" || state === "ended";
  return (
    <GlassCard style={styles.row} padding={14}>
      <View style={styles.tileWrap}>
        {state === "live" ? <LivePulse /> : null}
        {quiet ? (
          <View style={styles.quietTile}>
            <Icon name={state === "none" ? "calendar" : "check"} size={20} color={Violet[700]} strokeWidth={2.1} />
          </View>
        ) : (
          <GemIcon icon="video" shape="tile" size={42} iconSize={19} />
        )}
      </View>
      <View style={styles.text}>
        <RText variant="label" color={state === "ended" ? Ink.secondary : Ink.primary}>
          {title}
        </RText>
        {subtitle ? <RText variant="meta">{subtitle}</RText> : null}
      </View>
      {actionLabel && onAction ? <PillAction label={actionLabel} onPress={onAction} /> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  tileWrap: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  quietTile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Violet[50],
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: { position: "absolute", width: 42, height: 42, borderRadius: 14, backgroundColor: Violet[400] },
  text: { flex: 1, minWidth: 0, gap: 1 },
  pill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCD0FF",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    flexShrink: 0,
  },
  pillRadius: { borderRadius: 999 },
  pillText: { fontSize: 13, lineHeight: 18 },
  pillPressed: { transform: [{ translateY: 1 }] },
});
