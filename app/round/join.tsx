import React, { useMemo, useRef, useState } from "react";
import { Share, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ink } from "../../lib/theme";
import { roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { roundKeys } from "../../lib/round/queryCore";
import { MONTH_NAMES } from "../../lib/round/time";
import { guardianRequired, handleProblem, normalizeBirthYear } from "../../lib/round/join";
import type { Track } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { Banner, Checkbox, Field, IconButton, RTextInput, Tag, TextButton } from "../../components/round/primitives";
import { ChipPicker } from "../../components/round/ChipPicker";
import { GlassCard } from "../../components/round/GlassCard";
import { GlowProgress } from "../../components/round/GlowProgress";
import { HeroCard } from "../../components/round/HeroCard";
import { GemIcon } from "../../components/round/GemIcon";

export default function JoinScreen() {
  const { r } = useLocalSearchParams<{ r?: string }>();
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const bundle = home.data?.bundle;
  const joinable = bundle?.joinable.find((j) => j.round_id === r) ?? bundle?.joinable[0] ?? null;
  const roundId = r ?? joinable?.round_id ?? null;
  const roundName = joinable ? t("round.tag", { n: joinable.number }) : "SHIFT";

  const [step, setStep] = useState(1);
  const [track, setTrack] = useState<Track | null>("high_school");
  const [month, setMonth] = useState<number | null>(null);
  const [yearText, setYearText] = useState("");
  const [consent, setConsent] = useState(false);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const yearRef = useRef<TextInput>(null);
  const handleRef = useRef<TextInput>(null);

  const year = normalizeBirthYear(yearText);
  const needsGuardian = month && year ? guardianRequired(month, year) : false;
  const monthChips = useMemo(
    () => MONTH_NAMES[lang].map((label, i) => ({ value: String(i + 1), label })),
    [lang],
  );

  const next = async () => {
    setError(null);
    if (step === 1) {
      if (!track) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!month || !year) {
        setError(t("error.invalid_field", { field: t("join.birth.q") }));
        yearRef.current?.focus();
        return;
      }
      if (needsGuardian && !consent) {
        setError(t("error.guardian_consent_required"));
        return;
      }
      setStep(3);
      setTimeout(() => handleRef.current?.focus(), 100);
      return;
    }
    if (handleProblem(handle)) {
      setError(t("ui.join.handle_invalid"));
      handleRef.current?.focus();
      return;
    }
    if (!roundId || !track || !month || !year) return;
    setBusy(true);
    const result = await roundApi.join({
      roundId,
      track,
      birthMonth: month,
      birthYear: year,
      guardianConsent: needsGuardian ? consent : false,
      handle: handle.trim(),
    });
    setBusy(false);
    if (result.ok) {
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
      return;
    }
    const e = result.error;
    if (e.code === "guardian_consent_required" || (e.code === "invalid_field" && e.field?.startsWith("birth"))) setStep(2);
    if (e.code === "invalid_field" && e.field === "handle") setStep(3);
    if (e.code === "track_not_open") setStep(1);
    setError(
      errorCopy(lang, e, {
        field: e.field === "handle" ? t("join.handle.q") : e.field ? t("join.birth.q") : "",
        day: bundle?.round?.join_cutoff_day ?? 2,
        n: bundle?.round?.number ?? "",
      }),
    );
  };

  const back = () => {
    if (step > 1 && !done) setStep(step - 1);
    else if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/shift");
  };

  if (done) {
    return (
      <RoundShell dock={<PillowButton label={t("receipt.back")} icon="house" onPress={() => router.replace("/(tabs)/shift")} />}>
        <View style={styles.doneSpace} />
        <HeroCard watermark={joinable ? String(joinable.number) : undefined}>
          <View style={styles.done}>
            <GemIcon icon="check" size={60} />
            <Tag label={roundName} tone="success" />
            <RText variant="display" weight="700" style={styles.center} accessibilityRole="header">
              {t("join.done")}
            </RText>
            <RText variant="body" style={styles.center}>
              {t("squad.waiting")}
            </RText>
          </View>
        </HeroCard>
      </RoundShell>
    );
  }

  return (
    <RoundShell
      keyboard
      dock={<PillowButton label={step === 3 ? t("home.open.cta") : t("join.next")} icon={step === 3 ? "check" : "arrow"} busy={busy} onPress={() => void next()} />}
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={back} />
        <Tag label={roundName} />
      </View>
      <View style={styles.progress}>
        <RText variant="meta" color={Ink.secondary}>
          {t("ui.join.step", { n: step })}
        </RText>
        <GlowProgress value={step / 3} accessibilityLabel={t("ui.join.step", { n: step })} />
      </View>
      {!roundId ? <Banner tone="warning" text={t("error.round_not_found")} /> : null}
      {error ? <Banner tone="error" text={error} /> : null}

      {step === 1 ? (
        <>
          <RText variant="display" accessibilityRole="header">
            {t("join.track.q")}
          </RText>
          <ChipPicker
            chips={[
              { value: "high_school", label: t("join.track.high_school") },
              { value: "university", label: t("join.track.university") },
            ]}
            value={track}
            onChange={(v) => setTrack(v as Track)}
            accessibilityLabel={t("join.track.q")}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <RText variant="display" accessibilityRole="header">
            {t("join.birth.q")}
          </RText>
          <RText variant="body">{t("join.birth.why")}</RText>
          <GlassCard style={styles.form}>
            <Field label={t("ui.join.month")}>
              <ChipPicker chips={monthChips} value={month ? String(month) : null} onChange={(v) => setMonth(Number(v))} accessibilityLabel={t("ui.join.month")} />
            </Field>
            <Field label={t("ui.join.year")}>
              <RTextInput
                ref={yearRef}
                value={yearText}
                onChangeText={(v) => setYearText(v.replace(/[^0-9]/g, "").slice(0, 4))}
                keyboardType="number-pad"
                placeholder="2009"
                accessibilityLabel={t("ui.join.year")}
              />
            </Field>
          </GlassCard>
          {needsGuardian ? (
            <HeroCard style={styles.guardian}>
              <View style={styles.guardianHead}>
                <GemIcon icon="shield" size={36} />
                <RText variant="h3" style={{ flex: 1 }}>
                  {t("join.guardian.title")}
                </RText>
              </View>
              <RText variant="body">{t("join.guardian.body")}</RText>
              <TextButton
                label={t("join.guardian.share")}
                icon="share"
                onPress={() =>
                  void Share.share({
                    message: t("ui.join.guardian_message", {
                      days: joinable?.duration_days ?? 7,
                      url: `${bundle?.flags.web_base_url ?? "https://www.passionseed.org"}/shift`,
                    }),
                  })
                }
              />
              <Checkbox checked={consent} label={t("join.guardian.check")} onChange={setConsent} />
            </HeroCard>
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <RText variant="display" accessibilityRole="header">
            {t("join.handle.q")}
          </RText>
          <GlassCard>
            <Field hint={t("join.handle.hint")}>
              <RTextInput
                ref={handleRef}
                value={handle}
                onChangeText={setHandle}
                maxLength={24}
                autoCorrect={false}
                accessibilityLabel={t("join.handle.q")}
                invalid={!!error}
                returnKeyType="done"
                onSubmitEditing={() => void next()}
              />
            </Field>
          </GlassCard>
        </>
      ) : null}
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progress: { gap: 8 },
  form: { gap: 16 },
  guardian: { gap: 10 },
  guardianHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  done: { alignItems: "center", gap: 12, paddingVertical: 10 },
  doneSpace: { height: 40 },
  center: { textAlign: "center" },
});
