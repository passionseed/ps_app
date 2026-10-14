import React from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ink, Violet } from "../../../lib/theme";
import type { CopyKey } from "../../../lib/round/copy";
import { evidenceStatusKind, evidenceSummary, statusCopyKey } from "../../../lib/round/evidence";
import { useRoundHome, useRoundLang } from "../../../lib/round/hooks";
import { missionByKey, missionDisplay, missionTitle, missionTypes, typeKey } from "../../../lib/round/missions";
import { formatIsoDate } from "../../../lib/round/time";
import { RoundShell } from "../../../components/round/RoundShell";
import { RText } from "../../../components/round/RText";
import { PillowButton } from "../../../components/round/PillowButton";
import { Banner, Card, IconButton, Tag } from "../../../components/round/primitives";
import { ListSkeleton } from "../../../components/round/Skeleton";
import { EvidenceRow } from "../../../components/round/EvidenceRow";

/** One mission (keys are dynamic, from the round config): what it needs, its logs, and a CTA. */
export default function MissionScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const bundle = home.data?.bundle ?? null;
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));

  if (home.isPending) {
    return (
      <RoundShell>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <ListSkeleton rows={2} />
      </RoundShell>
    );
  }
  // Before join (or before the server sends counts) the SHIFT default config is the preview.
  const mission = missionByKey(bundle?.missions, key);
  if (!mission) {
    return (
      <RoundShell>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Banner tone="warning" text={t("error.round_not_found")} />
      </RoundShell>
    );
  }
  const display = missionDisplay(mission, bundle?.evidence ?? []);
  const types = missionTypes(mission);
  const items = (bundle?.evidence ?? [])
    .filter((e) => types.includes(e.type))
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
  const nextPart = mission.parts.find((p) => p.have < p.need) ?? mission.parts[0];
  const canLog = !!bundle?.entry && bundle.round?.phase !== "finished";
  const stateText =
    display.state === "done"
      ? t("mission.done")
      : display.state === "not_yet"
        ? t("mission.not_yet")
        : display.state === "credit_removed"
          ? t("mission.credit_removed", { n: display.n })
          : t("mission.needs_more", { n: display.n });

  return (
    <RoundShell
      dock={
        canLog ? (
          <PillowButton
            label={t(`home.cta.${nextPart.type}` as CopyKey)}
            icon="pencil"
            onPress={() => router.push({ pathname: "/round/capture", params: { type: nextPart.type } })}
          />
        ) : undefined
      }
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Tag label={t("mission.tag", { n: mission.n })} />
      </View>
      <RText variant="display" accessibilityRole="header" style={styles.title}>
        {missionTitle(lang, mission)}
      </RText>
      <Card style={{ gap: 10 }}>
        <RText variant="label">{t("ui.mission.parts")}</RText>
        {mission.parts.map((p) => (
          <View key={p.type} style={styles.part}>
            <RText variant="body" color={Ink.primary} style={{ flex: 1 }}>
              {t(typeKey(p.type))}
            </RText>
            <RText variant="h3" latin color={p.have >= p.need ? Violet[700] : Ink.primary}>
              {`${Math.min(p.have, p.need)}/${p.need}`}
            </RText>
          </View>
        ))}
        {/* DS8: calm colour and words, no lock wording, no animation on decrement */}
        <RText variant="meta" color={display.state === "done" ? Violet[700] : Ink.secondary}>
          {stateText}
        </RText>
      </Card>
      <RText variant="label">{t("ui.mission.items")}</RText>
      {items.length === 0 ? <RText variant="body">{t("mission.not_yet")}</RText> : null}
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
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, lineHeight: 34 },
  part: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
});
