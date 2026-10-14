import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from "react-native-reanimated";
import { useIsFocused } from "expo-router";
import { Depth, Glass, Ink, Violet } from "../../lib/theme";
import { Icon } from "./Icons";
import { RText } from "./RText";

/**
 * Toast (DESIGN.md v4): a small glass pill above the dock. `useToast()` works anywhere; the host
 * lives in RoundShell, and only the focused screen's host shows it (stacked screens stay mounted).
 *
 *   const toast = useToast();
 *   toast.show(t("ui.copied"));   // or toast("...")
 */
type Listener = (text: string) => void;
const hosts: { id: number; listener: Listener }[] = [];
let nextId = 1;

export function showToast(text: string) {
  const host = hosts[hosts.length - 1];
  if (host) host.listener(text);
  else if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(text);
}

export type ToastApi = ((text: string) => void) & { show: (text: string) => void };

export function useToast(): ToastApi {
  return useMemo(() => {
    const fn = ((text: string) => showToast(text)) as ToastApi;
    fn.show = showToast;
    return fn;
  }, []);
}

/** Rendered by RoundShell. `bottom` is the space the dock and tab bar take. */
export function ToastHost({ bottom }: { bottom: number }) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const [text, setText] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listener = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setText(next);
    setKey((k) => k + 1);
    // iOS has no live regions; Android uses accessibilityLiveRegion, web the alert role.
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(next);
    timer.current = setTimeout(() => setText(null), 2200);
  }, []);

  useEffect(() => {
    if (!focused) return;
    const id = nextId++;
    hosts.push({ id, listener });
    return () => {
      const at = hosts.findIndex((h) => h.id === id);
      if (at >= 0) hosts.splice(at, 1);
    };
  }, [focused, listener]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!text) return null;
  return (
    <View style={[styles.wrap, { bottom }]}>
      <Animated.View
        key={key}
        entering={reduced ? undefined : FadeInDown.duration(180)}
        exiting={reduced ? undefined : FadeOutDown.duration(160)}
        style={[styles.pill, Depth.float]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <View style={styles.dot}>
          <Icon name="check" size={13} color="#FFFFFF" strokeWidth={2.8} />
        </View>
        <RText variant="label" color={Ink.primary} style={styles.text} numberOfLines={2}>
          {text}
        </RText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 24, pointerEvents: "none" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 420,
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Glass.border,
    backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.9)",
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Violet[600],
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 14, flexShrink: 1 },
});

/** Alias for a standalone host (RoundShell already renders one; only the focused host shows). */
export function Toast({ bottom = 110 }: { bottom?: number }) {
  return <ToastHost bottom={bottom} />;
}
