import React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ink, Radius, Status, Surface, Violet } from "../../lib/theme";
import { Icon, type IconName } from "./Icons";
import { RText } from "./RText";

/** White card, 24pt radius, one soft shadow, no border (DESIGN.md v3). */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Tag({ label, tone = "violet" }: { label: string; tone?: "violet" | "success" | "warning" | "neutral" }) {
  const palette = {
    violet: { bg: Violet[50], fg: Violet[700] },
    success: { bg: Status.successBg, fg: Status.success },
    warning: { bg: Status.warningBg, fg: Status.warning },
    neutral: { bg: Surface.line, fg: Ink.secondary },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg }]}>
      <RText variant="tag" color={palette.fg} latin={!/[฀-๿]/.test(label)}>
        {label}
      </RText>
    </View>
  );
}

/** Secondary action: violet-700 text, 44pt target. */
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
      <RText variant="label" color={color} style={{ fontSize: 15 }}>
        {label}
      </RText>
    </Pressable>
  );
}

/** 44pt icon button on violet-50 (48pt for dismiss/attachment/record). */
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
        pressed && { backgroundColor: Violet[100] },
      ]}
    >
      <Icon name={icon} size={size >= 56 ? 28 : 20} color={disabled ? Ink.tertiary : Violet[700]} />
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

export const RTextInput = React.forwardRef<TextInput, TextInputProps & { invalid?: boolean }>(function RTextInput(
  { invalid, style, multiline, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={Ink.tertiary}
      multiline={multiline}
      style={[
        styles.input,
        multiline && styles.inputMulti,
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
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <Icon name="check" size={16} color="#FFFFFF" strokeWidth={2.6} /> : null}
      </View>
      <RText variant="body" color={Ink.primary} style={{ flex: 1 }}>
        {label}
      </RText>
    </Pressable>
  );
}

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
    violet: { bg: Violet[50], fg: Violet[700] },
    warning: { bg: Status.warningBg, fg: Status.warning },
    error: { bg: Status.errorBg, fg: Status.error },
    success: { bg: Status.successBg, fg: Status.success },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]} accessibilityRole="alert">
      <Icon name={tone === "success" ? "check" : "alert"} size={18} color={palette.fg} />
      <RText variant="small" color={palette.fg} style={{ flex: 1, fontSize: 14 }}>
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
  card: {
    backgroundColor: Surface.card,
    borderRadius: 24,
    padding: 18,
    shadowColor: Ink.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  tag: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  textButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  iconButton: { backgroundColor: Violet[50], alignItems: "center", justifyContent: "center" },
  field: { gap: 6 },
  errorRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  input: {
    minHeight: 48,
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
  inputMulti: { minHeight: 96, textAlignVertical: "top" },
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
  checkBoxOn: { backgroundColor: Violet[600], borderColor: Violet[600] },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: Radius.md },
  bannerAction: { minHeight: 44, justifyContent: "center" },
});
