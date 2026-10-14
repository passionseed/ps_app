import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { Ink, Status, Violet } from "../../../lib/theme";
import { roundApi } from "../../../lib/round/api";
import { errorCopy, hasKey, type CopyKey } from "../../../lib/round/copy";
import { evidenceStatusKind, evidenceSummary, statusCopyKey } from "../../../lib/round/evidence";
import { useRoundHome, useRoundLang, useRoundUser } from "../../../lib/round/hooks";
import { MEDIA_BUCKET } from "../../../lib/round/media";
import { missionTitle, orderedMissions, typeKey } from "../../../lib/round/missions";
import { roundKeys } from "../../../lib/round/queryCore";
import { formatIsoDate } from "../../../lib/round/time";
import type { WithdrawPreview } from "../../../lib/round/types";
import { RoundShell } from "../../../components/round/RoundShell";
import { RText } from "../../../components/round/RText";
import { PillowButton } from "../../../components/round/PillowButton";
import { Banner, IconButton, Tag, TextButton } from "../../../components/round/primitives";
import { ListSkeleton } from "../../../components/round/Skeleton";
import { StatusTag } from "../../../components/round/StatusTag";
import { EvidenceRow } from "../../../components/round/EvidenceRow";
import { GlassCard } from "../../../components/round/GlassCard";
import { HeroCard } from "../../../components/round/HeroCard";
import { Icon } from "../../../components/round/Icons";

const FIELD_ORDER = [
  "who_label",
  "user_group",
  "channel",
  "occurred_on",
  "key_point",
  "text",
  "what",
  "kind",
  "what_tried",
  "planned_change",
  "built",
  "broke",
  "heard",
  "url",
  "visibility",
  "link",
  "note",
  "transcript",
];

/** Payload values in words: dates formatted, known enum values (channel, visibility, kind) via copy. */
function payloadText(key: string, value: string, lang: "th" | "en", t: (k: CopyKey) => string): string {
  if (key === "occurred_on" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatIsoDate(value, lang);
  const prefix = key === "channel" ? "capture.channel." : key === "visibility" ? "capture.demo." : key === "kind" ? "capture.change." : null;
  if (prefix && hasKey(`${prefix}${value}`)) return t(`${prefix}${value}` as CopyKey);
  return value;
}

export default function EvidenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const bundle = home.data?.bundle ?? null;
  const item = bundle?.evidence.find((e) => e.id === id) ?? null;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<WithdrawPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));

  const photoPath = item?.media.find((m) => m.kind === "photo")?.path;
  useEffect(() => {
    if (!photoPath) return;
    let cancelled = false;
    void supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(photoPath, 300)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setPhotoUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  if (home.isPending) {
    return (
      <RoundShell>
        <ListSkeleton rows={3} />
      </RoundShell>
    );
  }
  if (!item || !bundle) {
    return (
      <RoundShell>
        <View style={styles.top}>
          <IconButton icon="back" label={t("ui.back")} onPress={close} />
        </View>
        <Banner tone="warning" text={t("error.entry_not_found")} />
      </RoundShell>
    );
  }

  const kind = evidenceStatusKind(item);
  const missions = orderedMissions(bundle.missions);
  const mission = item.mission ? missions.find((m) => m.key === item.mission) ?? null : null;
  const linkedChanges = bundle.evidence.filter((e) => e.source_evidence_id === item.id);
  const source = item.source_evidence_id ? bundle.evidence.find((e) => e.id === item.source_evidence_id) : null;
  const reason = item.status_reason_code;
  const canWithdraw = item.status === "submitted" && !bundle.certificate && bundle.round?.phase !== "finished";
  const canReplace = item.status === "rejected" && !item.replaced_by && bundle.round?.phase !== "finished";

  const loadPreview = async () => {
    setBusy(true);
    setError(null);
    const result = await roundApi.withdrawEvidence(item.id, true);
    setBusy(false);
    if (result.ok) setPreview(result.data);
    else setError(errorCopy(lang, result.error));
  };
  const confirmWithdraw = async () => {
    setBusy(true);
    const result = await roundApi.withdrawEvidence(item.id, false);
    setBusy(false);
    if (!result.ok) {
      setError(errorCopy(lang, result.error));
      return;
    }
    setPreview(null);
    await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
  };

  const payloadRows = FIELD_ORDER.filter((k) => typeof item.payload[k] === "string" && (item.payload[k] as string).trim());
  const ideas = Array.isArray(item.payload.ideas)
    ? (item.payload.ideas as unknown[]).filter(
        (x): x is { text: string; who?: string } => !!x && typeof x === "object" && typeof (x as { text?: unknown }).text === "string",
      )
    : [];
  const picked = typeof item.payload.picked === "number" ? item.payload.picked : -1;

  return (
    <RoundShell
      dock={
        canReplace ? (
          <PillowButton
            label={t("attention.replace")}
            icon="pencil"
            onPress={() => router.push({ pathname: "/round/capture", params: { type: item.type, replaces: item.id } })}
          />
        ) : undefined
      }
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <View style={styles.tags}>
          {mission ? <Tag label={t("mission.tag", { n: mission.n })} /> : null}
          <StatusTag kind={kind} label={t(statusCopyKey(kind))} />
        </View>
      </View>
      <RText variant="display" accessibilityRole="header">
        {t(typeKey(item.type))}
      </RText>
      <RText variant="meta">{`${missionTitle(lang, mission)} · ${formatIsoDate(item.local_date, lang)}`}</RText>
      {error ? <Banner tone="error" text={error} /> : null}

      {item.status === "rejected" && reason ? (
        <View style={styles.reason}>
          <LinearGradient colors={["#FFF7EC", Status.warningBg]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={styles.reasonHead}>
            <View style={styles.reasonIcon}>
              <Icon name="alert" size={18} color={Status.warning} />
            </View>
            <RText variant="label" color={Status.warning}>
              {t("ui.evidence.reason")}
            </RText>
          </View>
          <RText variant="body" color={Ink.primary}>
            {t(`reason.${reason}` as CopyKey, { note: item.status_note ?? "" })}
          </RText>
          <RText variant="label" color={Status.warning}>
            {t("ui.evidence.fix")}
          </RText>
          <RText variant="body" color={Ink.secondary}>
            {t(`fix.${reason}` as CopyKey)}
          </RText>
          {item.status_note && reason !== "other" ? <RText variant="small">{item.status_note}</RText> : null}
        </View>
      ) : null}
      {item.replaced_by ? <Banner tone="violet" text={t("ui.evidence.replaced")} /> : null}

      <HeroCard style={{ gap: 10 }}>
        {ideas.map((idea, i) => (
          <View key={`idea-${i}`} style={[styles.idea, i === picked && styles.ideaPicked]}>
            <View style={styles.ideaHead}>
              <RText variant="label" style={{ flex: 1 }}>
                {idea.text}
              </RText>
              {i === picked ? <StatusTag kind="accepted" label={t("ui.evidence.ideas_picked")} /> : null}
            </View>
            {idea.who ? <RText variant="meta">{t("ui.evidence.ideas_who", { who: idea.who })}</RText> : null}
          </View>
        ))}
        {ideas.length && item.payload.reachable === true ? (
          <RText variant="meta">{t("ui.evidence.reachable")}</RText>
        ) : null}
        {payloadRows.map((k) => (
          <RText key={k} variant="body" color={Ink.primary}>
            {payloadText(k, String(item.payload[k]), lang, t)}
          </RText>
        ))}
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} accessibilityIgnoresInvertColors /> : null}
      </HeroCard>

      {source ? (
        <View style={{ gap: 8 }}>
          <RText variant="label" style={styles.section}>
            {t("ui.evidence.source")}
          </RText>
          <EvidenceRow
            title={t(typeKey(source.type))}
            summary={evidenceSummary(source.payload)}
            meta={formatIsoDate(source.local_date, lang)}
            status={evidenceStatusKind(source)}
            statusLabel={t(statusCopyKey(evidenceStatusKind(source)))}
            onPress={() => router.push(`/round/evidence/${source.id}`)}
          />
        </View>
      ) : null}
      {linkedChanges.length ? (
        <View style={{ gap: 8 }}>
          <RText variant="label" style={styles.section}>
            {t("ui.evidence.linked_change")}
          </RText>
          {linkedChanges.map((c) => (
            <EvidenceRow
              key={c.id}
              title={t(typeKey(c.type))}
              summary={evidenceSummary(c.payload)}
              meta={formatIsoDate(c.local_date, lang)}
              status={evidenceStatusKind(c)}
              statusLabel={t(statusCopyKey(evidenceStatusKind(c)))}
              onPress={() => router.push(`/round/evidence/${c.id}`)}
            />
          ))}
        </View>
      ) : null}

      {canWithdraw && !preview ? <TextButton label={busy ? t("ui.withdraw.loading") : t("withdraw.cta")} tone="danger" icon="trash" disabled={busy} onPress={() => void loadPreview()} /> : null}
      {preview ? (
        <GlassCard style={{ gap: 8 }}>
          {preview.affected.map((a) => {
            const m = missions.find((x) => x.key === a.mission) ?? null;
            const part = m?.parts.find((p) => p.type === (a.type ?? item.type)) ?? m?.parts[0];
            const need = part?.need ?? 1;
            const label = m && m.parts.length > 1 && part ? t(typeKey(part.type)) : missionTitle(lang, m);
            return (
              <RText key={`${a.mission}-${a.type ?? ""}`} variant="body" color={Ink.primary}>
                {t("withdraw.preview", { mission: label, have: a.have_after, need })}
              </RText>
            );
          })}
          {preview.invalidated_changes.length ? <RText variant="body">{t("withdraw.preview_change")}</RText> : null}
          <View style={styles.row}>
            <TextButton label={t("withdraw.confirm")} tone="danger" disabled={busy} onPress={() => void confirmWithdraw()} />
            <TextButton label={t("withdraw.cancel")} tone="ink" onPress={() => setPreview(null)} />
          </View>
        </GlassCard>
      ) : null}
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  idea: { gap: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.6)" },
  ideaPicked: { backgroundColor: Violet[50] },
  ideaHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  tags: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  section: { marginLeft: 4 },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: 16 },
  reason: { borderRadius: 20, padding: 14, gap: 6, borderWidth: 1, borderColor: "#FBE1BC", backgroundColor: Status.warningBg },
  reasonHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  reasonIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFE7C7", alignItems: "center", justifyContent: "center" },
});
