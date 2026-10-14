import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useRoundHome, useRoundLang, useRoundNow } from "../../lib/round/hooks";
import { currentDay } from "../../lib/round/schedule";
import { steps as stepsModel, stepsDone, type Step } from "../../lib/round/steps";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { Banner, IconButton, Tag } from "../../components/round/primitives";
import { ListSkeleton } from "../../components/round/Skeleton";
import { StepRow } from "../../components/round/StepRow";

/**
 * "9 ขั้นของ SHIFT" (scale spec 4.1, mockup C): the round's missions (they earn the certificate),
 * then the two habits counted automatically: days with a log, and mentor sessions.
 */
export default function StepsScreen() {
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const bundle = home.data?.bundle ?? null;
  const now = useRoundNow(bundle?.now, home.dataUpdatedAt, 60_000, home.data?.fromCache);
  const round = bundle?.round ?? null;
  const day = round ? currentDay(round, now) : null;
  const list = stepsModel(bundle?.missions, { lang, day });
  const missions = list.filter((s) => s.kind === "mission");
  const habits = list.filter((s) => s.kind !== "mission");
  const canLog = !!bundle?.entry && !!round && round.phase !== "finished" && round.phase !== "review";
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));

  const open = (step: Step) => {
    if (step.kind === "mission" && step.missionKey) return () => router.push(`/round/mission/${step.missionKey}`);
    if (step.kind === "daily" && canLog) return () => router.push({ pathname: "/round/capture", params: { type: "daily" } });
    return undefined;
  };

  return (
    <RoundShell refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Tag label={t("steps.count", { done: stepsDone(list), total: list.length })} />
      </View>
      <RText variant="display" accessibilityRole="header" style={styles.title}>
        {t("steps.title", { total: list.length })}
      </RText>
      {home.isPending ? <ListSkeleton rows={5} /> : null}
      {home.data?.fromCache ? <Banner tone="violet" text={t("home.offline")} /> : null}
      <RText variant="meta" weight="700" style={styles.divider}>
        {t("steps.missions", { n: missions.length })}
      </RText>
      <View style={styles.list}>
        {missions.map((s) => (
          <StepRow key={s.n} n={s.n} title={s.title} state={s.state} trailing={s.trailing} onPress={open(s)} />
        ))}
      </View>
      <RText variant="meta" weight="700" style={styles.divider}>
        {t("steps.habits")}
      </RText>
      <View style={styles.list}>
        {habits.map((s) => (
          <StepRow key={s.n} n={s.n} title={s.title} state={s.state} trailing={s.trailing} onPress={open(s)} />
        ))}
      </View>
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, lineHeight: 34 },
  divider: { marginTop: 4, marginHorizontal: 4 },
  list: { gap: 8 },
});
