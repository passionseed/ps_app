import React, { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useRoundLang } from "../lib/round/hooks";
import { setPendingLink } from "../lib/round/pendingLink";
import { RoundShell } from "../components/round/RoundShell";
import { IconButton } from "../components/round/primitives";
import { SignInPanel, signInOrbs, WelcomeHero } from "../components/round/SignInPanel";

/**
 * Sign in (Google, Apple, email) with `next` and `reason=expired` (E14). Drafts stay on the
 * device. Same orb hero as the signed-out welcome (DESIGN.md v4, depth-v4 middle phone).
 */
export default function SignInScreen() {
  const { next, reason } = useLocalSearchParams<{ next?: string; reason?: string }>();
  const { isGuest, exitGuestMode } = useAuth();
  const { t } = useRoundLang();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isGuest) exitGuestMode();
    if (next) void setPendingLink(queryClient, decodeURIComponent(next));
  }, [exitGuestMode, isGuest, next, queryClient]);

  return (
    <RoundShell keyboard customOrbs={signInOrbs(width)}>
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </View>
      <WelcomeHero />
      <SignInPanel notice={reason === "expired" ? t("signin.expired") : null} />
    </RoundShell>
  );
}

const styles = StyleSheet.create({ top: { flexDirection: "row", marginBottom: -36, zIndex: 1 } });
