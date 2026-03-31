// app/hackathon-login.tsx
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { AppText } from "../components/AppText";
import { useAuth } from "../lib/auth";
import { Radius, Space } from "../lib/theme";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE45 = "rgba(255,255,255,0.45)";

export default function HackathonLoginScreen() {
  const { signInWithEmailPassword } = useAuth();
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
      {/* Background glows */}
      <View style={styles.glowTopLeft} pointerEvents="none" />
      <View style={styles.glowBottomRight} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Pressable
            onPress={() => router.replace("/")}
            style={styles.backRow}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <AppText style={styles.backText}>‹ Back</AppText>
          </Pressable>

          <View style={styles.header}>
            <AppText variant="bold" style={styles.eyebrow}>HACKATHON</AppText>
            <AppText variant="bold" style={styles.title}>
              Sign in
            </AppText>
            <AppText style={styles.subtitle}>
              Use your registered hackathon email and password.
            </AppText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <LinearGradient colors={["#01040A", "#030B17"]} style={StyleSheet.absoluteFill} />
              <AppText style={styles.inputLabel}>EMAIL</AppText>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={WHITE45}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputWrap}>
              <LinearGradient colors={["#01040A", "#030B17"]} style={StyleSheet.absoluteFill} />
              <AppText style={styles.inputLabel}>PASSWORD</AppText>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={WHITE45}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {error ? (
            <AppText style={styles.errorText}>{error}</AppText>
          ) : null}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [styles.loginButton, loading && styles.loginButtonDisabled, pressed && { opacity: 0.85 }]}
          >
            <AppText variant="bold" style={styles.loginButtonText}>
              {loading ? "Signing in..." : "Sign In →"}
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  glowTopLeft: {
    position: "absolute",
    left: -60,
    top: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(0,240,255,0.07)",
  },
  glowBottomRight: {
    position: "absolute",
    right: -60,
    bottom: 80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(123,44,191,0.1)",
  },
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    padding: Space["2xl"],
    paddingTop: Space["4xl"],
    gap: Space.xl,
  },
  backRow: {
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 15,
    color: CYAN,
  },
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: {
    fontSize: 32,
    lineHeight: 38,
    color: WHITE,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: WHITE75,
  },
  form: {
    gap: Space.md,
  },
  inputWrap: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm,
    paddingBottom: Space.md,
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  input: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "LibreFranklin_400Regular",
    paddingVertical: 4,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
  },
  loginButton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    paddingVertical: Space.md,
    alignItems: "center",
  },
  loginButtonDisabled: { opacity: 0.5 },
  loginButtonText: { color: CYAN, fontSize: 16, letterSpacing: 0.5 },
});
