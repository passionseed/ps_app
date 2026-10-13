import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ink, Violet } from "../../lib/theme";
import { roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { roundKeys } from "../../lib/round/queryCore";
import { LINK_PATTERN } from "../../lib/round/schema";
import type { PublicCounts } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { Banner, Card, Checkbox, Field, IconButton, RTextInput, TextButton } from "../../components/round/primitives";
import { ListSkeleton } from "../../components/round/Skeleton";

export default function SummaryScreen() {
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const bundle = home.data?.bundle ?? null;
  const entry = bundle?.entry ?? null;
  const latest = bundle?.summary?.latest ?? null;
  const publicRevision = bundle?.summary?.public_revision ?? null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [counts, setCounts] = useState<PublicCounts>({ people_talked_to: true, testers: true, missions: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));

  useEffect(() => {
    if (!latest) return;
    setTitle(latest.title);
    setDescription(latest.description);
    setDemoUrl(latest.demo_url ?? "");
    setCounts(latest.public_counts);
  }, [latest]);

  if (home.isPending) {
    return (
      <RoundShell>
        <ListSkeleton rows={3} />
      </RoundShell>
    );
  }
  if (!entry || !bundle) {
    return (
      <RoundShell>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Banner tone="warning" text={t("error.entry_not_found")} />
      </RoundShell>
    );
  }

  const statusLine = !latest
    ? { tone: "violet" as const, text: t("summary.off") }
    : latest.status === "pending" && publicRevision
      ? { tone: "violet" as const, text: t("summary.edit_pending") }
      : latest.status === "pending"
        ? { tone: "violet" as const, text: t("summary.pending") }
        : latest.status === "approved"
          ? { tone: "success" as const, text: t("summary.approved") }
          : latest.status === "rejected"
            ? { tone: "warning" as const, text: t("summary.rejected", { reason: latest.decision_reason ?? "" }) }
            : latest.status === "taken_down"
              ? { tone: "warning" as const, text: t("summary.taken_down", { reason: latest.decision_reason ?? "" }) }
              : { tone: "violet" as const, text: t("summary.off") };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (title.trim().length < 1 || title.trim().length > 80) next.title = t("error.missing_field", { field: t("summary.title") });
    if (description.trim().length < 1 || description.trim().length > 600) next.description = t("error.missing_field", { field: t("summary.description") });
    if (demoUrl.trim() && !LINK_PATTERN.test(demoUrl.trim())) next.demo_url = t("error.link_not_https");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result = await roundApi.submitSummary({
      entryId: entry.id,
      title: title.trim(),
      description: description.trim(),
      demoUrl: demoUrl.trim() || null,
      publicCounts: counts,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(errorCopy(lang, result.error, { field: result.error.field ?? "" }));
      return;
    }
    setMessage(null);
    await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
  };

  const togglePublic = async () => {
    setBusy(true);
    const result = await roundApi.setSummaryPublic(entry.id, !entry.summary_public);
    setBusy(false);
    if (!result.ok) setMessage(errorCopy(lang, result.error));
    await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
  };

  const people = bundle.missions?.people_talked_to ?? 0;
  const testers = bundle.missions?.missions.find((m) => m.key === "testers")?.parts[0]?.have ?? 0;

  return (
    <RoundShell keyboard dock={<PillowButton label={t("summary.submit")} icon="send" busy={busy} onPress={() => void submit()} />}>
      <IconButton icon="back" label={t("ui.back")} onPress={close} />
      <RText variant="display" accessibilityRole="header">
        {t("summary.cta")}
      </RText>
      <Banner tone={statusLine.tone} text={statusLine.text} />
      {message ? <Banner tone="error" text={message} /> : null}
      {publicRevision ? (
        <TextButton label={entry.summary_public ? t("summary.hide") : t("summary.show")} onPress={() => void togglePublic()} disabled={busy} />
      ) : null}

      <Field label={t("summary.title")} error={errors.title}>
        <RTextInput value={title} onChangeText={setTitle} maxLength={80} accessibilityLabel={t("summary.title")} invalid={!!errors.title} />
      </Field>
      <Field label={t("summary.description")} error={errors.description}>
        <RTextInput value={description} onChangeText={setDescription} multiline maxLength={600} accessibilityLabel={t("summary.description")} invalid={!!errors.description} />
      </Field>
      <Field label={t("summary.demo_url")} error={errors.demo_url}>
        <RTextInput value={demoUrl} onChangeText={setDemoUrl} autoCapitalize="none" keyboardType="url" placeholder="https://" accessibilityLabel={t("summary.demo_url")} invalid={!!errors.demo_url} />
      </Field>
      <Field label={t("summary.counts")}>
        <Checkbox checked={counts.people_talked_to} label={t("ui.summary.counts.people")} onChange={(v) => setCounts((c) => ({ ...c, people_talked_to: v }))} />
        <Checkbox checked={counts.testers} label={t("ui.summary.counts.testers")} onChange={(v) => setCounts((c) => ({ ...c, testers: v }))} />
        <Checkbox checked={counts.missions} label={t("ui.summary.counts.missions")} onChange={(v) => setCounts((c) => ({ ...c, missions: v }))} />
      </Field>

      <Card style={{ gap: 6 }}>
        <RText variant="meta">{t("ui.summary.preview")}</RText>
        <RText variant="h3">{title.trim() || t("summary.title")}</RText>
        <RText variant="body">{description.trim() || t("summary.description")}</RText>
        {demoUrl.trim() ? (
          <RText variant="small" color={Violet[700]}>
            {demoUrl.trim()}
          </RText>
        ) : null}
        <View style={styles.counts}>
          {counts.people_talked_to ? <RText variant="meta" color={Ink.secondary}>{`${t("ui.summary.counts.people")}: ${people}`}</RText> : null}
          {counts.testers ? <RText variant="meta" color={Ink.secondary}>{`${t("ui.summary.counts.testers")}: ${testers}`}</RText> : null}
          {counts.missions ? <RText variant="meta" color={Ink.secondary}>{`${t("ui.summary.counts.missions")}: 6`}</RText> : null}
        </View>
      </Card>
    </RoundShell>
  );
}

const styles = StyleSheet.create({ counts: { gap: 2 } });
