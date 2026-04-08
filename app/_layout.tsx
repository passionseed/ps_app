import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import * as Sentry from "@sentry/react-native";
import { AnimatedSplash } from "../components/AnimatedSplash";
import { isAllowedOnboardedAppSegment } from "../lib/hackathonNavigation";

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

function RootNavigator() {
  const { router, useSegments, Stack } = require("expo-router") as typeof import("expo-router");
  const { useAuth } = require("../lib/auth") as typeof import("../lib/auth");
  const { getProfile } = require("../lib/onboarding") as typeof import("../lib/onboarding");
  const { logAppOpened } = require("../lib/eventLogger") as typeof import("../lib/eventLogger");

  const { session, loading, isGuest, isHackathon } = useAuth();
  const [profile, setProfile] = useState<
    import("../types/onboarding").Profile | null | undefined
  >(undefined);
  const [isNavReady, setIsNavReady] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    console.log("[RootNavigator] Effect running:", { loading, hasSession: !!session, isGuest, isHackathon, segments });
    if (loading) return;

    // Log app opened event
    logAppOpened().catch(() => {});

    // Helper to check if we are already in a valid section
    const isInHackathonArea = segments[0] === "(hackathon)" || segments[0] === "hackathon" || segments[0] === "hackathon-program";
    const isInTabs = segments[0] === "(tabs)";
    const isInAllowedOnboardedArea = isAllowedOnboardedAppSegment(segments[0]);
    const isInOnboarding = segments[0] === "onboarding";

    if (!session && !isGuest && !isHackathon) {
      // Not logged in - go to landing page
      console.log("[RootNavigator] Not logged in, checking if redirect needed");
      setProfile(null);
      if (isNavReady && segments.length > 0 && segments[0] !== "index" && segments[0] !== "hackathon-login") {
        router.replace("/");
      }
      setIsNavReady(true);
      return;
    }

    if (isHackathon) {
      console.log("[RootNavigator] Hackathon mode, checking if redirect needed");
      setProfile(null);
      if (!isInHackathonArea) {
        router.replace("/(hackathon)/home");
      }
      setIsNavReady(true);
      return;
    }

    if (isGuest) {
      // Guest user - go to discover
      console.log("[RootNavigator] Guest mode, checking if redirect needed");
      setProfile(null);
      if (!isInTabs) {
        router.replace("/(tabs)/discover");
      }
      setIsNavReady(true);
      return;
    }

    // Logged in user - check onboarding status
    if (profile !== undefined) {
      // We already have a profile state (or at least we are in the process)
      // If we are already in a valid area (tabs or onboarding), don't force redirect
      if (profile?.is_onboarded && isInAllowedOnboardedArea) {
        setIsNavReady(true);
        return;
      }
      if (!profile?.is_onboarded && isInOnboarding) {
        setIsNavReady(true);
        return;
      }
    }

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
      .then((p: any) => {
        if (cancelled) return;
        clearTimeout(profileTimeout);
        console.log("[RootNavigator] Profile fetched in", Date.now() - profileStart, "ms:", { hasProfile: !!p, isOnboarded: p?.is_onboarded });
        setProfile(p);
        if (!p || !p.is_onboarded) {
           if (!isInOnboarding) router.replace("/onboarding");
        } else {
           if (!isInAllowedOnboardedArea) router.replace("/(tabs)/discover");
        }
        setIsNavReady(true);
      })
      .catch((err: any) => {
        if (cancelled) return;
        clearTimeout(profileTimeout);
        console.error("[RootNavigator] ❌ getProfile threw after", Date.now() - profileStart, "ms:", err);
        // Proceed without profile — go to discover as fallback
        setProfile(null);
        if (!isInTabs) router.replace("/(tabs)/discover");
        setIsNavReady(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(profileTimeout);
    };
  }, [isGuest, isHackathon, loading, session, isNavReady]);

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
      <Stack.Screen name="hackathon-login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(hackathon)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="hackathon/challenges" options={{ presentation: "card" }} />
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
        name="pathlab-activity/[activityId]"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="reflection/[enrollmentId]"
        options={{ presentation: "card" }}
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
      <Stack.Screen name="google-auth" options={{ headerShown: false }} />
    </Stack>
  );
}

function RootLayout() {
  const { initializeSentry } = require("../lib/sentry") as typeof import("../lib/sentry");
  initializeSentry();

  const { StatusBar } = require("expo-status-bar") as typeof import("expo-status-bar");
  const { useFonts } = require("expo-font") as typeof import("expo-font");
  const {
    BaiJamjuree_400Regular,
    BaiJamjuree_500Medium,
    BaiJamjuree_700Bold,
  } = require("@expo-google-fonts/bai-jamjuree") as typeof import("@expo-google-fonts/bai-jamjuree");
  const {
    LibreFranklin_400Regular,
    LibreFranklin_700Bold,
  } = require("@expo-google-fonts/libre-franklin") as typeof import("@expo-google-fonts/libre-franklin");
  const {
    ReenieBeanie_400Regular,
  } = require("@expo-google-fonts/reenie-beanie") as typeof import("@expo-google-fonts/reenie-beanie");
  const SplashScreen = require("expo-splash-screen") as typeof import("expo-splash-screen");
  const { AuthProvider } = require("../lib/auth") as typeof import("../lib/auth");
  const {
    getSupabaseConfigErrorMessage,
  } = require("../lib/runtime-config") as typeof import("../lib/runtime-config");

  SplashScreen.setOptions({
    duration: 900,
    fade: true,
  });
  void SplashScreen.preventAutoHideAsync();

  const [fontsLoaded] = useFonts({
    BaiJamjuree_400Regular,
    BaiJamjuree_500Medium,
    BaiJamjuree_700Bold,
    LibreFranklin_400Regular,
    LibreFranklin_700Bold,
    ReenieBeanie_400Regular,
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

export default Sentry.wrap(RootLayout);


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
