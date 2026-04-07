// app/hackathon-login.tsx
import { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Keyboard,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../components/AppText";
import { SkiaBackButton } from "../components/navigation/SkiaBackButton";
import { HackathonBackground } from "../components/Hackathon/HackathonBackground";
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

export default function HackathonLoginScreen() {
  const { signInWithEmailPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoHeight = new Animated.Value(226);
  const logoOpacity = new Animated.Value(1);
  const subtitleOpacity = new Animated.Value(1);
  const subtitleHeight = new Animated.Value(1);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => {
      Animated.parallel([
        Animated.timing(logoHeight, { toValue: 0, duration: 220, useNativeDriver: false }),
        Animated.timing(logoOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
        Animated.timing(subtitleOpacity, { toValue: 0, duration: 150, useNativeDriver: false }),
        Animated.timing(subtitleHeight, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start();
    });
    const hide = Keyboard.addListener("keyboardWillHide", () => {
      Animated.parallel([
        Animated.timing(logoHeight, { toValue: 226, duration: 220, useNativeDriver: false }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(subtitleHeight, { toValue: 1, duration: 220, useNativeDriver: false }),
      ]).start();
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

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
    <Pressable style={styles.root} onPress={Keyboard.dismiss} accessible={false}>
      {/* Ambient glow orbs and Skia creature SVGs */}
      <HackathonBackground />

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
            <Animated.View style={{ height: logoHeight, opacity: logoOpacity, overflow: "hidden", alignItems: "center" }}>
              <Image
                source={require("../assets/HackLogo.png")}
                style={{ width: 256, height: 226, marginBottom: 0, alignSelf: "center" }}
                contentFit="contain"
              />
            </Animated.View>
            <Animated.Text style={{
              fontFamily: "ReenieBeanie_400Regular",
              fontSize: 28,
              color: WHITE,
              textAlign: "center",
              lineHeight: 38,
              marginTop: -70,
              marginBottom: Space.lg,
              opacity: subtitleOpacity,
              transform: [{ scaleY: subtitleHeight }],
            }}>
              Preventive & Predictive Healthcare
            </Animated.Text>
            <AppText variant="bold" style={[styles.title, { textAlign: "left" }]}>
              Sign in
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Stars
  star: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: WHITE,
  },

  // Floating creatures
  creature: {
    position: "absolute",
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
    fontFamily: "BaiJamjuree_500Medium",
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: WHITE,
    textShadowColor: "rgba(145,196,227,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    fontFamily: "BaiJamjuree_700Bold",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: WHITE40,
    fontFamily: "BaiJamjuree_400Regular",
  },

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
    fontFamily: "BaiJamjuree_500Medium",
  },
  input: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_400Regular",
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
  loginButtonText: {
    color: WHITE,
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
  },

  footerNote: {
    fontSize: 11,
    color: WHITE25,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "BaiJamjuree_400Regular",
  },
  footerNoteAccent: {
    color: CYAN50_TEXT,
    fontFamily: "BaiJamjuree_500Medium",
  },
});

