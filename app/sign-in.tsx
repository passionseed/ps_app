import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isAuthCancellationError, useAuth } from "../lib/auth";
import { useRoundLang } from "../lib/round/hooks";
import { setPendingLink } from "../lib/round/pendingLink";
import { RoundShell } from "../components/round/RoundShell";
import { RText } from "../components/round/RText";
import { PillowButton } from "../components/round/PillowButton";
import { Banner, Field, IconButton, RTextInput, TextButton } from "../components/round/primitives";

/** Sign in (Google, Apple, email) with `next` and `reason=expired` (E14). Drafts stay on the device. */
export default function SignInScreen() {
  const { next, reason } = useLocalSearchParams<{ next?: string; reason?: string }>();
  const { signInWithGoogle, signInWithApple, signInWithEmailPassword, isGuest, exitGuestMode } = useAuth();
  const { t } = useRoundLang();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "google" | "apple" | "email">(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    if (isGuest) exitGuestMode();
    if (next) void setPendingLink(queryClient, decodeURIComponent(next));
  }, [exitGuestMode, isGuest, next, queryClient]);

  const run = async (kind: "google" | "apple" | "email") => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "google") await signInWithGoogle();
      else if (kind === "apple") await signInWithApple();
      else await signInWithEmailPassword(email.trim(), password);
      // RootNavigator routes to the pending link or the Shift tab once the session arrives.
    } catch (e) {
      if (!isAuthCancellationError(e)) setError(t("ui.signin.failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <RoundShell
      keyboard
      dock={<PillowButton label={t("ui.signin.google")} icon="person" busy={busy === "google"} disabled={!!busy && busy !== "google"} onPress={() => void run("google")} />}
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </View>
      <RText variant="display" accessibilityRole="header">
        {t("signin.title")}
      </RText>
      {reason === "expired" ? <Banner tone="violet" text={t("signin.expired")} /> : null}
      {error ? <Banner tone="error" text={error} /> : null}
      {Platform.OS === "ios" ? (
        <TextButton label={t("ui.signin.apple")} icon="person" tone="ink" disabled={!!busy} onPress={() => void run("apple")} />
      ) : null}
      {showEmail ? (
        <View style={{ gap: 12 }}>
          <Field label={t("ui.signin.email")}>
            <RTextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel={t("ui.signin.email")} />
          </Field>
          <Field label={t("ui.signin.password")}>
            <RTextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" accessibilityLabel={t("ui.signin.password")} />
          </Field>
          <TextButton label={t("ui.signin.email_cta")} disabled={!!busy || !email.trim() || !password} onPress={() => void run("email")} />
        </View>
      ) : (
        <TextButton label={t("ui.signin.email_cta")} tone="ink" icon="send" onPress={() => setShowEmail(true)} />
      )}
      <RText variant="small">{t("signin.hackathon")}</RText>
    </RoundShell>
  );
}

const styles = StyleSheet.create({ top: { flexDirection: "row" } });
