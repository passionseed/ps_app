import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Gem, Glass, Ink, Radius, Status, Surface, Violet } from "../../lib/theme";
import { GlassCard } from "./GlassCard";
import { Icon, type IconName } from "./Icons";
import { RText } from "./RText";

/** Card (DESIGN.md v4): a glass card. Kept for existing screens; new code can use GlassCard. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <GlassCard padding={18} style={style}>
      {children}
    </GlassCard>
  );
}

/**
 * Tag: violet = glass pill (violet-700 on 72% white, bright rim, soft violet shadow); success,
 * warning and neutral keep their tinted fills so the colour still says the state (with a word).
 */
export function Tag({ label, tone = "violet" }: { label: string; tone?: "violet" | "success" | "warning" | "neutral" }) {
  const palette = {
    violet: { bg: Platform.OS === "android" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.72)", fg: Violet[700], border: Glass.border },
    success: { bg: Status.successBg, fg: Status.success, border: "#CFEBDD" },
    warning: { bg: Status.warningBg, fg: Status.warning, border: "#FBE1BC" },
    neutral: { bg: "rgba(255,255,255,0.6)", fg: Ink.secondary, border: Surface.line },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg, borderColor: palette.border }, tone === "violet" && Depth.pill]}>
      <RText variant="tag" color={palette.fg} latin={!/[฀-๿]/.test(label)} style={styles.tagText}>
        {label}
      </RText>
    </View>
  );
}

/** Secondary action: violet-700 text, 44pt target. Long labels wrap instead of overflowing. */
export function TextButton({
  label,
  onPress,
  icon,
  disabled,
  tone = "violet",
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  tone?: "violet" | "danger" | "ink";
  accessibilityHint?: string;
}) {
  const color = disabled ? Ink.tertiary : tone === "danger" ? Status.error : tone === "ink" ? Ink.primary : Violet[700];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.textButton, pressed && { opacity: 0.6 }]}
    >
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <RText variant="label" color={color} style={styles.textButtonLabel}>
        {label}
      </RText>
    </Pressable>
  );
}

/**
 * Icon button (DESIGN.md v4.1): navigation (back, close) is glass, not a key: it says where you
 * are, not what you do. A frosted circle with a bright rim, a 1pt contact shadow and a tight
 * pool; ink icon (violet is for acting). Dips 1pt when pressed. Icon actions (play, remove,
 * record) are round keys (`Key round`).
 */
export function IconButton({
  icon,
  label,
  onPress,
  size = 44,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: 44 | 48 | 56 | 72;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        !disabled && Depth.nav,
        pressed && styles.iconButtonPressed,
      ]}
    >
      <Icon name={icon} size={size >= 56 ? 28 : 20} color={disabled ? Ink.tertiary : Ink.primary} strokeWidth={2.1} />
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      {label ? <RText variant="label">{label}</RText> : null}
      {hint ? <RText variant="meta">{hint}</RText> : null}
      {children}
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert" size={16} color={Status.error} />
          <RText variant="small" color={Status.error} style={{ flex: 1 }}>
            {error}
          </RText>
        </View>
      ) : null}
    </View>
  );
}

/** Input (DESIGN.md v4): white, 1pt control border (3.4:1), 14pt radius, violet focus glow. */
export const RTextInput = React.forwardRef<TextInput, TextInputProps & { invalid?: boolean }>(function RTextInput(
  { invalid, style, multiline, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={Ink.tertiary}
      selectionColor={Violet[600]}
      cursorColor={Violet[600]}
      multiline={multiline}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        styles.input,
        multiline && styles.inputMulti,
        focused && styles.inputFocused,
        focused && Depth.focus,
        invalid && { borderColor: Status.error, borderWidth: 2 },
        style,
      ]}
      {...props}
    />
  );
});

export function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={styles.checkRow}
    >
      <View style={[styles.checkBox, checked && [styles.checkBoxOn, Depth.glow]]}>
        {checked ? (
          <>
            <LinearGradient colors={[...Gem.face]} style={[StyleSheet.absoluteFill, { borderRadius: 8 }]} />
            <Icon name="check" size={16} color="#FFFFFF" strokeWidth={2.8} />
          </>
        ) : null}
      </View>
      <RText variant="body" color={Ink.primary} style={{ flex: 1 }}>
        {label}
      </RText>
    </Pressable>
  );
}

/**
 * Banner (DESIGN.md v4): violet = glass with a violet icon; warning / error / success keep their
 * tinted fills (state colour plus an icon and words), with a soft shadow so they sit on the page.
 */
export function Banner({
  tone = "violet",
  text,
  actionLabel,
  onAction,
}: {
  tone?: "violet" | "warning" | "error" | "success";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const palette = {
    violet: { bg: Platform.OS === "android" ? Glass.fillAndroid : "rgba(255,255,255,0.72)", fg: Violet[700], text: Ink.primary, border: Glass.border },
    warning: { bg: Status.warningBg, fg: Status.warning, text: Status.warning, border: "#FBE1BC" },
    error: { bg: Status.errorBg, fg: Status.error, text: Status.error, border: "#F7D4D4" },
    success: { bg: Status.successBg, fg: Status.success, text: Status.success, border: "#CFEBDD" },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }, Depth.row]} accessibilityRole="alert">
      <Icon name={tone === "success" ? "check" : tone === "violet" ? "info" : "alert"} size={18} color={palette.fg} />
      <RText variant="small" color={palette.text} style={{ flex: 1, fontSize: 14 }}>
        {text}
      </RText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.bannerAction}>
          <RText variant="label" color={palette.fg} style={{ fontSize: 14, textDecorationLine: "underline" }}>
            {actionLabel}
          </RText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 5 },
  tagText: { fontSize: 12 },
  textButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, maxWidth: "100%" },
  textButtonLabel: { fontSize: 15, flexShrink: 1 },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Glass.border,
    backgroundColor: Platform.OS === "android" ? Glass.fillAndroid : Glass.fillStrong,
  },
  iconButtonPressed: { transform: [{ translateY: 1 }], backgroundColor: "#FFFFFF" },
  field: { gap: 6 },
  errorRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Surface.control,
    backgroundColor: Surface.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "BaiJamjuree_400Regular",
    color: Ink.primary,
  },
  // The violet border + glow is the focus indicator; drop the browser's default outline on web.
  inputFocused: {
    borderColor: Violet[600],
    borderWidth: 1.5,
    // Chrome ignores outline-width for its `auto` focus ring, so turn the style off on web.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  inputMulti: { minHeight: 104, textAlignVertical: "top" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, paddingVertical: 6 },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Surface.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Surface.card,
  },
  checkBoxOn: { borderWidth: 0, backgroundColor: Gem.face[1] },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md + 2,
    borderWidth: 1,
  },
  bannerAction: { minHeight: 44, justifyContent: "center" },
});
