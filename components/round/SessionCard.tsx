import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Ink, Violet } from "../../lib/theme";
import { GemIcon } from "./GemIcon";
import { GlassCard } from "./GlassCard";
import { Icon } from "./Icons";
import { Key } from "./Key";
import { RText } from "./RText";

export type SessionState = "upcoming" | "live" | "ended" | "none";

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
 * subtitle and a small porcelain key. `live` pulses gently (static ring with reduce motion);
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
      {actionLabel && onAction ? <Key size="sm" label={actionLabel} onPress={onAction} /> : null}
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
});
