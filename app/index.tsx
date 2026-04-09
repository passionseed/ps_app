import { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Platform,
  Alert,
  Linking,
  Animated as RNAnimated,
  Dimensions,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  isAppleAccountSetupError,
  isAuthCancellationError,
  useAuth,
} from "../lib/auth";
import { AppText } from "../components/AppText";
import { GlassButton, GlassCard } from "../components/Glass";
import {
  PageBg,
  Text as ThemeText,
  Accent,
  Shadow,
  Radius,
  Space,
} from "../lib/theme";

const { width, height } = Dimensions.get("window");

const COPY = {
  th: {
    tagline1: "ค้นหาเส้นทางที่ใช่",
    tagline2: "ก่อนตัดสินใจจริง",
    description:
      "ลองอาชีพในฝัน เพียง 30 นาทีต่อวัน\nเพื่อค้นพบตัวตนที่แท้จริงของคุณ",
    googleBtn: "เข้าสู่ระบบด้วย Google",
    appleBtn: "เข้าสู่ระบบด้วย Apple",
    guestBtn: "ข้าม",
    hackathonBtn: "HACKATHON LOGIN",
    footer: "ออกแบบสำหรับนักเรียนและผู้ที่กำลังค้นหาเส้นทางอาชีพ",
  },
  en: {
    tagline1: "Find Your Path",
    tagline2: "Before You Commit",
    description:
      "Try your dream career in just 30 min/day\nDiscover what truly drives you",
    googleBtn: "Continue with Google",
    appleBtn: "Sign in with Apple",
    guestBtn: "Explore without signing in",
    hackathonBtn: "HACKATHON LOGIN",
    footer: "Designed for students discovering their career path",
  },
} as const;

export default function LandingPage() {
  const {
    signInWithGoogle,
    signInWithApple,
    loading: authLoading,
    guestLanguage,
    setGuestLanguage,
    enterAsGuest,
  } = useAuth();
  const [signingInProvider, setSigningInProvider] = useState<
    "google" | "apple" | null
  >(null);
  const [isEntering, setIsEntering] = useState(false);
  const lang = guestLanguage;
  const c = COPY[lang];

  // Animation values
  const cardY = useState(new RNAnimated.Value(50))[0];
  const cardOpacity = useState(new RNAnimated.Value(0))[0];
  const backgroundY = useState(new RNAnimated.Value(0))[0];
  const hackathonScaleAnim = useState(new RNAnimated.Value(1))[0];
  const waterTransitionY = useState(new RNAnimated.Value(height))[0];

  // Entrance animation
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(cardY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      RNAnimated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle floating background animation
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(backgroundY, {
          toValue: -10,
          duration: 4000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(backgroundY, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, []);

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
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch {
                  Alert.alert("Unable to Open Settings", "Please open your device Settings app manually to manage permissions.");
                }
              },
            },
          ],
        );
        return;
      }

      console.error("Sign in error:", e);
    } finally {
      setSigningInProvider(null);
    }
  };

  const handleHackathonPressIn = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    RNAnimated.spring(hackathonScaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 400,
      friction: 5,
    }).start();
  };

  const handleHackathonPressOut = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    RNAnimated.spring(hackathonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 5,
    }).start();
  };

  const handleEnterAsGuest = useCallback(() => {
    if (isEntering) return;
    setIsEntering(true);

    // Simple fade transition
    RNAnimated.timing(cardOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      enterAsGuest();
      router.replace("/(tabs)/discover");
    });
  }, [isEntering, cardOpacity, enterAsGuest]);

  const cardAnimatedStyle = {
    transform: [{ translateY: cardY }],
    opacity: cardOpacity,
  };

  const backgroundAnimatedStyle = {
    transform: [{ translateY: backgroundY }],
  };

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />

      {/* Animated background with soft gradients */}
      <RNAnimated.View
        style={[styles.backgroundContainer, backgroundAnimatedStyle]}
      >
        <LinearGradient
          colors={["#F3F4F6", "#E5E7EB", "#F3F4F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </RNAnimated.View>

      <View style={styles.container}>
        <RNAnimated.View style={[styles.contentWrapper, cardAnimatedStyle]}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow}>
              <Image
                source={require("../assets/passionseed-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Main Card */}
          <GlassCard variant="master" size="large" style={styles.mainCard}>
            <View style={styles.cardTopSpacer} />

            {/* Language Selector */}
            <View style={styles.langSelector}>
              <Pressable
                onPress={() => {
                  void setGuestLanguage("th");
                }}
                style={[
                  styles.langPill,
                  lang === "th" && styles.langPillActive,
                ]}
              >
                <AppText
                  style={[
                    styles.langPillText,
                    lang === "th" && styles.langPillTextActive,
                  ]}
                >
                  TH
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  void setGuestLanguage("en");
                }}
                style={[
                  styles.langPill,
                  lang === "en" && styles.langPillActive,
                ]}
              >
                <AppText
                  style={[
                    styles.langPillText,
                    lang === "en" && styles.langPillTextActive,
                  ]}
                >
                  EN
                </AppText>
              </Pressable>
            </View>

            {/* Tagline */}
            <View style={styles.taglineContainer}>
              <AppText variant="bold" style={styles.tagline}>
                {c.tagline1}
              </AppText>
              <View style={styles.highlightWrapper}>
                <AppText variant="bold" style={styles.taglineHighlight}>
                  {c.tagline2}
                </AppText>
              </View>
            </View>

            {/* Description */}
            <AppText style={styles.description}>{c.description}</AppText>

            {/* Sign In Buttons */}
            <View style={styles.buttonsContainer}>
              <GlassButton
                onPress={() => handleSignIn("google")}
                variant="primary"
                size="large"
                fullWidth
                loading={signingInProvider === "google" || authLoading}
                disabled={signingInProvider !== null || authLoading}
                icon={<FontAwesome name="google" size={20} color="#111" />}
              >
                {c.googleBtn}
              </GlassButton>

              {Platform.OS === "ios" && (
                <GlassButton
                  onPress={() => handleSignIn("apple")}
                  variant="secondary"
                  size="large"
                  fullWidth
                  loading={signingInProvider === "apple"}
                  disabled={signingInProvider !== null || authLoading}
                  icon={<FontAwesome name="apple" size={22} color="#111" />}
                >
                  {c.appleBtn}
                </GlassButton>
              )}

              <GlassButton
                onPress={handleEnterAsGuest}
                variant="ghost"
                size="medium"
                fullWidth
                disabled={isEntering}
              >
                {c.guestBtn}
              </GlassButton>

              <View style={styles.hackathonDivider}>
                <AppText style={styles.hackathonDividerText}>or</AppText>
              </View>

              <RNAnimated.View style={{ transform: [{ scale: hackathonScaleAnim }], width: "100%" }}>
                <Pressable
                  onPress={() => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    
                    // Trigger water rising from bottom to top
                    RNAnimated.timing(waterTransitionY, {
                      toValue: 0,
                      duration: 500,
                      useNativeDriver: true,
                    }).start(() => {
                      router.push("/hackathon-login");
                      // Reset the overlay silently half a second after the new screen has pushed over it
                      setTimeout(() => waterTransitionY.setValue(height), 500);
                    });
                  }}
                  onPressIn={handleHackathonPressIn}
                  onPressOut={handleHackathonPressOut}
                  style={({ pressed }) => [styles.hackathonButton, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={["rgba(5, 8, 14, 0.95)", "rgba(0, 0, 0, 0.98)", "rgba(8, 12, 20, 0.9)"]}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  
                  {/* Bioluminescent Left Glow */}
                  <LinearGradient
                    colors={["rgba(145, 196, 227, 0.3)", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.hackathonGlowLeft}
                    pointerEvents="none"
                  />
                  
                  {/* Bioluminescent Bottom Glow */}
                  <View style={styles.hackathonGlowBottom} pointerEvents="none" />

                  {/* Bioluminescent Right Glow */}
                  <LinearGradient
                    colors={["rgba(165, 148, 186, 0.25)", "transparent"]}
                    start={{ x: 1, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.hackathonGlowRight}
                    pointerEvents="none"
                  />
                  
                  <Image
                    source={require("../assets/HackLogo.png")}
                    style={styles.hackathonBtnLogo}
                    resizeMode="contain"
                  />
                  <View style={styles.hackathonBtnTextWrapper}>
                    <AppText style={styles.hackathonBtnText}>{c.hackathonBtn}</AppText>
                  </View>
                  <AppText style={styles.hackathonBtnArrow}>→</AppText>
                </Pressable>
              </RNAnimated.View>
            </View>


          </GlassCard>
        </RNAnimated.View>
      </View>

      {/* Cinematic Water Transition Overlay */}
      <RNAnimated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateY: waterTransitionY }],
            zIndex: 999,
          },
        ]}
      >
        <LinearGradient
          colors={["#65ABFC", "rgba(18, 28, 41, 0.98)", "#000000"]}
          locations={[0, 0.1, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Adds a crest of light specifically at the "surface" line */}
        <LinearGradient
          colors={["rgba(145, 196, 227, 0.8)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ height: 20, width: "100%" }}
        />
      </RNAnimated.View>
    </View>
  );
}



const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  backgroundContainer: {
    position: "absolute",
    top: -100,
    left: -50,
    right: -50,
    bottom: -100,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Space["2xl"],
    paddingTop: Space["5xl"] + 96,
  },
  contentWrapper: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: -36,
    alignItems: "center",
    zIndex: 3,
    overflow: "visible",
  },
  logoGlow: {
    ...Shadow.floating,
    shadowColor: Accent.yellow,
    shadowOpacity: 0.3,
    borderRadius: 999,
    overflow: "visible",
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  mainCard: {
    width: "100%",
  },
  cardTopSpacer: {
    height: 12,
  },
  langSelector: {
    flexDirection: "row",
    alignSelf: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: 20,
  },
  langPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  langPillActive: {
    backgroundColor: Accent.yellow,
  },
  langPillText: {
    fontSize: 12,
    color: ThemeText.secondary,
    fontWeight: "700",
  },
  langPillTextActive: {
    color: "#111827",
  },
  taglineContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  tagline: {
    fontSize: 28,
    color: ThemeText.primary,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  highlightWrapper: {
    backgroundColor: Accent.yellow,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 8,
    transform: [{ rotate: "-1deg" }],
    ...Shadow.ctaGlow,
  },
  taglineHighlight: {
    fontSize: 22,
    color: "#111827",
    textAlign: "center",
    fontWeight: "700",
  },
  description: {
    fontSize: 16,
    color: ThemeText.secondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Space["3xl"],
  },
  buttonsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },
  hackathonDivider: {
    alignItems: "center",
    marginVertical: Space.xs,
  },
  hackathonDividerText: {
    fontSize: 12,
    color: ThemeText.muted,
  },
  hackathonButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(145, 196, 227, 0.65)", // increased contrast/brightness
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    gap: Space.md,
    shadowColor: "#91C4E3", // pure hack-cyan
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45, // much higher glow
    shadowRadius: 16,
    elevation: 8,
  },
  hackathonGlowLeft: {
    position: "absolute",
    left: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  hackathonGlowBottom: {
    position: "absolute",
    bottom: -30,
    alignSelf: "center",
    width: "90%",
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(101, 171, 252, 0.12)", // hack-blue
  },
  hackathonGlowRight: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  hackathonBtnLogo: {
    width: 50,
    height: 50,
  },
  hackathonBtnTextWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  hackathonBtnText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1, // better tracking for high impact
    textShadowColor: "rgba(145, 196, 227, 0.8)", // intense glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  hackathonBtnArrow: {
    fontSize: 20, // slightly larger
    color: "#65ABFC", // hack-blue
    textShadowColor: "rgba(101, 171, 252, 1)", // max glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
