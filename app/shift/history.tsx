import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AppText } from "../../components/AppText";
import { CompanionLoadState, CompanionScreen, LangSwitch, TextAction, useCompanionLang } from "../../components/shift/CompanionUI";
import { DailyUpdateDetail } from "../../components/shift/DailyUpdateDetail";
import { useShiftCompanion } from "../../lib/hooks/useShiftCompanion";
import { olderDraftDates } from "../../lib/shiftCompanionDrafts";
import { queryKeys, staleTimes } from "../../lib/queryClient";
import { CompanionSurface, Text } from "../../lib/theme";
import { formatBangkokDate, formatBangkokTime, loadHistory } from "../../lib/shiftCompanion";

export default function ShiftHistory() {
  const { lang, setLang, copy } = useCompanionLang();
  const { userId, cohort, statusQuery, reload } = useShiftCompanion();
  const drafts = useQuery({ queryKey: queryKeys.shift.dailyDrafts(userId, cohort?.id ?? ""),
    queryFn: () => olderDraftDates(userId, cohort!.id, "9999-12-31"), enabled: !!cohort,
    staleTime: 0, refetchOnMount: "always" });
  const history = useInfiniteQuery({ queryKey: queryKeys.shift.dailyHistory(userId, cohort?.id ?? ""),
    queryFn: ({ pageParam }) => loadHistory(cohort!.id, pageParam), initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.length === 30 ? page[page.length - 1].update_date : undefined,
    enabled: !!userId && !!cohort, staleTime: staleTimes.userContent });
  return <CompanionScreen>
    <View style={styles.header}><TextAction label={copy.back} onPress={() => router.replace("/shift/today")} /><LangSwitch lang={lang} onChange={setLang} /></View>
    <AppText variant="bold" accessibilityRole="header" style={styles.title}>{copy.historyTitle}</AppText>
    <AppText style={styles.secondary}>{cohort?.name}</AppText>
    <CompanionLoadState loading={statusQuery.isPending || (!!cohort && history.isPending)} error={statusQuery.error || history.error} onRetry={() => void reload()} />
    {drafts.data?.length ? <View style={styles.row}>
      <AppText style={styles.secondary}>{copy.localDrafts}</AppText>
      {drafts.data.map(date => <TextAction key={date} label={formatBangkokDate(date, lang)} onPress={() => router.push({ pathname: "/shift/update", params: { date } })} />)}
    </View> : null}
    {history.data?.pages[0].length === 0 ? <AppText style={styles.empty}>{copy.emptyHistory}</AppText> : null}
    {history.data?.pages.flat().map(update => <View key={update.id} style={styles.row}>
      <AppText style={styles.secondary}>{formatBangkokDate(update.update_date, lang)} · {update.edited ? copy.edited : copy.sent} · {formatBangkokTime(update.updated_at, lang)}</AppText>
      <DailyUpdateDetail update={update} />
    </View>)}
    {history.hasNextPage ? <TextAction label={history.isFetchingNextPage ? copy.loading : copy.loadMore} onPress={() => { if (!history.isFetchingNextPage) void history.fetchNextPage(); }} /> : null}
  </CompanionScreen>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: Text.primary, fontSize: 24, marginTop: 16, marginBottom: 8 }, secondary: { color: Text.secondary, fontSize: 16, lineHeight: 24 },
  empty: { color: Text.secondary, fontSize: 16, marginTop: 24 }, row: { gap: 12, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: CompanionSurface.line } });
