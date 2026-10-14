import React, { useCallback, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { useRoundLang } from "../lib/round/hooks";
import { Canvas } from "../lib/theme";
import { RoundShell } from "../components/round/RoundShell";
import { TextButton } from "../components/round/primitives";
import { SignInPanel, signInOrbs, WelcomeHero } from "../components/round/SignInPanel";

/**
 * Signed-out welcome (DESIGN.md v4, depth-v4 middle phone): the glossy SHIFT orb with floating
 * glass chips, the headline, the Google Pillow, the dark Apple button on iOS and "use email
 * instead". "Look around first" opens Home as a guest (no account needed to read about SHIFT).
 */
export function LandingPage() {
  const { enterAsGuest } = useAuth();
  const { t } = useRoundLang();
  const { width } = useWindowDimensions();
  const [entering, setEntering] = useState(false);

  const guest = useCallback(() => {
    if (entering) return;
    setEntering(true);
    enterAsGuest();
    router.replace("/(tabs)/shift");
  }, [enterAsGuest, entering]);

  return (
    <RoundShell keyboard customOrbs={signInOrbs(width)}>
      <View style={styles.spacer} />
      <WelcomeHero />
      <SignInPanel />
      <View style={styles.guest}>
        <TextButton label={t("ui.welcome.guest")} tone="ink" icon="arrow" disabled={entering} onPress={guest} />
      </View>
    </RoundShell>
  );
}

export default function Entry() {
  const { session, loading } = useAuth();
  // RootNavigator (lib/round/navigation.ts decideRoute) routes an existing session.
  if (session || loading) return <View style={styles.blank} />;
  return <LandingPage />;
}

const styles = StyleSheet.create({
  spacer: { height: 8 },
  guest: { alignItems: "center", marginTop: -4 },
  blank: { flex: 1, backgroundColor: Canvas.mid },
});
