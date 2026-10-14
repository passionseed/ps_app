import React from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ink } from "../../../lib/theme";
import { useRoundHome, useRoundLang, useRoundNow } from "../../../lib/round/hooks";
import { planDay } from "../../../lib/round/plan";
import { currentDay, isSessionDay, roundDayDate } from "../../../lib/round/schedule";
import { dayChips, steps as stepsModel } from "../../../lib/round/steps";
import { formatDate, formatWeekday } from "../../../lib/round/time";
import { RoundShell } from "../../../components/round/RoundShell";
import { RText } from "../../../components/round/RText";
import { Banner, IconButton, Tag } from "../../../components/round/primitives";
import { ListSkeleton } from "../../../components/round/Skeleton";
import { GlassCard } from "../../../components/round/GlassCard";
import { HeroCard } from "../../../components/round/HeroCard";
import { GemIcon } from "../../../components/round/GemIcon";
import { StepChip } from "../../../components/round/StepChip";

/**
 * One round day (scale spec 4.1): name, goal, the mission after the day, the session line and the
 * day's step chips. Without a plan, only the session line shows (D5: sessions come from the round).
 */
export default function DayScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const bundle = home.data?.bundle ?? null;
  const round = bundle?.round ?? null;
  const now = useRoundNow(bundle?.now, home.dataUpdatedAt, 60_000, home.data?.fromCache);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));
  const day = Number(params.day);

  if (home.isPending) {
    return (
      <RoundShell>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <ListSkeleton rows={3} />
      </RoundShell>
    );
  }
  if (!round || !Number.isInteger(day) || day < 1 || day > round.duration_days) {
    return (
      <RoundShell>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Banner tone="warning" text={t("error.round_not_found")} />
      </RoundShell>
    );
  }

  const plan = planDay(bundle?.plan, day);
  const date = Date.parse(`${roundDayDate(round, day)}T05:00:00Z`);
  const dateLabel = `${formatWeekday(date, lang)} ${formatDate(date, lang)}`;
  const list = stepsModel(bundle?.missions, { lang, day: currentDay(round, now) });
  const chips = dayChips(plan, list);
  const session = isSessionDay(round, day);

  return (
    <RoundShell refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Tag label={t("day.tag", { d: day })} />
      </View>
      <RText variant="meta">{dateLabel}</RText>
      <RText variant="display" accessibilityRole="header" style={styles.title}>
        {plan?.name?.trim() || t("day.tag", { d: day })}
      </RText>
      {plan?.goal?.trim() ? (
        <View style={styles.block}>
          <RText variant="label">{t("day.goal")}</RText>
          <RText variant="body" color={Ink.primary}>
            {plan.goal}
          </RText>
        </View>
      ) : null}
      {plan?.mission?.trim() ? (
        <HeroCard watermark={String(day)}>
          <Tag label={t("day.mission")} />
          <RText variant="h3" style={styles.heroText}>
            {plan.mission}
          </RText>
        </HeroCard>
      ) : null}
      <GlassCard style={styles.row} padding={14}>
        <GemIcon icon={session ? "video" : "calendar"} shape="tile" size={42} iconSize={19} muted={!session} />
        <RText variant="body" color={Ink.primary} style={styles.flex}>
          {session ? t("day.session", { start: round.session_start, end: round.session_end }) : t("day.no_session")}
        </RText>
      </GlassCard>
      {chips.length ? (
        <View style={styles.block}>
          <RText variant="label">{t("day.steps")}</RText>
          <View style={styles.chips}>
            {chips.map((c) => (
              <StepChip key={c.n} label={`${c.n}. ${c.label}`} state={c.state} />
            ))}
          </View>
        </View>
      ) : null}
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, lineHeight: 34 },
  block: { gap: 6 },
  heroText: { marginTop: 10, lineHeight: 27 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
