import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { deleteMyAccount } from "../lib/accountDeletion";
import { useRoundLang, useRoundUser } from "../lib/round/hooks";
import { clearRoundUser } from "../lib/round/queryCore";
import { clearLocalRoundDrafts } from "../lib/round/sender";
import { Status } from "../lib/theme";
import { RoundShell } from "../components/round/RoundShell";
import { RText } from "../components/round/RText";
import { ShiftKey } from "../components/round/Key";
import { GlassCard } from "../components/round/GlassCard";
import { Icon } from "../components/round/Icons";
import { Banner, Field, IconButton, RTextInput } from "../components/round/primitives";
import { showToast } from "../components/round/Toast";

/**
 * Delete the Passion Seed account from the SHIFT profile (existing edge function, E10 cleanup).
 * A root-level route on purpose: signing out on a /round/* route would make the root navigator
 * store it as a pending link and send the user to sign-in; here it simply returns to "/".
 */
export default function DeleteAccountScreen() {
  const { session, signOut } = useAuth();
  const { userId } = useRoundUser();
  const { t } = useRoundLang();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));

  const run = async () => {
    if (confirm.trim() !== "DELETE" || !userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount({ userId, accessToken: session?.access_token });
    } catch {
      setBusy(false);
      setError(t("ui.delete_account.failed"));
      return;
    }
    // E10: drop this account's SHIFT drafts, their media and cached round data, then sign out.
    await clearLocalRoundDrafts(userId, { allMedia: true }).catch(() => {});
    await clearRoundUser(queryClient, userId).catch(() => {});
    const message = t("ui.delete_account.done");
    await signOut().catch(() => {});
    router.replace("/");
    setTimeout(() => showToast(message), 600);
  };

  return (
    <RoundShell
      keyboard
      dock={
        <ShiftKey
          label={t("ui.delete_account.cta")}
          icon="trash"
          busy={busy}
          disabled={confirm.trim() !== "DELETE"}
          onPress={() => void run()}
        />
      }
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
      </View>
      <RText variant="display" accessibilityRole="header">
        {t("ui.delete_account.title")}
      </RText>
      <GlassCard style={styles.warn}>
        <View style={styles.warnIcon}>
          <Icon name="alert" size={20} color={Status.error} />
        </View>
        <RText variant="body" style={{ flex: 1 }}>
          {t("ui.delete_account.body")}
        </RText>
      </GlassCard>
      {error ? <Banner tone="error" text={error} /> : null}
      <Field label={t("delete.confirm")}>
        <RTextInput
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={t("delete.confirm")}
          placeholder="DELETE"
        />
      </Field>
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row" },
  warn: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  warnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Status.errorBg, alignItems: "center", justifyContent: "center" },
});
