import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../lib/auth";

export default function LandingPage() {
  const { signInWithGoogle, loading: authLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Sign in error:", e);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🌱</Text>
          <Text style={styles.logoText}>Passion Seed</Text>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Discover your path</Text>
          <Text style={styles.taglineHighlight}>before you commit</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Test career paths in 30 mins/day for 4-5 days.{"\n"}
          Find what truly excites you.
        </Text>

        {/* Sign In Button */}
        <Pressable
          style={({ pressed }) => [
            styles.signInBtn,
            pressed && styles.signInBtnPressed,
            (signingIn || authLoading) && styles.signInBtnDisabled,
          ]}
          onPress={handleSignIn}
          disabled={signingIn || authLoading}
        >
          {signingIn || authLoading ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.signInText}>Continue with Google</Text>
          )}
        </Pressable>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="🎯" text="30 min daily tasks" />
          <FeatureItem icon="📝" text="Daily reflections" />
          <FeatureItem icon="🗺️" text="University roadmap" />
        </View>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 36,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
    letterSpacing: 1,
  },
  taglineContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  tagline: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#111",
  },
  taglineHighlight: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    backgroundColor: "#BFFF00",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  description: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  signInBtn: {
    backgroundColor: "#BFFF00",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },
  signInBtnPressed: {
    backgroundColor: "#9FE800",
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  features: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    gap: 16,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
    textAlign: "center",
  },
});
