import React, { forwardRef, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../AppText";
import { useAuth } from "../../lib/auth";
import { shiftStorage } from "../../lib/shiftStorage";
import { Accent, PageBg, Radius, Text, CompanionSurface } from "../../lib/theme";
import {
  companionCopy,
  type CompanionCopy,
} from "../../lib/shiftCompanionCopy";
import type { CompanionLang } from "../../lib/shiftCompanion";

const languageListeners = new Set<(lang: CompanionLang) => void>();

export function useCompanionLang() {
  const { appLanguage } = useAuth();
  const [lang, setLangState] = useState<CompanionLang>(appLanguage === "en" ? "en" : "th");
  useEffect(() => {
    languageListeners.add(setLangState);
    let alive = true;
    shiftStorage.getItem("shift-companion-lang").then((value) => {
      if (alive && (value === "en" || value === "th")) setLangState(value);
    }).catch(() => {});
    return () => { alive = false; languageListeners.delete(setLangState); };
  }, []);
  const setLang = (next: CompanionLang) => {
    languageListeners.forEach(listener => listener(next));
    shiftStorage.setItem("shift-companion-lang", next).catch(() => {});
  };
  return { lang, setLang, copy: companionCopy(lang) };
}

export function CompanionScreen({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { paddingTop: Math.max(insets.top, 16), paddingBottom: footer ? 0 : Math.max(insets.bottom, 16) }]}>

      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.column}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function LangSwitch({
  lang,
  onChange,
}: {
  lang: CompanionLang;
  onChange: (lang: CompanionLang) => void;
}) {
  return (
    <View style={styles.langRow} accessibilityRole="tablist">
      {(["en", "th"] as const).map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected: lang === item }}
          onPress={() => onChange(item)}
          style={[styles.langChip, lang === item && styles.langChipOn]}
        >
          <AppText style={[styles.langText, lang === item && styles.langTextOn]}>
            {item === "en" ? "EN" : "TH"}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

export const CompanionField = forwardRef<
  TextInput,
  TextInputProps & { label: string; error?: string | null }
>(function CompanionField({ label, error, style, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        {...props}
        ref={ref}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        placeholderTextColor={Text.tertiary}
        accessibilityLabel={label}
        accessibilityHint={error || props.accessibilityHint}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          focused && styles.focused,
          error && styles.invalid,
          style,
          /[\u0E00-\u0E7F]/.test(String(props.value ?? "")) && styles.inputThai,
        ]}
      />
      {error ? (
        <AppText accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

export function CompanionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, focused && styles.focused, pressed && { backgroundColor: Accent.yellowDark }, disabled && styles.buttonDisabled]}
    >
      <AppText variant="bold" style={styles.buttonText}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TextAction({ label, onPress, accessibilityRole = "button", disabled = false }: { label: string; onPress: () => void; accessibilityRole?: "button" | "link"; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole={accessibilityRole} accessibilityState={{ disabled }} disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onPress={onPress} style={[styles.textAction, focused && styles.focused, disabled && styles.buttonDisabled]}>
      <AppText style={styles.textActionLabel}>{label}</AppText>
    </Pressable>
  );
}

export function CompanionSupport({ copy, title = copy.contactTeam }: { copy: CompanionCopy; title?: string }) {
  const [failed, setFailed] = useState(false);
  const open = async (url: string) => {
    setFailed(false);
    try {
      await Linking.openURL(url);
    } catch {
      setFailed(true);
    }
  };
  return (
    <View style={styles.support}>
      <AppText style={styles.supportTitle}>{title}</AppText>
      <TextAction accessibilityRole="link" label="Instagram · passion_seed.th" onPress={() => void open("https://www.instagram.com/passion_seed.th/")} />
      <TextAction accessibilityRole="link" label="LINE · @passionseed" onPress={() => void open("https://line.me/R/ti/p/%40passionseed")} />
      {failed ? <>
        <AppText accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{copy.supportOpenFailed}</AppText>
        <AppText selectable style={styles.supportTitle}>Instagram: passion_seed.th · LINE: @passionseed</AppText>
      </> : null}
    </View>
  );
}

export function companionMessage(copy: CompanionCopy, error: string, waitMinutes?: number): string {
  if (error === "empty") return copy.codeEmpty;
  if (error === "unavailable") return copy.codeInvalid;
  if (error === "rate_limit") {
    return `${copy.rateLimit} ${copy.wait} ${waitMinutes ?? 15} ${copy.minutes}.`;
  }
  if (error === "email_mismatch") return copy.emailMismatch;
  if (error === "verify_email") return copy.verifyFirst;
  if (error === "mobile") return copy.mobileInvalid;
  if (error === "tried") return copy.triedRequired;
  if (error === "link") return copy.linkInvalid;
  if (error === "length" || error === "tried_length" || error === "learned_length" || error === "help_length") {
    return copy.tooLong;
  }
  if (error === "after_deadline") return copy.windowClosed;
  if (error === "before_cohort") return copy.beforeCohort;
  if (error === "after_cohort") return copy.afterCohort;
  if (error === "image_type") return copy.photoType;
  if (error === "date_mismatch") return copy.oldDraftHelp;
  if (error === "verify_email" || error === "not_linked") return copy.authExpired;
  if (error === "image") return copy.photoFailed;
  if (error === "idempotency_mismatch") return copy.receiptMismatch;
  if (error === "image_size") return copy.photoTooBig;
  if (error === "network") return copy.network;
  return copy.network;
}

export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("network") || message.includes("fetch") || message.includes("offline");
}

const styles = StyleSheet.create({
  support: { gap: 4, marginTop: 16 },
  supportTitle: { color: Text.secondary, fontSize: 16, lineHeight: 24 },
  screen: { flex: 1, backgroundColor: PageBg.default },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  column: { width: "100%", maxWidth: 560, alignSelf: "center" },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: PageBg.default,
  },
  langRow: { flexDirection: "row", gap: 8, alignSelf: "flex-end" },
  langChip: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  langChipOn: { backgroundColor: CompanionSurface.field, borderRadius: Radius.full },
  langText: { color: Text.secondary, fontSize: 16 },
  langTextOn: { color: Text.primary },
  field: { gap: 8 },
  label: { color: Text.primary, fontSize: 16 },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: CompanionSurface.field,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Text.primary,
    borderWidth: 1,
    borderColor: CompanionSurface.line,
    fontWeight: "400",
    fontFamily: "LibreFranklin_400Regular",
  },
  multiline: { minHeight: 144, textAlignVertical: "top" },
  focused: { borderColor: Text.primary },
  invalid: { borderColor: Accent.errorStrong },
  inputThai: { fontFamily: "BaiJamjuree_400Regular" },
  error: { color: Accent.errorStrong, fontSize: 16 },
  button: {
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Accent.yellow,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Text.primary, fontSize: 16 },
  textAction: { minHeight: 48, justifyContent: "center", borderWidth: 1, borderColor: "transparent", borderRadius: Radius.sm, paddingHorizontal: 4 },
  textActionLabel: { color: Text.secondary, fontSize: 16 },
});

export function CompanionLoadState({ loading, error, onRetry }: { loading: boolean; error: unknown; onRetry: () => void }) {
  const { copy } = useCompanionLang();
  if (error) return <View style={{ gap: 12, marginTop: 24 }}>
    <AppText accessibilityRole="alert" style={{ color: Text.primary, fontSize: 16 }}>{copy.loadFailed}</AppText>
    <TextAction label={copy.retry} onPress={onRetry} />
  </View>;
  return loading ? <View style={{ gap: 12, marginTop: 24 }}>
    <ActivityIndicator color={Text.primary} />
    <AppText accessibilityLiveRegion="polite" style={{ color: Text.secondary, fontSize: 16 }}>{copy.loading}</AppText>
  </View> : null;
}
