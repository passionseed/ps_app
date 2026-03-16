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
import type { Profile } from "../types/onboarding";

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
          backgroundColor: "#FDFFF5",
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
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BaiJamjuree_400Regular,
    BaiJamjuree_500Medium,
    BaiJamjuree_700Bold,
    Orbit_400Regular: require("../assets/Orbit_400Regular.ttf"),
  });
  const [isReady, setIsReady] = useState(false);

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
});
