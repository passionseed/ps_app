import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { roundApi } from "../../lib/round/api";
import { errorCopy, type CopyKey } from "../../lib/round/copy";
import { useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { roundKeys } from "../../lib/round/queryCore";
import type { Checkpoint } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { Banner, Field, IconButton, RTextInput, TextButton } from "../../components/round/primitives";
import { ChipPicker } from "../../components/round/ChipPicker";

type Question = { key: string; kind: "scale" | "why" | "text"; label: CopyKey };

/** Answer keys per checkpoint (spec 3.2 table, A20/A40/DS6/T5). */
const CHECKIN_QUESTIONS: Record<Checkpoint, Question[]> = {
  join: [
    { key: "ownership", kind: "scale", label: "checkin.ownership" },
    { key: "why", kind: "why", label: "checkin.why_join" },
    { key: "confidence", kind: "scale", label: "checkin.confidence" },
  ],
  midpoint: [
    { key: "ownership", kind: "scale", label: "checkin.ownership" },
    { key: "squad", kind: "scale", label: "checkin.squad" },
    { key: "decided_myself", kind: "text", label: "checkin.decided_myself" },
  ],
  close: [
    { key: "ownership", kind: "scale", label: "checkin.ownership" },
    { key: "why", kind: "why", label: "checkin.why_keep" },
    { key: "confidence", kind: "scale", label: "checkin.confidence" },
    { key: "squad", kind: "scale", label: "checkin.squad" },
    { key: "satisfied", kind: "scale", label: "checkin.satisfied" },
    { key: "can_do_now", kind: "text", label: "checkin.can_do_now" },
  ],
};

const WHY = ["had_to", "portfolio", "wanted_to", "care_people"] as const;

export default function CheckinScreen() {
  const { checkpoint: raw } = useLocalSearchParams<{ checkpoint?: string }>();
  const checkpoint: Checkpoint = raw === "midpoint" || raw === "close" ? raw : "join";
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const entryId = home.data?.bundle.entry?.id ?? null;
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));

  const submit = async () => {
    if (!entryId) return;
    const clean: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (typeof v === "string" ? v.trim() : v) clean[k] = typeof v === "string" ? v.trim().slice(0, 500) : v;
    }
    if (!Object.keys(clean).length) return;
    setBusy(true);
    const result = await roundApi.submitCheckin(entryId, checkpoint, clean);
    setBusy(false);
    if (!result.ok && result.error.code !== "checkin_already_submitted") {
      setError(errorCopy(lang, result.error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
    close();
  };

  return (
    <RoundShell
      keyboard
      dock={<PillowButton label={t("checkin.submit")} icon="send" busy={busy} disabled={!Object.keys(answers).length} onPress={() => void submit()} />}
    >
      <View style={styles.top}>
        <IconButton icon="close" size={48} label={t("ui.close")} onPress={close} />
        <TextButton label={t("checkin.skip")} tone="ink" onPress={close} />
      </View>
      <RText variant="display" accessibilityRole="header">
        {t("ui.checkin.title")}
      </RText>
      <RText variant="meta">{t("checkin.optional")}</RText>
      {error ? <Banner tone="error" text={error} /> : null}
      {CHECKIN_QUESTIONS[checkpoint].map((q) => (
        <Field key={q.key} label={t(q.label)}>
          {q.kind === "scale" ? (
            <View style={{ gap: 4 }}>
              <ChipPicker
                chips={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
                value={answers[q.key] ? String(answers[q.key]) : null}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: Number(v) }))}
                accessibilityLabel={t(q.label)}
              />
              <View style={styles.scale}>
                <RText variant="meta">{`1 = ${t("ui.scale.low")}`}</RText>
                <RText variant="meta">{`5 = ${t("ui.scale.high")}`}</RText>
              </View>
            </View>
          ) : q.kind === "why" ? (
            <ChipPicker
              chips={WHY.map((w) => ({ value: w, label: t(`checkin.why.${w}` as CopyKey) }))}
              value={(answers[q.key] as string) ?? null}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
              accessibilityLabel={t(q.label)}
            />
          ) : (
            <RTextInput
              multiline
              maxLength={500}
              value={(answers[q.key] as string) ?? ""}
              onChangeText={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
              placeholder={t("ui.checkin.text_placeholder")}
              accessibilityLabel={t(q.label)}
            />
          )}
        </Field>
      ))}
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scale: { flexDirection: "row", justifyContent: "space-between" },
});
