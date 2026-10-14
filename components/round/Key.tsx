import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { KeyDish, Keycap, KeySize, type KeyPalette, type KeySizeName, type KeyTone } from "../../lib/theme";
import { Icon, type IconName } from "./Icons";
import { RText } from "./RText";

/**
 * Press feel (v4.2.1: 20% softer than the first cut, which "did too much"). The face eases down
 * like a cushioned switch, goes 80% of the way so the wall never fully closes, darkens a little
 * and keeps a fifth of its pool. It returns without a visible bounce.
 */
const PRESS = { duration: 66, easing: Easing.out(Easing.cubic) };
/** Return spring: damping ratio 0.69, about 0.16pt of overshoot, settled in about 175ms. */
const RELEASE = { mass: 0.5, stiffness: 416, damping: 20 };
/** Share of `travel - 1` the face moves when pressed (3.2pt on a large key). */
const PRESS_DEPTH = 0.8;
/** Share of the ambient pool that stays while pressed. */
const PRESSED_AMBIENT = 0.2;
/** Radio keys wait this long before springing back, so a press that selects them stays down. */
const LATCH_GRACE_MS = 80;

const continuous = Platform.OS === "ios" ? ({ borderCurve: "continuous" } as const) : null;
/** Directional glyphs point where you go, so they follow the label. */
const TRAILING: IconName[] = ["arrow", "chevron", "external"];

export type KeyProps = {
  label: string;
  onPress: () => void;
  tone?: KeyTone;
  size?: KeySizeName;
  icon?: IconName;
  /** Icon-only round key; `label` is the accessibility label. */
  round?: boolean;
  /** Held down: a selected radio key, or a one-way toggle that is done (stays lit if disabled). */
  down?: boolean;
  /** Radio indicator: unlit ring or lit dot. */
  led?: "off" | "on";
  busy?: boolean;
  disabled?: boolean;
  /** `click` = light tap as the key goes down; `select` = selection tick (radio keys). */
  haptic?: "click" | "select" | "none";
  accessibilityRole?: "button" | "radio";
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  selected?: boolean;
  /** Full width. Defaults to true except for small and round keys. */
  stretch?: boolean;
  labelWeight?: "500" | "700";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A keycap (DESIGN.md section 6). The face eases down over its wall while pressed (never closing
 * it), the ambient shadow softens, and a light haptic marks the press. Busy keys stay down with
 * a gentle activity light until the work finishes, then settle back. Radio keys latch down
 * while selected, so pressing one pops the previous one up, like preset buttons on a car radio.
 */
export function Key({
  label,
  onPress,
  tone = "porcelain",
  size = "md",
  icon,
  round = false,
  down = false,
  led,
  busy = false,
  disabled = false,
  haptic = "click",
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityHint,
  selected,
  stretch,
  labelWeight = "700",
  style,
  testID,
}: KeyProps) {
  const reduced = useReducedMotion();
  const spec = KeySize[size];
  const travel = spec.travel;
  const face = round ? spec.round : spec.face;
  const radius = round ? face / 2 : spec.radius;
  // A latched key that is locked (a cheer already sent) stays lit; other disabled keys go unlit.
  const off = disabled && !busy && !down;
  const palette: KeyPalette = Keycap[off ? "off" : tone];
  const held = down || busy;
  const latch = accessibilityRole === "radio";
  const fill = stretch ?? (!round && size !== "sm");

  const pos = useSharedValue(held ? 1 : 0);
  useEffect(() => {
    if (reduced) pos.value = held ? 1 : 0;
    else pos.value = held ? withTiming(1, PRESS) : withSpring(0, RELEASE);
  }, [held, reduced, pos]);

  const faceMotion = useAnimatedStyle(() => ({ transform: [{ translateY: pos.value * (travel - 1) * PRESS_DEPTH }] }));
  const ambientMotion = useAnimatedStyle(() => ({ opacity: 1 - (1 - PRESSED_AMBIENT) * Math.min(1, Math.max(0, pos.value)) }));
  const shadeMotion = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, pos.value)) }));

  const pressIn = () => {
    if (haptic === "click") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    else if (haptic === "select") void Haptics.selectionAsync().catch(() => {});
    if (held) return;
    pos.value = reduced ? 1 : withTiming(1, PRESS);
  };
  const pressOut = () => {
    if (held) return;
    if (reduced) pos.value = 0;
    else pos.value = latch ? withDelay(LATCH_GRACE_MS, withSpring(0, RELEASE)) : withSpring(0, RELEASE);
  };

  const iconSize = round ? spec.roundIcon : spec.icon;
  const glyph = icon && !busy ? <Icon name={icon} size={iconSize} color={palette.icon} strokeWidth={2.4} /> : null;
  const trailing = !!icon && TRAILING.includes(icon);

  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || busy,
        busy,
        ...(latch ? { selected: !!selected, checked: !!selected } : null),
      }}
      disabled={disabled || busy}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      hitSlop={face + travel < 44 ? { top: 4, bottom: 4 } : undefined}
      // Full-width keys stretch; the rest keep the parent's alignment (centred in the recorder
      // card, inline in rows).
      style={[fill && styles.fill, round && { width: face }, style]}
    >
      {/* The key sizes itself, so a parent that stretches the Pressable never stretches the wall. */}
      <View style={{ paddingBottom: travel }}>
        {!off && palette.ambient && Platform.OS !== "android" ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, continuous, { borderRadius: radius, boxShadow: palette.ambient }, styles.none, ambientMotion]}
          />
        ) : null}
        {/* Contact shadow: the wall's outline 1pt lower. A plain view (not elevation) so Android
            keeps the face above the wall. */}
        <View style={[styles.wall, continuous, { top: travel + 1, bottom: -1, borderRadius: radius, backgroundColor: palette.contact }]} />
        <View style={[styles.wall, continuous, { top: travel, borderRadius: radius, backgroundColor: palette.wall[0] }]}>
          <LinearGradient
            colors={[palette.wall[0], palette.wall[0], palette.wall[1]]}
            locations={[0, 0.84, 1]}
            style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          />
        </View>
        <Animated.View
          style={[styles.face, continuous, { minHeight: face, borderRadius: radius }, round && { width: face, height: face }, faceMotion]}
        >
          <LinearGradient colors={[...palette.dish]} locations={[...KeyDish]} style={[StyleSheet.absoluteFill, styles.none]} />
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: palette.shade }, styles.none, shadeMotion]} />
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.bevel,
              continuous,
              {
                borderRadius: radius,
                borderTopColor: palette.bevel.top,
                borderLeftColor: palette.bevel.side,
                borderRightColor: palette.bevel.side,
                borderBottomColor: palette.bevel.lip,
              },
            ]}
          />
          <View style={[styles.legend, { gap: spec.gap, paddingHorizontal: round ? 0 : spec.pad }]}>
            {busy ? <ActivityLight color={palette.icon} /> : null}
            {led ? <Led on={led === "on"} palette={palette} /> : null}
            {round ? glyph : null}
            {!round && !trailing ? glyph : null}
            {!round ? (
              <RText
                variant="label"
                weight={labelWeight}
                color={palette.label}
                numberOfLines={2}
                style={[
                  styles.label,
                  { fontSize: spec.font },
                  palette.legendShadow ? { textShadowColor: palette.legendShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 } : null,
                ]}
              >
                {label}
              </RText>
            ) : null}
            {!round && trailing ? glyph : null}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** The Shift key: the one primary action per screen (violet, large, full width). */
export function ShiftKey({ icon = "check", ...props }: Omit<KeyProps, "tone" | "size" | "round">) {
  return <Key tone="shift" size="lg" icon={icon} {...props} />;
}

/** Radio LED: an unlit ring, or a lit dot with a soft glow (the selected key). */
function Led({ on, palette }: { on: boolean; palette: KeyPalette }) {
  return <View style={[styles.led, on ? styles.ledOn : { borderColor: palette.ledOff }]} />;
}

/** Busy: three lights breathing left to right while the key is held down (slow, low contrast). */
function ActivityLight({ color }: { color: string }) {
  return (
    <View style={styles.dots} aria-hidden>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} color={color} />
      ))}
    </View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const reduced = useReducedMotion();
  const level = useSharedValue(reduced ? 0.75 : 0.45);
  useEffect(() => {
    if (reduced) return;
    level.value = withDelay(
      index * 180,
      withRepeat(withSequence(withTiming(0.9, { duration: 324 }), withTiming(0.45, { duration: 756 })), -1, false),
    );
    return () => cancelAnimation(level);
  }, [index, level, reduced]);
  const motion = useAnimatedStyle(() => ({ opacity: level.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, motion]} />;
}

const styles = StyleSheet.create({
  fill: { alignSelf: "stretch" },
  wall: { position: "absolute", left: 0, right: 0, bottom: 0 },
  face: { overflow: "hidden", justifyContent: "center" },
  bevel: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1.5, pointerEvents: "none" },
  legend: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  label: { textAlign: "center", flexShrink: 1 },
  none: { pointerEvents: "none" },
  led: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  ledOn: {
    borderWidth: 0,
    backgroundColor: "#FFFFFF",
    ...(Platform.OS === "android" ? null : { boxShadow: "0px 0px 8px 1px rgba(255,255,255,0.9)" }),
  },
  dots: { flexDirection: "row", gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
