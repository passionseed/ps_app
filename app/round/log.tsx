import React from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { errorOf } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { draftStatusCopyKey, draftStatusKind, evidenceStatusKind, evidenceSummary, statusCopyKey } from "../../lib/round/evidence";
import { useRoundDrafts, useRoundHome, useRoundLang } from "../../lib/round/hooks";
import { missionTitle, missionTypes, orderedMissions, typeKey } from "../../lib/round/missions";
import { formatDate, formatIsoDate } from "../../lib/round/time";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { ShiftKey } from "../../components/round/Key";
import { Banner, IconButton, Tag } from "../../components/round/primitives";
import { ListSkeleton } from "../../components/round/Skeleton";
import { EvidenceRow } from "../../components/round/EvidenceRow";

export default function LogScreen() {
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const drafts = useRoundDrafts();
  useFocusEffect(
    React.useCallback(() => {
      void drafts.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  const bundle = home.data?.bundle ?? null;
  const entryId = bundle?.entry?.id;
  const myDrafts = (drafts.data ?? []).filter((d) => d.entry_id === entryId);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));
  const canLog = !!bundle?.entry && bundle.round?.phase !== "finished";
  const missions = orderedMissions(bundle?.missions);
  const missionTypeSet = new Set(missions.flatMap((m) => missionTypes(m)));
  // Free logs (first contact, the Daily Show) belong to no mission.
  const freeItems = (bundle?.evidence ?? [])
    .filter((e) => !missionTypeSet.has(e.type))
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));

  return (
    <RoundShell
      refreshing={home.isRefetching}
      onRefresh={() => void home.refetch()}
      dock={
        canLog ? (
          <ShiftKey
            label={t("log.add")}
            icon="plus"
            // The type picker: every log type, including the free ones (first contact, the Daily Show).
            onPress={() => router.push("/round/capture")}
          />
        ) : undefined
      }
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
      </View>
      <RText variant="display" accessibilityRole="header">
        {t("log.title")}
      </RText>
      {home.isPending ? <ListSkeleton /> : null}
      {home.isError ? <Banner tone="warning" text={errorCopy(lang, errorOf(home.error))} actionLabel={t("ui.retry")} onAction={() => void home.refetch()} /> : null}
      {home.data?.fromCache ? <Banner tone="violet" text={t("home.offline")} /> : null}

      {myDrafts.length ? (
        <View style={styles.group}>
          <RText variant="label">{t("log.draft")}</RText>
          {myDrafts.map((d) => {
            const kind = draftStatusKind(d);
            return (
              <EvidenceRow
                key={d.draft_id}
                title={t(typeKey(d.type))}
                summary={evidenceSummary(d.fields)}
                meta={formatDate(d.updated_at, lang)}
                status={kind}
                statusLabel={t(draftStatusCopyKey(kind))}
                onPress={() => router.push({ pathname: "/round/capture", params: { draftId: d.draft_id } })}
              />
            );
          })}
        </View>
      ) : null}

      {bundle && bundle.evidence.length === 0 && !myDrafts.length ? (
        <Banner tone="violet" text={t("log.empty")} />
      ) : null}

      {bundle
        ? missions.map((m) => {
            const types = missionTypes(m);
            const items = bundle.evidence
              .filter((e) => types.includes(e.type))
              .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
            if (!items.length) return null;
            return (
              <View key={m.key} style={styles.group}>
                <View style={styles.groupHead}>
                  <Tag label={t("mission.tag", { n: m.n })} />
                  <RText variant="label" style={{ flex: 1 }}>
                    {missionTitle(lang, m)}
                  </RText>
                </View>
                {items.map((e) => {
                  const kind = evidenceStatusKind(e);
                  return (
                    <EvidenceRow
                      key={e.id}
                      title={t(typeKey(e.type))}
                      summary={evidenceSummary(e.payload)}
                      meta={formatIsoDate(e.local_date, lang)}
                      status={kind}
                      statusLabel={t(statusCopyKey(kind))}
                      onPress={() => router.push(`/round/evidence/${e.id}`)}
                    />
                  );
                })}
              </View>
            );
          })
        : null}

      {freeItems.length ? (
        <View style={styles.group}>
          <RText variant="label">{t("mission.title.free")}</RText>
          {freeItems.map((e) => {
            const kind = evidenceStatusKind(e);
            return (
              <EvidenceRow
                key={e.id}
                title={t(typeKey(e.type))}
                summary={evidenceSummary(e.payload)}
                meta={formatIsoDate(e.local_date, lang)}
                status={kind}
                statusLabel={t(statusCopyKey(kind))}
                onPress={() => router.push(`/round/evidence/${e.id}`)}
              />
            );
          })}
        </View>
      ) : null}
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row" },
  group: { gap: 8 },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8 },
});
