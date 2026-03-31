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
import { router } from "expo-router";
import { AppText } from "../components/AppText";
import { GlassButton } from "../components/Glass/GlassButton";
import { useAuth } from "../lib/auth";
import {
  Accent,
  PageBg,
  Radius,
  Space,
  Text as ThemeText,
  Type,
} from "../lib/theme";

export default function HackathonLoginScreen() {
  const { signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;  // prevent double-submit
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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <AppText style={styles.backText}>‹ Back</AppText>
        </Pressable>

        <AppText variant="bold" style={styles.title}>
          Hackathon Login
        </AppText>
        <AppText style={styles.subtitle}>
          Sign in with your registered hackathon email and password.
        </AppText>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={ThemeText.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={ThemeText.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? (
          <AppText style={styles.errorText}>{error}</AppText>
        ) : null}

        <GlassButton
          variant="primary"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.loginButton}
        >
          Sign In
        </GlassButton>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  content: {
    flex: 1,
    padding: Space["2xl"],
    paddingTop: Space["4xl"],
    gap: Space.lg,
  },
  backRow: {
    marginBottom: Space.sm,
  },
  backText: {
    fontSize: 15,
    color: ThemeText.secondary,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: ThemeText.primary,
  },
  subtitle: {
    fontSize: Type.body.fontSize,
    lineHeight: 22,
    color: ThemeText.secondary,
  },
  form: {
    gap: Space.md,
    marginTop: Space.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",  // Border.default is transparent — use literal for visible input border
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
    backgroundColor: "#fff",
    fontFamily: "LibreFranklin_400Regular",
  },
  errorText: {
    color: Accent.red,
    fontSize: 14,
  },
  loginButton: {
    marginTop: Space.sm,
  },
});
