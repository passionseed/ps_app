import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  InteractionManager,
  Linking,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { isAppleAccountSetupError, isAuthCancellationError, useAuth } from "../../lib/auth";
import { useRoundLang } from "../../lib/round/hooks";
import { Depth, Ink, Orb } from "../../lib/theme";
import { PillowButton } from "./PillowButton";
import { Banner, Field, RTextInput, SoftButton, TextButton } from "./primitives";
import { GlassCard } from "./GlassCard";
import { RText } from "./RText";
import { ShiftOrb } from "./ShiftOrb";
import type { OrbSpec } from "./DepthCanvas";

// Native Apple button (reliable Sign in with Apple on device and iPad; App Review).
let AppleAuthentication: typeof import("expo-apple-authentication") | null = null;
if (Platform.OS === "ios") {
  try {
    AppleAuthentication = require("expo-apple-authentication");
  } catch {
    AppleAuthentication = null;
  }
}

/** Background orbs for the sign-in screens (depth-v4 middle phone), scaled from a 300pt phone. */
export function signInOrbs(width: number): OrbSpec[] {
  const k = Math.min(width, 520) / 300;
  return [
    { color: "#D9C9FF", cx: width - 30 * k, cy: 150 * k, r: 90 * k },
    { color: Orb.pink, cx: 20 * k, cy: 370 * k, r: 70 * k },
  ];
}

/** Orb hero, headline and subtitle shared by `/` and `/sign-in`. */
export function WelcomeHero() {
  const { t } = useRoundLang();
  const { width } = useWindowDimensions();
  const size = Math.round(Math.max(190, Math.min(268, width * 0.64)));
  return (
    <View style={styles.hero}>
      <ShiftOrb
        size={size}
        subtitle={t("landing.wordmark_sub", { days: 7 })}
        chips={[t("ui.welcome.chip.steps"), t("ui.welcome.chip.squad"), t("ui.welcome.chip.cert")]}
      />
      <View style={styles.heroText}>
        <RText variant="display" weight="700" style={styles.title} accessibilityRole="header">
          {t("ui.welcome.title")}
        </RText>
        <RText variant="body" style={styles.center}>
          {t("ui.welcome.body")}
        </RText>
      </View>
    </View>
  );
}

const waitForAlertDismissal = async () => {
  if (Platform.OS !== "ios") return;
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => setTimeout(resolve, 250));
  });
};

/**
 * Sign-in actions (DESIGN.md v4): the Google Pillow, the dark Apple button on iOS, "use email
 * instead" expanding the email form, and the hackathon note. The root navigator routes once the
 * session arrives.
 */
export function SignInPanel({ notice }: { notice?: string | null }) {
  const { signInWithGoogle, signInWithApple, signInWithPassword, loading: authLoading } = useAuth();
  const { t } = useRoundLang();
  const [busy, setBusy] = useState<null | "google" | "email">(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const appleInFlight = useRef(false);
  // Apple: show progress without a React re-render that could disturb the native sheet.
  const appleSpinner = useRef(new RNAnimated.Value(0)).current;

  const google = async () => {
    if (busy || appleInFlight.current || authLoading) return;
    setBusy("google");
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!isAuthCancellationError(e)) setError(t("ui.signin.failed"));
    } finally {
      setBusy(null);
    }
  };

  const apple = async () => {
    // Never gate Apple on authLoading: a stuck flag looks like a dead button to App Review.
    if (busy || appleInFlight.current) return;
    appleInFlight.current = true;
    appleSpinner.setValue(1);
    try {
      await signInWithApple();
    } catch (e) {
      if (isAuthCancellationError(e)) return;
      if (isAppleAccountSetupError(e)) {
        Alert.alert(t("ui.signin.apple"), t("ui.welcome.apple_unavailable"), [
          { text: t("ui.close"), style: "cancel" },
          {
            text: t("ui.profile.settings"),
            onPress: async () => {
              await waitForAlertDismissal();
              await Linking.openSettings().catch(() => {});
            },
          },
        ]);
        return;
      }
      setError(t("ui.signin.failed"));
    } finally {
      appleInFlight.current = false;
      appleSpinner.setValue(0);
    }
  };

  const emailSignIn = async () => {
    if (busy || !email.trim() || !password) return;
    setBusy("email");
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      setError(code === "invalid_credentials" ? t("ui.signin.invalid") : t("ui.signin.failed"));
    } finally {
      setBusy(null);
    }
  };

  const native =
    Platform.OS === "ios" &&
    AppleAuthentication?.AppleAuthenticationButton != null &&
    AppleAuthentication?.AppleAuthenticationButtonType != null &&
    AppleAuthentication?.AppleAuthenticationButtonStyle != null
      ? AppleAuthentication
      : null;

  return (
    <View style={styles.panel}>
      {notice ? <Banner tone="violet" text={notice} /> : null}
      {error ? <Banner tone="error" text={error} /> : null}
      <PillowButton
        label={t("ui.signin.google")}
        icon="google"
        busy={busy === "google"}
        disabled={!!busy && busy !== "google"}
        onPress={() => void google()}
      />
      {native ? (
        <View style={[styles.appleWrap, Depth.dark]}>
          <native.AppleAuthenticationButton
            buttonType={native.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={native.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={26}
            style={styles.appleNative}
            onPress={() => void apple()}
          />
          <RNAnimated.View style={[styles.appleSpinner, { opacity: appleSpinner }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </RNAnimated.View>
        </View>
      ) : Platform.OS === "ios" ? (
        <SoftButton tone="dark" icon="apple" label={t("ui.signin.apple")} disabled={!!busy} onPress={() => void apple()} />
      ) : null}

      <View style={styles.links}>
        <TextButton
          label={showEmail ? t("ui.welcome.hide_email") : t("ui.welcome.use_email")}
          icon={showEmail ? "chevronDown" : "mail"}
          tone="violet"
          onPress={() => setShowEmail((v) => !v)}
        />
      </View>
      {showEmail ? (
        <GlassCard style={styles.emailCard}>
          <Field label={t("ui.signin.email")}>
            <RTextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              accessibilityLabel={t("ui.signin.email")}
            />
          </Field>
          <Field label={t("ui.signin.password")}>
            <RTextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              accessibilityLabel={t("ui.signin.password")}
              returnKeyType="go"
              onSubmitEditing={() => void emailSignIn()}
            />
          </Field>
          <SoftButton
            label={t("ui.signin.email_cta")}
            icon="arrow"
            busy={busy === "email"}
            disabled={!email.trim() || !password || (!!busy && busy !== "email")}
            onPress={() => void emailSignIn()}
          />
        </GlassCard>
      ) : null}
      <RText variant="meta" color={Ink.tertiary} style={styles.note}>
        {t("signin.hackathon")}
      </RText>
      <View style={styles.links}>
        <TextButton label={t("ui.welcome.hackathon_login")} tone="ink" onPress={() => router.push("/hackathon-login")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 22, paddingTop: 8 },
  heroText: { alignItems: "center", gap: 6, paddingHorizontal: 8 },
  title: { fontSize: 28, lineHeight: 40, textAlign: "center" },
  center: { textAlign: "center" },
  panel: { gap: 12, marginTop: 18 },
  appleWrap: { height: 52, borderRadius: 26, backgroundColor: "#000000" },
  appleNative: { width: "100%", height: 52 },
  appleSpinner: { position: "absolute", top: 0, right: 18, bottom: 0, justifyContent: "center", pointerEvents: "none" },
  links: { alignItems: "center" },
  emailCard: { gap: 12 },
  note: { textAlign: "center", paddingHorizontal: 12 },
});
