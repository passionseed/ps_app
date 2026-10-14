import React from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { olderDraftDates } from "../../lib/shiftCompanionDrafts";
import { router } from "expo-router";
import { AppText } from "../../components/AppText";
import { CompanionButton, CompanionLoadState, CompanionScreen, LangSwitch, TextAction, useCompanionLang } from "../../components/shift/CompanionUI";
import { useShiftCompanion } from "../../lib/hooks/useShiftCompanion";
import { bangkokClock, formatBangkokDate, formatBangkokTime } from "../../lib/shiftCompanion";
import { CompanionSurface, Text } from "../../lib/theme";

export default function ShiftToday() {
  const { lang, setLang, copy } = useCompanionLang();
  const { userId, cohort, today, loading, error, reload } = useShiftCompanion(true);
  const drafts = useQuery({ queryKey: queryKeys.shift.dailyDrafts(userId, cohort?.id ?? ""),
    queryFn: () => olderDraftDates(userId, cohort!.id, "9999-12-31"), enabled: !!cohort,
    staleTime: 0, refetchOnMount: "always" });
  return <CompanionScreen footer={cohort ? <CompanionButton label={today?.mine ? copy.viewEdit : copy.writeToday}
    onPress={() => router.push("/shift/update")} disabled={!!today && !today.window_open && !today.mine} /> : undefined}>
    <View style={styles.header}>
      <AppText variant="bold" style={styles.brand}>{copy.brand}</AppText>
      <TextAction label={copy.account} onPress={() => router.push("/shift/account")} />
    </View>
    <View style={styles.header}>
      <AppText style={styles.context}>{cohort?.name}</AppText>
      <LangSwitch lang={lang} onChange={setLang} />
    </View>
    <View style={styles.intro}>
      <AppText variant="bold" accessibilityRole="header" style={styles.title}>{copy.todayUpdate}</AppText>
      <AppText style={styles.secondary}>{formatBangkokDate(today?.today ?? bangkokClock().date, lang)}</AppText>
    </View>
    <CompanionLoadState loading={loading} error={error} onRetry={() => void reload()} />
    {!loading && !error && !cohort ? <CompanionButton label={copy.connectTitle} onPress={() => router.replace("/shift/link")} /> : null}
    {today && !today.window_open ? <AppText accessibilityRole="alert" style={styles.notice}>
      {today.window_reason === "before_cohort" ? copy.beforeCohort : copy.afterCohort}
    </AppText> : null}
    {today?.mine ? <View style={styles.receipt}>
      <AppText accessibilityLiveRegion="polite" style={styles.secondary}>{copy.sentTo}{today.mine.edited ? ` · ${copy.edited}` : ""} · {formatBangkokTime(today.mine.updated_at, lang)}</AppText>
      <AppText style={styles.body}>{today.mine.tried}</AppText>
    </View> : today ? <View style={styles.receipt}>
      <AppText style={styles.body}>{copy.enough}</AppText>
      <AppText style={styles.secondary}>{copy.prompt}</AppText>
    </View> : null}
    {drafts.data?.length ? <View style={styles.receipt}>
      <AppText variant="bold" style={styles.subtitle}>{copy.localDrafts}</AppText>
      {drafts.data.slice(0, 3).map(date => <TextAction key={date} label={formatBangkokDate(date, lang)} onPress={() => router.push({ pathname: "/shift/update", params: { date } })} />)}
      {drafts.data.length > 3 ? <TextAction label={copy.viewAll} onPress={() => router.push("/shift/history")} /> : null}
    </View> : null}
    {today ? <>
      <AppText style={styles.secondary}>{copy.audience}</AppText>
      <View style={styles.historyHeading}>
        <AppText variant="bold" accessibilityRole="header" style={styles.subtitle}>{copy.previous}</AppText>
        <TextAction label={copy.viewAll} onPress={() => router.push("/shift/history")} />
      </View>
      {!today.history.length ? <AppText style={styles.secondary}>{copy.emptyHistory}</AppText> : null}
      {today.history.map(update => <View key={update.id} style={styles.row}>
        <AppText style={styles.secondary}>{formatBangkokDate(update.update_date, lang)} · {update.edited ? copy.edited : copy.sent}</AppText>
        <AppText numberOfLines={3} style={styles.body}>{update.tried}</AppText>
      </View>)}
    </> : null}
  </CompanionScreen>;
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  brand: { color: Text.primary, fontSize: 20 }, context: { color: Text.secondary, fontSize: 16, flexShrink: 1 },
  intro: { marginTop: 32, gap: 8 }, title: { color: Text.primary, fontSize: 24 },
  subtitle: { color: Text.primary, fontSize: 18, flexShrink: 1 }, secondary: { color: Text.secondary, fontSize: 16, lineHeight: 24 },
  body: { color: Text.primary, fontSize: 16, lineHeight: 26 }, notice: { color: Text.primary, fontSize: 16, marginTop: 20 },
  receipt: { marginVertical: 28, gap: 12 }, historyHeading: { marginTop: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  row: { gap: 8, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: CompanionSurface.line },
});
