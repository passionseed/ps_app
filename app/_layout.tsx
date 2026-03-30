import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AnimatedSplash } from "./components/AnimatedSplash";

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.errorRoot}>
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

export default function RootLayout() {
  const { initializeSentry } = require("../lib/sentry") as typeof import("../lib/sentry");
  initializeSentry();

  const { Stack, router } = require("expo-router") as typeof import("expo-router");
  const { StatusBar } = require("expo-status-bar") as typeof import("expo-status-bar");
  const { useFonts } = require("expo-font") as typeof import("expo-font");
  const {
    BaiJamjuree_400Regular,
    BaiJamjuree_500Medium,
    BaiJamjuree_700Bold,
  } = require("@expo-google-fonts/bai-jamjuree") as typeof import("@expo-google-fonts/bai-jamjuree");
  const SplashScreen = require("expo-splash-screen") as typeof import("expo-splash-screen");
  const { AuthProvider, useAuth } = require("../lib/auth") as typeof import("../lib/auth");
  const { getProfile } = require("../lib/onboarding") as typeof import("../lib/onboarding");
  const { logAppOpened } = require("../lib/eventLogger") as typeof import("../lib/eventLogger");
  const {
    getSupabaseConfigErrorMessage,
  } = require("../lib/runtime-config") as typeof import("../lib/runtime-config");

  SplashScreen.setOptions({
    duration: 900,
    fade: true,
  });
  void SplashScreen.preventAutoHideAsync();

  function RootNavigator() {
    const { session, loading, isGuest } = useAuth();
    const [profile, setProfile] = useState<
      import("../types/onboarding").Profile | null | undefined
    >(undefined);
    const [isNavReady, setIsNavReady] = useState(false);

    useEffect(() => {
      console.log("[RootNavigator] Effect running:", { loading, hasSession: !!session, isGuest });
      if (loading) return;

      // Log app opened event
      logAppOpened().catch(() => {});

      if (!session && !isGuest) {
        // Not logged in - show landing page
        console.log("[RootNavigator] Not logged in, staying on index");
        setProfile(null);
        setIsNavReady(true);
        return;
      }

      if (isGuest) {
        // Guest user - go to discover
        console.log("[RootNavigator] Guest mode, going to tabs");
        setProfile(null);
        router.replace("/(tabs)/discover");
        setIsNavReady(true);
        return;
      }

      // Logged in user - check onboarding status
      console.log("[RootNavigator] Logged in, fetching profile...", { userId: session!.user.id });
      const profileStart = Date.now();

      // Safety: cancelled flag prevents stale async updates if effect re-runs
      let cancelled = false;
      // Hard timeout: if getProfile hangs >10s, unblock navigation
      const profileTimeout = setTimeout(() => {
        if (cancelled) return;
        console.warn("[RootNavigator] ⚠️ getProfile timed out after 10s — possible RLS timeout or network hang");
        router.replace("/onboarding");
        setIsNavReady(true);
      }, 10000);

      getProfile(session!.user.id)
        .then((p) => {
          if (cancelled) return;
          clearTimeout(profileTimeout);
          console.log("[RootNavigator] Profile fetched in", Date.now() - profileStart, "ms:", { hasProfile: !!p, isOnboarded: p?.is_onboarded });
          setProfile(p);
          if (!p || !p.is_onboarded) {
            router.replace("/onboarding");
          } else {
            router.replace("/(tabs)/discover");
          }
          setIsNavReady(true);
        })
        .catch((err) => {
          if (cancelled) return;
          clearTimeout(profileTimeout);
          console.error("[RootNavigator] ❌ getProfile threw after", Date.now() - profileStart, "ms:", err);
          // Proceed without profile — go to discover as fallback
          setProfile(null);
          router.replace("/(tabs)/discover");
          setIsNavReady(true);
        });

      return () => {
        cancelled = true;
        clearTimeout(profileTimeout);
      };
    }, [isGuest, loading, session]);

    // Show animated splash while auth is loading
    // This prevents showing the landing page to logged-in users
    if (!isNavReady) {
      return <AnimatedSplash />;
    }

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
        <Stack.Screen
          name="portfolio/index"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="hackathon-program/index"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="hackathon-program/phase/[phaseId]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="hackathon-program/module/[moduleId]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="hackathon-program/reflection/[phaseId]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen name="fit/index" options={{ presentation: "card" }} />
        <Stack.Screen name="career/[name]" options={{ presentation: "card" }} />
        {/* Super Planner screens */}
        <Stack.Screen name="programs/index" options={{ presentation: "card" }} />
        <Stack.Screen name="programs/[programId]" options={{ presentation: "card" }} />
        <Stack.Screen name="saved/index" options={{ presentation: "card" }} />
        <Stack.Screen name="plans/index" options={{ presentation: "card" }} />
        <Stack.Screen name="plans/[planId]" options={{ presentation: "card" }} />
        <Stack.Screen name="plans/create" options={{ presentation: "card" }} />
      </Stack>
    );
  }

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
  }, [fontsLoaded, isReady, SplashScreen]);

  if (!fontsLoaded || !isReady) {
    return <AnimatedSplash />;
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
}


const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F3F4F6",
  },
  errorCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  errorLogo: {
    width: 84,
    height: 84,
    marginBottom: 20,
    alignSelf: "center",
  },
  errorCopy: {
    gap: 10,
  },
  errorTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  errorBody: {
    fontSize: 16,
    lineHeight: 22,
    color: "#4B5563",
    textAlign: "center",
  },
  errorHint: {
    fontSize: 14,
    lineHeight: 20,
    color: "#EF4444",
    textAlign: "center",
  },
});
