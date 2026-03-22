import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  BaiJamjuree_400Regular,
  BaiJamjuree_500Medium,
  BaiJamjuree_700Bold,
} from "@expo-google-fonts/bai-jamjuree";
import { useFonts } from "expo-font";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import { getProfile } from "../lib/onboarding";
import { getSupabaseConfigErrorMessage } from "../lib/runtime-config";
import type { Profile } from "../types/onboarding";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://7b4ad4da49242478ad4aef96a6dd2a41@o4511084030328832.ingest.us.sentry.io/4511089087873024',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

SplashScreen.setOptions({
  duration: 900,
  fade: true,
});
void SplashScreen.preventAutoHideAsync();

function AppLaunchScreen() {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  const ringScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.18],
  });
  const ringOpacity = glowPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.25, 0.75, 0.35],
  });

  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      damping: 14,
      stiffness: 120,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    ).start();
  }, [logoScale, glowPulse]);

  return (
    <View style={styles.launchRoot}>
      <LinearGradient
        colors={["#0a0514", "#21114b", "#412a7d", "#14b8ff"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.launchRing,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <Animated.Image
        source={require("../assets/passionseed-logo.png")}
        style={[styles.launchLogo, { transform: [{ scale: logoScale }] }]}
        resizeMode="contain"
      />
      <View style={styles.launchFooter}>
        <ActivityIndicator size="large" color="#FDFFF5" />
      </View>
    </View>
  );
}

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.errorRoot}>
      <LinearGradient
        colors={["#fff8f1", "#ffe4e6", "#fee2e2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.errorCard}>
        <Animated.Image
          source={require("../assets/passionseed-logo.png")}
          style={styles.errorLogo}
          resizeMode="contain"
        />
        <View style={styles.errorCopy}>
          <Animated.Text style={styles.errorTitle}>
            App configuration error
          </Animated.Text>
          <Animated.Text style={styles.errorBody}>{message}</Animated.Text>
          <Animated.Text style={styles.errorHint}>
            Rebuild the production app with the required Expo public env vars.
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

function RootNavigator() {
  const { session, loading, isGuest } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;

    if (!session && !isGuest) {
      setProfile(null);
      router.replace("/");
      return;
    }

    if (isGuest) {
      setProfile(null);
      router.replace("/(tabs)/discover");
      return;
    }

    getProfile(session!.user.id).then((p) => {
      setProfile(p);
      if (!p || !p.is_onboarded) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/discover");
      }
    });
  }, [session, loading, isGuest]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 400,
        contentStyle: {
          backgroundColor: "#F3F4F6",
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="seed/[id]" options={{ presentation: "card" }} />
      <Stack.Screen
        name="path/[enrollmentId]"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="activity/[activityId]"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="reflection/[enrollmentId]"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="university/[key]"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="university/compare"
        options={{ presentation: "card" }}
      />
      <Stack.Screen name="settings" options={{ presentation: "card" }} />
      <Stack.Screen name="portfolio" options={{ presentation: "card" }} />
      <Stack.Screen name="fit" options={{ presentation: "card" }} />
      <Stack.Screen name="career/[name]" options={{ presentation: "card" }} />
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  const [fontsLoaded] = useFonts({
    BaiJamjuree_400Regular,
    BaiJamjuree_500Medium,
    BaiJamjuree_700Bold,
    Orbit_400Regular: require("../assets/Orbit_400Regular.ttf"),
  });
  const [isReady, setIsReady] = useState(false);
  const configError = getSupabaseConfigErrorMessage();

  useEffect(() => {
    if (!fontsLoaded || isReady) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        await SplashScreen.hideAsync();
      } finally {
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        }, 640);
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fontsLoaded, isReady]);

  if (!fontsLoaded || !isReady) {
    return <AppLaunchScreen />;
  }

  if (configError) {
    return <ConfigErrorScreen message={configError} />;
  }

  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="light" translucent />
        <RootNavigator />
      </View>
    </AuthProvider>
  );
});

const styles = StyleSheet.create({
  launchRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#0a0514",
  },
  launchRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: "rgba(191, 255, 0, 0.55)",
    backgroundColor: "rgba(191, 255, 0, 0.18)",
    shadowColor: "#bfff00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  launchLogo: {
    width: 150,
    height: 150,
    zIndex: 2,
  },
  launchFooter: {
    position: "absolute",
    bottom: 44,
  },
  errorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff8f1",
  },
  errorCard: {
    width: "100%",
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.16)",
    shadowColor: "#fb7185",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    gap: 18,
  },
  errorLogo: {
    width: 72,
    height: 72,
    alignSelf: "center",
  },
  errorCopy: {
    gap: 10,
  },
  errorTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Orbit_400Regular",
    color: "#111827",
    textAlign: "center",
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "BaiJamjuree_500Medium",
    color: "#991b1b",
    textAlign: "center",
  },
  errorHint: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "BaiJamjuree_400Regular",
    color: "#4b5563",
    textAlign: "center",
  },
});
