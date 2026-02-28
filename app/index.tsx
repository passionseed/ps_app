import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../lib/auth";
import AnimatedBackground from "../components/AnimatedBackground";

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
      <AnimatedBackground />
      <StatusBar style="light" />

      <View style={styles.container}>
        <View style={styles.glassCard}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/passionseed-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Tagline */}
          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>Discover your path</Text>
            <View style={styles.highlightWrapper}>
              <Text style={styles.taglineHighlight}>before you commit</Text>
            </View>
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
              <View style={styles.btnContent}>
                <Image
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
                  }}
                  style={styles.googleIcon}
                />
                <Text style={styles.signInText}>Continue with Google</Text>
              </View>
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
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0a0514", // Fallback color behind SVG gradient
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  glassCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(30, 15, 60, 0.4)",
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    alignItems: "center",
    backdropFilter: "blur(12px)", // Note: web only, RN uses external libs for true blur
  } as any,
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoImage: {
    width: 200,
    height: 60,
  },
  taglineContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  tagline: {
    fontSize: 26,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#fff",
    marginBottom: 4,
  },
  highlightWrapper: {
    backgroundColor: "#BFFF00",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ rotate: "-2deg" }],
  },
  taglineHighlight: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  description: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 36,
  },
  signInBtn: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100, // Very rounded
    width: "100%",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  signInBtnPressed: {
    backgroundColor: "#f0f0f0",
    transform: [{ scale: 0.98 }],
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  signInText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  features: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 16,
  },
});
