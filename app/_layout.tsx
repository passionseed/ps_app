import { Stack, router } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import { getProfile } from "../lib/onboarding";
import type { Profile } from "../types/onboarding";

function RootNavigator() {
  const { session, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setProfile(null);
      router.replace("/");
      return;
    }

    getProfile(session.user.id).then((p) => {
      setProfile(p);
      if (!p || !p.is_onboarded) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/discover");
      }
    });
  }, [session, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="seed/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="path/[enrollmentId]" options={{ presentation: "card" }} />
      <Stack.Screen name="reflection/[enrollmentId]" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Orbit_400Regular: require("../assets/Orbit_400Regular.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
