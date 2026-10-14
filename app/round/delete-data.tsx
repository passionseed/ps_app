import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Status } from "../../lib/theme";
import { roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { roundDrafts } from "../../lib/round/drafts";
import { useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { deleteAllDraftMedia } from "../../lib/round/media";
import { clearRoundUser } from "../../lib/round/queryCore";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { GlassCard } from "../../components/round/GlassCard";
import { HeroCard } from "../../components/round/HeroCard";
import { GemIcon } from "../../components/round/GemIcon";
import { Icon } from "../../components/round/Icons";
import { Banner, Field, IconButton, RTextInput, Tag } from "../../components/round/primitives";

/** Delete SHIFT data with a preview of what goes (A21, E10). */
export default function DeleteDataScreen() {
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const bundle = home.data?.bundle ?? null;
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));

  const entries = bundle?.entry ? 1 : 0;
  const certs = (bundle?.past_certificates?.filter((c) => c.status === "issued").length ?? 0) + (bundle?.certificate?.status === "issued" ? 1 : 0);

  const run = async () => {
    if (confirm.trim() !== "DELETE" || !userId) return;
    setBusy(true);
    setError(null);
    const result = await roundApi.deleteMyData(null, "DELETE");
    if (!result.ok) {
      setBusy(false);
      setError(errorCopy(lang, result.error));
      return;
    }
    // E10: clear local drafts, media folders and every round query for this user.
    await roundDrafts.clearUser(userId).catch(() => 0);
    await deleteAllDraftMedia();
    await clearRoundUser(queryClient, userId);
    setBusy(false);
    setDone(true);
  };

  if (done) {
    return (
      <RoundShell dock={<PillowButton label={t("receipt.back")} icon="house" onPress={() => router.replace("/(tabs)/profile")} />}>
        <View style={styles.doneSpace} />
        <HeroCard>
          <View style={styles.done}>
            <GemIcon icon="check" size={56} />
            <RText variant="title" accessibilityRole="header">
              {t("delete.done")}
            </RText>
          </View>
        </HeroCard>
      </RoundShell>
    );
  }

  return (
    <RoundShell
      keyboard
      dock={<PillowButton label={t("ui.delete.cta")} icon="trash" busy={busy} disabled={confirm.trim() !== "DELETE"} onPress={() => void run()} />}
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
      </View>
      <RText variant="display" accessibilityRole="header">
        {t("delete.title")}
      </RText>
      <GlassCard style={styles.warn}>
        <View style={styles.warnIcon}>
          <Icon name="alert" size={20} color={Status.error} />
        </View>
        <View style={styles.warnText}>
          <RText variant="body">{t("delete.body")}</RText>
          {bundle ? <Tag label={t("ui.delete.preview", { entries, certs })} tone="warning" /> : null}
        </View>
      </GlassCard>
      {error ? <Banner tone="error" text={error} /> : null}
      <GlassCard>
        <Field label={t("delete.confirm")}>
          <RTextInput value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} accessibilityLabel={t("delete.confirm")} placeholder="DELETE" />
        </Field>
      </GlassCard>
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row" },
  warn: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  warnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Status.errorBg, alignItems: "center", justifyContent: "center" },
  warnText: { flex: 1, minWidth: 0, gap: 10 },
  done: { alignItems: "center", gap: 12, paddingVertical: 12 },
  doneSpace: { height: 40 },
});
