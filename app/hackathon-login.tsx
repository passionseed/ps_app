// app/hackathon-login.tsx
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../components/AppText";
import { SkiaBackButton } from "../components/navigation/SkiaBackButton";
import { useAuth } from "../lib/auth";
import { Space } from "../lib/theme";

// ── Bioluminescent Ocean tokens ──────────────────────────────
const BG          = "#03050a";
const CYAN        = "#91C4E3";
const BLUE        = "#65ABFC";
const PURPLE      = "#9D81AC";
const CARD_INPUT  = "rgba(26,37,48,0.75)";
const BORDER_MID  = "rgba(90,122,148,0.35)";
const WHITE       = "#FFFFFF";
const WHITE40     = "rgba(255,255,255,0.4)";
const WHITE25     = "rgba(255,255,255,0.25)";
const CYAN45      = "rgba(145,196,227,0.45)";
const CYAN55      = "rgba(145,196,227,0.55)";
const CYAN50_TEXT = "rgba(145,196,227,0.5)";

function JellyfishSvg() {
  return (
    <Svg width={64} height={80} viewBox="0 0 64 80">
      {/* Bell outer */}
      <Ellipse
        cx={32} cy={28} rx={22} ry={18}
        fill="rgba(145,196,227,0.07)"
        stroke="rgba(145,196,227,0.3)"
        strokeWidth={1}
      />
      {/* Bell inner */}
      <Ellipse
        cx={32} cy={26} rx={14} ry={11}
        fill="rgba(145,196,227,0.05)"
        stroke="rgba(145,196,227,0.15)"
        strokeWidth={0.8}
      />
      {/* Core glow */}
      <Ellipse cx={32} cy={24} rx={6} ry={5} fill="rgba(145,196,227,0.12)" />
      {/* Tentacles */}
      <Path d="M20 44 Q18 56 20 68" stroke="rgba(145,196,227,0.3)" strokeWidth={1} fill="none" />
      <Path d="M25 46 Q22 58 24 70" stroke="rgba(145,196,227,0.2)" strokeWidth={1} fill="none" />
      <Path d="M32 46 Q32 60 30 72" stroke="rgba(145,196,227,0.3)" strokeWidth={1} fill="none" />
      <Path d="M38 46 Q40 58 38 70" stroke="rgba(145,196,227,0.2)" strokeWidth={1} fill="none" />
      <Path d="M44 44 Q46 56 44 68" stroke="rgba(145,196,227,0.25)" strokeWidth={1} fill="none" />
    </Svg>
  );
}

export default function HackathonLoginScreen() {
  const { signInWithEmailPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Ambient glow orbs */}
      <View style={styles.glowCyan} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />
      <View style={styles.glowBlue} pointerEvents="none" />

      {/* Star particles */}
      <View style={[styles.star, { top: "18%", left: "15%", width: 2, height: 2, opacity: 0.4 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "30%", left: "80%", width: 1.5, height: 1.5, opacity: 0.3 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "55%", left: "88%", width: 2, height: 2, opacity: 0.25 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "70%", left: "8%", width: 1.5, height: 1.5, opacity: 0.3 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "85%", left: "55%", width: 2, height: 2, opacity: 0.2 }]} pointerEvents="none" />

      {/* Jellyfish */}
      <View style={[styles.jellyfish, { top: insets.top + 56 }]} pointerEvents="none">
        <JellyfishSvg />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.content, { paddingTop: insets.top + Space.lg }]}>
          {/* Back */}
          <View style={styles.backRow}>
            <SkiaBackButton
              variant="dark"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace("/");
              }}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <AppText style={styles.eyebrow}>Next Decade Hackathon</AppText>
            <AppText variant="bold" style={styles.title}>{"Sign in to\nyour journey"}</AppText>
            <AppText style={styles.subtitle}>
              Use your registered hackathon email and password.
            </AppText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <AppText style={styles.inputLabel}>Email</AppText>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.inputWrap}>
              <AppText style={styles.inputLabel}>Password</AppText>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          {/* CTA */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.loginButton,
              loading && styles.loginButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <AppText variant="bold" style={styles.loginButtonText}>
              {loading ? "Signing in..." : "Sign In →"}
            </AppText>
          </Pressable>

          {/* Footer */}
          <AppText style={styles.footerNote}>
            Forgot password?{" "}
            <Text style={styles.footerNoteAccent}>Contact your coordinator.</Text>
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Glow orbs
  glowCyan: {
    position: "absolute", top: -60, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: CYAN, opacity: 0.055,
  },
  glowPurple: {
    position: "absolute", bottom: 40, right: -40,
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: "#A594BA", opacity: 0.08,
  },
  glowBlue: {
    position: "absolute", top: "40%", left: "40%",
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: BLUE, opacity: 0.03,
  },

  // Stars
  star: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: WHITE,
  },

  // Jellyfish
  jellyfish: {
    position: "absolute",
    right: 18,
    opacity: 0.45,
  },

  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space["3xl"],
    gap: Space.xl,
  },
  backRow: { alignSelf: "flex-start" },

  header: { gap: Space.sm },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    color: CYAN45,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: WHITE,
    textShadowColor: "rgba(145,196,227,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  subtitle: { fontSize: 13, lineHeight: 20, color: WHITE40 },

  form: { gap: Space.md },
  inputWrap: {
    backgroundColor: CARD_INPUT,
    borderWidth: 1.5,
    borderColor: BORDER_MID,
    borderRadius: 14,
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm,
    paddingBottom: Space.md,
    gap: 4,
  },
  inputLabel: {
    fontSize: 9,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: CYAN55,
  },
  input: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "LibreFranklin_400Regular",
    paddingVertical: 4,
  },

  errorText: { color: "#F87171", fontSize: 13 },

  loginButton: {
    backgroundColor: PURPLE,
    borderRadius: 40,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#9D81AC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
  },
  loginButtonDisabled: { opacity: 0.5 },
  loginButtonText: { color: WHITE, fontSize: 15, letterSpacing: 0.3 },

  footerNote: {
    fontSize: 11,
    color: WHITE25,
    textAlign: "center",
    lineHeight: 18,
  },
  footerNoteAccent: { color: CYAN50_TEXT },
});
