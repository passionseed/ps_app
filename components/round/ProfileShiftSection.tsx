import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Surface, Violet } from "../../lib/theme";
import { roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { roundLangKey, useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { handleProblem } from "../../lib/round/join";
import { readNudgePreference, setNudgePreference, setShiftLanguage } from "../../lib/round/push";
import { roundKeys } from "../../lib/round/queryCore";
import { Banner, Card, RTextInput, TextButton } from "./primitives";
import { ChipPicker } from "./ChipPicker";
import { RText } from "./RText";

/**
 * SHIFT section at the top of Profile (5.1): handle, language, certificates, evening nudge
 * toggle, delete SHIFT data, and "earlier tools" links to the legacy PathLab screens.
 */
export function ProfileShiftSection() {
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const bundle = home.data?.bundle ?? null;
  const entry = bundle?.entry ?? null;
  const [nudges, setNudges] = useState<boolean | null>(null);
  const [editing, setEditing] = useState(false);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) void readNudgePreference(userId).then(setNudges);
  }, [userId]);

  const changeLanguage = async (next: "th" | "en") => {
    if (!userId || next === lang) return;
    queryClient.setQueryData(roundLangKey(userId), next);
    const ok = await setShiftLanguage(userId, next);
    if (!ok) queryClient.setQueryData(roundLangKey(userId), lang);
  };

  const toggleNudges = async (value: boolean) => {
    setNudges(value);
    const ok = await setNudgePreference(userId, value);
    if (!ok) setNudges(!value);
  };

  const saveHandle = async () => {
    if (!entry) return;
    if (handleProblem(handle)) {
      setError(t("ui.join.handle_invalid"));
      return;
    }
    const result = await roundApi.setHandle(entry.id, handle.trim());
    if (!result.ok) {
      setError(errorCopy(lang, result.error, { field: t("join.handle.q") }));
      return;
    }
    setError(null);
    setEditing(false);
    await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
  };

  const certs = [
    ...(bundle?.certificate && !bundle.certificate.tombstone && bundle.round
      ? [{ key: bundle.certificate.public_id, label: t("round.tag", { n: bundle.round.number }), status: bundle.certificate.status, current: true, url: bundle.certificate.verify_url }]
      : []),
    ...(bundle?.past_certificates ?? [])
      .filter((c) => c.public_id !== bundle?.certificate?.public_id)
      .map((c) => ({ key: c.public_id, label: t("round.tag", { n: c.round_number }), status: c.status, current: false, url: c.verify_url })),
  ];

  return (
    <View style={styles.wrap}>
      <Card style={{ gap: 12 }}>
        {entry ? (
          <View style={{ gap: 6 }}>
            <RText variant="meta">{t("join.handle.q")}</RText>
            {editing ? (
              <>
                <RTextInput value={handle} onChangeText={setHandle} maxLength={24} accessibilityLabel={t("join.handle.q")} invalid={!!error} />
                {error ? <Banner tone="error" text={error} /> : null}
                <View style={styles.row}>
                  <TextButton label={t("ui.save")} onPress={() => void saveHandle()} />
                  <TextButton label={t("ui.cancel")} tone="ink" onPress={() => setEditing(false)} />
                </View>
              </>
            ) : (
              <View style={styles.row}>
                <RText variant="title" style={{ flex: 1 }}>
                  {entry.handle}
                </RText>
                {!bundle?.certificate ? (
                  <TextButton
                    label={t("ui.edit")}
                    icon="pencil"
                    onPress={() => {
                      setHandle(entry.handle);
                      setEditing(true);
                    }}
                  />
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <RText variant="meta">{t("profile.language")}</RText>
          <ChipPicker
            chips={[
              { value: "th", label: t("ui.language.th") },
              { value: "en", label: t("ui.language.en") },
            ]}
            value={lang}
            onChange={(v) => void changeLanguage(v as "th" | "en")}
          />
        </View>

        <View style={styles.switchRow}>
          <RText variant="body" style={{ flex: 1 }}>
            {t("profile.notifications.shift")}
          </RText>
          <Switch
            value={nudges ?? true}
            disabled={nudges === null}
            onValueChange={(v) => void toggleNudges(v)}
            trackColor={{ true: Violet[600], false: Surface.control }}
            accessibilityLabel={t("profile.notifications.shift")}
          />
        </View>
      </Card>

      <Card style={{ gap: 4 }}>
        <RText variant="label">{t("profile.certificates")}</RText>
        {certs.length === 0 ? <RText variant="meta">{t("ui.cert.none")}</RText> : null}
        {certs.map((c) => (
          <TextButton
            key={c.key}
            label={`${c.label} · ${c.status === "issued" ? t("ui.cert.valid") : t("ui.cert.revoked")}`}
            icon={c.current ? "chevron" : "link"}
            onPress={() => (c.current ? router.push("/round/certificate") : void Linking.openURL(c.url))}
          />
        ))}
      </Card>

      <Card style={{ gap: 4 }}>
        <RText variant="label">{t("profile.legacy")}</RText>
        <TextButton label={t("ui.legacy.discover")} icon="search" tone="ink" onPress={() => router.push("/(tabs)/discover")} />
        <TextButton label={t("ui.legacy.my_paths")} icon="book" tone="ink" onPress={() => router.push("/(tabs)/my-paths")} />
        <TextButton label={t("ui.legacy.radar")} icon="compass" tone="ink" onPress={() => router.push("/(tabs)/explore")} />
        <TextButton label={t("ui.legacy.plans")} icon="pencil" tone="ink" onPress={() => router.push("/plans")} />
      </Card>

      <TextButton label={t("profile.delete")} icon="trash" tone="danger" onPress={() => router.push("/round/delete-data")} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
});
