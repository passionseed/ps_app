import { Stack } from "expo-router";
import { useEffect } from "react";
import { logOnboardingStarted } from "../../lib/eventLogger";

export default function OnboardingLayout() {
  useEffect(() => {
    logOnboardingStarted().catch(() => {});
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
