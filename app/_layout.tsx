import { useEffect, useRef, useState } from "react";
import { AppState, Animated, StyleSheet, Text, View, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { AnimatedSplash } from "../components/AnimatedSplash";
import { shiftStorage } from "../lib/shiftStorage";
import { queryClient, queryKeys, staleTimes } from "../lib/queryClient";
import { decideRoute, isCompanionRoute } from "../lib/round/navigation";
import { useRoundBackground, useShiftMode } from "../lib/round/hooks";
import { clearPendingLink, setPendingLink, usePendingLink } from "../lib/round/pendingLink";
import { consumeExplicitSignOut } from "../lib/round/session";
import { roundDrafts } from "../lib/round/drafts";
import { clearRoundUser, roundKeys, wireQueryManagers } from "../lib/round/queryCore";
import { useRoundPushRouting } from "../lib/round/pushRouting";


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
  const { router, useSegments, usePathname, Stack } = require("expo-router") as typeof import("expo-router");
  const { useAuth } = require("../lib/auth") as typeof import("../lib/auth");
  const { getProfile } = require("../lib/onboarding") as typeof import("../lib/onboarding");
  const { logAppOpened } = require("../lib/eventLogger") as typeof import("../lib/eventLogger");

  const { session, loading, isGuest, isHackathon } = useAuth();
  const segments = useSegments() as readonly string[];
  const pathname = usePathname();
  const userId = !isGuest && !isHackathon ? session?.user.id ?? "" : "";
  const shift = useShiftMode();
  const pendingLink = usePendingLink();
  const root = segments[0];
  const needsEntry = !root || ["index", "welcome", "onboarding", "sign-in"].includes(root) || isCompanionRoute(segments);
  // Legacy onboarding is only needed for non-SHIFT users (5.2: SHIFT users never need it).
  const profileQuery = useQuery({
    queryKey: queryKeys.profile.detail(userId),
    queryFn: () => getProfile(userId),
    enabled: !!userId && needsEntry && !shift.shiftMode && !shift.pending,
    staleTime: staleTimes.userContent,
  });

  // E14: SIGNED_OUT without an explicit sign-out while drafts exist = expired session.
  const previousUser = useRef(userId);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (userId) {
      const last = previousUser.current;
      previousUser.current = userId;
      setExpired(false);
      // E10: a different account on this device clears the previous account's round data.
      void shiftStorage.getItem("round:last-user").then(async (lastUser) => {
        if (lastUser && lastUser !== userId) {
          await roundDrafts.clearUser(lastUser).catch(() => 0);
          await clearRoundUser(queryClient, lastUser);
        }
        await shiftStorage.setItem("round:last-user", userId).catch(() => {});
      });
      void last;
      return;
    }
    const was = previousUser.current;
    previousUser.current = "";
    if (!was) return;
    queryClient.removeQueries({ queryKey: roundKeys.user(was) });
    if (consumeExplicitSignOut()) return;
    void roundDrafts.list(was).then((drafts) => {
      if (drafts.length) setExpired(true);
    });
  }, [userId, loading]);

  const decision = decideRoute({
    loading: loading || (!!userId && pendingLink.isPending),
    isHackathon,
    isGuest,
    signedIn: !!session,
    sessionExpired: expired,
    segments,
    currentPath: pathname,
    pendingLink: pendingLink.data ?? null,
    tabEnabled: shift.tabEnabled,
    hasEntry: shift.hasEntry,
    shiftPending: shift.pending,
    onboarded: !userId || !needsEntry ? null : profileQuery.isPending ? null : !!profileQuery.data?.is_onboarded,
  });
  const redirectTo = decision.kind === "redirect" ? decision.to : null;

  useEffect(() => { logAppOpened().catch(() => {}); }, [userId, logAppOpened]);
  useEffect(() => {
    if (decision.kind !== "redirect") return;
    if (decision.storePendingLink) void setPendingLink(queryClient, decision.storePendingLink);
    if (decision.clearPendingLink) void clearPendingLink(queryClient);
    if (decision.to.startsWith("/sign-in")) setExpired(false);
    router.replace(decision.to as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo]);

  // Frozen-attempt replay + legacy reminder guard (5.7, E16) and push taps (5.8).
  useRoundBackground();
  useRoundPushRouting((path) => router.push(path as never));

  // Sync build todos to widget on foreground
  useEffect(() => {
    if (!session) return;
    const { syncBuildTodos } = require("../lib/build-todos") as typeof import("../lib/build-todos");
    syncBuildTodos(true);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncBuildTodos(true);
    });
    return () => sub.remove();
  }, [session]);

  // Show animated splash while auth or the entry decision is loading
  if (decision.kind === "splash") {
    return <AnimatedSplash />;
  }

  if (profileQuery.isError && needsEntry && userId && !shift.shiftMode) {
    return <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#F8F9FA", gap: 16 }}>
      <Text style={{ color: "#111827", fontSize: 16 }}>{"Couldn't connect. Try again when you're online."}</Text>
      <Pressable accessibilityRole="button" onPress={() => void profileQuery.refetch()} style={{ minHeight: 48, justifyContent: "center" }}><Text>Try again</Text></Pressable>
    </View>;
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
      <Stack.Screen name="sign-in" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="round/capture" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", gestureEnabled: false }} />
      <Stack.Screen name="round/join" options={{ presentation: "card" }} />
      <Stack.Screen name="round/log" options={{ presentation: "card" }} />
      <Stack.Screen name="round/mission/[key]" options={{ presentation: "card" }} />
      <Stack.Screen name="round/evidence/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="round/checkin" options={{ presentation: "modal" }} />
      <Stack.Screen name="round/certificate" options={{ presentation: "card" }} />
      <Stack.Screen name="round/summary" options={{ presentation: "card" }} />
      <Stack.Screen name="round/delete-data" options={{ presentation: "card" }} />
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
  const { ShiftProvider } = require("../lib/shift-context") as typeof import("../lib/shift-context");
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

  // E18: round queries refetch on foreground and reconnect.
  useEffect(() => {
    let network: Parameters<typeof wireQueryManagers>[1] = null;
    try {
      network = require("expo-network") as typeof import("expo-network");
    } catch {
      network = null;
    }
    return wireQueryManagers(AppState, network);
  }, []);

  const configError = getSupabaseConfigErrorMessage();

  useEffect(() => {
    if (!fontsLoaded || isReady) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // OPPO/Realme devices may throw SurfaceControl NPE here (Android framework bug)
        console.warn("[SplashScreen] hideAsync failed (known Android bug):", e);
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



  // Config error screen disabled - app will continue with fallback behavior
  // if (configError) {
  //   return <ConfigErrorScreen message={configError} />;
  // }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {!fontsLoaded || !isReady ? (
          <AnimatedSplash />
        ) : (
          <AuthProvider>
            <ShiftProvider>
              <View style={{ flex: 1 }}>
                <StatusBar style="light" translucent />
                <RootNavigator />
              </View>
            </ShiftProvider>
          </AuthProvider>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
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
