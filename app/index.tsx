import { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as AppleAuthentication from "expo-apple-authentication";
import { FontAwesome } from "@expo/vector-icons";
import {
  isAppleAccountSetupError,
  isAuthCancellationError,
  useAuth,
} from "../lib/auth";
import AnimatedBackground from "../components/AnimatedBackground";
import { AppText } from "../components/AppText";

export default function LandingPage() {
  const { signInWithGoogle, signInWithApple, loading: authLoading } = useAuth();
  const [signingInProvider, setSigningInProvider] = useState<
    "google" | "apple" | null
  >(null);

  const handleSignIn = async (provider: "google" | "apple") => {
    if (signingInProvider !== null || authLoading) return;

    setSigningInProvider(provider);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
    } catch (e) {
      if (isAuthCancellationError(e)) {
        return;
      }

      if (provider === "apple" && isAppleAccountSetupError(e)) {
        Alert.alert(
          "Apple ID Required",
          "Please sign in to your Apple ID in iOS Settings before using Sign in with Apple.",
          [
            { text: "Close", style: "cancel" },
            {
              text: "Settings",
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ]
        );
        return;
      }

      console.error("Sign in error:", e);
    } finally {
      setSigningInProvider(null);
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
              style={[styles.logoImage, { width: 120, height: 120 }]}
            />
          </View>

          {/* Tagline */}
          <View style={styles.taglineContainer}>
            <AppText variant="bold" style={styles.tagline}>
              ค้นหาเส้นทางที่ใช่
            </AppText>
            <View style={styles.highlightWrapper}>
              <AppText variant="bold" style={styles.taglineHighlight}>
                ก่อนตัดสินใจจริง
              </AppText>
            </View>
          </View>

          {/* Description */}
          <AppText style={styles.description}>
            ทดลองอาชีพในฝัน เพียง 30 นาทีต่อวัน{"\n"}
            เพื่อค้นพบตัวตนที่แท้จริงของคุณ
          </AppText>

          {/* Sign In Button */}
          <Pressable
            style={({ pressed }) => [
              styles.signInBtn,
              pressed && styles.signInBtnPressed,
              (signingInProvider !== null || authLoading) && styles.signInBtnDisabled,
            ]}
            onPress={() => handleSignIn("google")}
            disabled={signingInProvider !== null || authLoading}
          >
            {signingInProvider === "google" || authLoading ? (
              <ActivityIndicator color="#111" />
            ) : (
              <View style={styles.btnContent}>
                <FontAwesome name="google" size={22} color="#4285F4" style={styles.googleIcon} />
                <AppText variant="bold" style={styles.signInText}>
                  เข้าสู่ระบบด้วย Google
                </AppText>
              </View>
            )}
          </Pressable>

          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={100}
              style={[
                styles.appleButton,
                (signingInProvider !== null || authLoading) && styles.signInBtnDisabled,
              ]}
              onPress={() => handleSignIn("apple")}
            />
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.appleBtnFallback,
                pressed && styles.appleBtnFallbackPressed,
                (signingInProvider !== null || authLoading) && styles.signInBtnDisabled,
              ]}
              onPress={() => handleSignIn("apple")}
              disabled={signingInProvider !== null || authLoading}
            >
              {signingInProvider === "apple" || authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText variant="bold" style={styles.appleBtnText}>
                  Sign in with Apple
                </AppText>
              )}
            </Pressable>
          )}

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem icon="🎯" text={`ภารกิจรายวัน\n30 นาที`} />
            <FeatureItem icon="📝" text={`สะท้อนความรู้สึก\nทุกวัน`} />
            <FeatureItem icon="🗺️" text={`แนวทางการ\nเรียนต่อ`} />
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
        <AppText style={styles.featureIcon}>{icon}</AppText>
      </View>
      <AppText style={styles.featureText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0a0514",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  glassCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(20, 10, 40, 0.5)",
    borderRadius: 40,
    padding: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    alignItems: "center",
    backdropFilter: "blur(24px)",
  } as any,
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  logoImage: {
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  } as any,
  taglineContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  tagline: {
    fontSize: 32,
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  highlightWrapper: {
    backgroundColor: "#BFFF00",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    transform: [{ rotate: "-1.5deg" }],
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  taglineHighlight: {
    fontSize: 24,
    color: "#0a0514",
    textAlign: "center",
  },
  description: {
    fontSize: 17,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 44,
  },
  signInBtn: {
    backgroundColor: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: "100%",
    alignItems: "center",
    marginBottom: 44,
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  appleButton: {
    width: "100%",
    height: 56,
    marginBottom: 44,
  },
  appleBtnFallback: {
    backgroundColor: "#111",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: "100%",
    alignItems: "center",
    marginBottom: 44,
  },
  appleBtnFallbackPressed: {
    backgroundColor: "#1f1f1f",
    transform: [{ scale: 0.98 }],
  },
  appleBtnText: {
    fontSize: 18,
    color: "#fff",
  },
  signInBtnPressed: {
    backgroundColor: "#f5f5f5",
    transform: [{ scale: 0.96 }],
  },
  signInBtnDisabled: {
    opacity: 0.5,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  googleIcon: {
    marginTop: 1,
  },
  signInText: {
    fontSize: 18,
    color: "#0a0514",
  },
  features: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 4,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  featureIcon: {
    fontSize: 26,
  },
  featureText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 15,
  },
});
