import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Ink, Status, Violet } from "../../lib/theme";
import { errorCopy, type CopyKey } from "../../lib/round/copy";
import { useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { canEdit, editDraft, makeDraft, restoreDraftMedia, roundDrafts, type RoundDraft } from "../../lib/round/drafts";
import { DraftWriter } from "../../lib/drafts/store";
import { fileExists, mediaPath, persistDraftAudio, prepareDraftPhoto, removeUploaded, uploadMedia } from "../../lib/round/media";
import { MISSION_NUMBER, missionTitleKey, orderedMissions, TYPE_MISSION, typeKey } from "../../lib/round/missions";
import { changeSources, lastHours, recentLabels } from "../../lib/round/next";
import { acceptPushPrompt, declinePushPrompt, shouldOfferPushPrompt } from "../../lib/round/push";
import { roundKeys } from "../../lib/round/queryCore";
import { whoKey } from "../../lib/round/schema";
import { sendDraft } from "../../lib/round/sender";
import { prepareSend } from "../../lib/round/submission";
import { addDays, formatIsoDate, ictDate } from "../../lib/round/time";
import { keyPointFrom, toggleSegment, transcribe } from "../../lib/round/transcribe";
import { evidenceSummary } from "../../lib/round/evidence";
import { signInHref } from "../../lib/round/navigation";
import type { EvidenceType, Receipt } from "../../lib/round/types";
import { EVIDENCE_TYPES } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { Banner, Card, Checkbox, Field, IconButton, RTextInput, Tag, TextButton } from "../../components/round/primitives";
import { ChipPicker } from "../../components/round/ChipPicker";
import { VoiceRecorder } from "../../components/round/VoiceRecorder";
import { TranscriptPicker } from "../../components/round/TranscriptPicker";
import { ListSkeleton } from "../../components/round/Skeleton";

type Params = { type?: string; draftId?: string; sourceId?: string; replaces?: string; what?: string };
type FieldErrors = Record<string, string>;
type TranscribeState = "idle" | "working" | "failed";

const CHANNELS = ["in_person", "chat", "call", "social", "other"] as const;
const FIELD_LABEL_KEYS: Record<string, CopyKey> = {
  who_label: "capture.who",
  channel: "capture.channel",
  key_point: "ui.key_point",
  text: "ui.problem_text",
  link: "ui.link",
  url: "ui.demo_url",
  what: "ui.change_what",
  note: "ui.note",
  what_tried: "ui.what_tried",
  planned_change: "capture.change_plan",
  occurred_on: "capture.date.today",
  source_evidence_id: "capture.change.source",
  kind: "capture.q.change",
  visibility: "capture.demo.public",
  photo: "capture.photo.add",
  audio: "capture.record",
};

function isEvidenceType(v: string | undefined): v is EvidenceType {
  return !!v && (EVIDENCE_TYPES as readonly string[]).includes(v);
}

export default function CaptureScreen() {
  const params = useLocalSearchParams<Params>();
  const { userId, session } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const bundle = home.data?.bundle ?? null;
  const entry = bundle?.entry ?? null;
  const flags = bundle?.flags;

  const [draft, setDraft] = useState<RoundDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [customWho, setCustomWho] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "offline_saved" | "unknown">("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [sent, setSent] = useState<RoundDraft | null>(null);
  const [photoLost, setPhotoLost] = useState(false);
  const [transcribeState, setTranscribeState] = useState<TranscribeState>("idle");
  const [pushPrompt, setPushPrompt] = useState(false);
  const writer = useRef<DraftWriter<RoundDraft> | null>(null);
  const inputs = useRef<Record<string, TextInput | null>>({});

  // ---- Load or create the draft ----
  useEffect(() => {
    if (!userId || !entry || draft || receipt) return;
    let cancelled = false;
    (async () => {
      let d: RoundDraft | null = null;
      if (params.draftId) d = await roundDrafts.get(userId, params.draftId).catch(() => null);
      if (!d && isEvidenceType(params.type)) {
        const source = params.sourceId ? bundle?.evidence.find((e) => e.id === params.sourceId) : null;
        d = makeDraft({
          userId,
          roundId: entry.round_id,
          entryId: entry.id,
          type: params.type,
          sourceEvidenceId: params.type === "change" ? params.sourceId ?? null : null,
          replacesEvidenceId: params.replaces ?? null,
          fields:
            params.type === "change"
              ? { kind: "changed", what: params.what ?? (typeof source?.payload.planned_change === "string" ? source.payload.planned_change : "") }
              : params.type === "contact" || params.type === "interview" || params.type === "tester"
                ? { occurred_on: ictDate(Date.now()) }
                : params.type === "demo_post"
                  ? { visibility: "public" }
                  : {},
        });
        if (params.replaces) setDirty(true);
      }
      if (d) {
        const restored = await restoreDraftMedia(d, fileExists);
        d = restored.draft;
        if (restored.photoLost) setPhotoLost(true);
      }
      if (cancelled) return;
      setDraft(d);
      setLoaded(true);
      if (d && d.attempt && d.attempt.state !== "failed") {
        // A frozen attempt from before a kill/offline: replay it with the same submission_id.
        void runSend(d);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, entry?.id, params.type, params.draftId, params.sourceId, params.replaces, receipt]);

  /** Start a fresh draft in the same screen (receipt actions, type picker). */
  const restart = (next: Params) => {
    writer.current?.dispose();
    writer.current = null;
    setReceipt(null);
    setSent(null);
    setDraft(null);
    setLoaded(false);
    setDirty(false);
    setErrors({});
    setFormError(null);
    setStatus("idle");
    setPhotoLost(false);
    setTranscribeState("idle");
    setCustomWho(false);
    router.setParams({ type: next.type, draftId: next.draftId, sourceId: next.sourceId, replaces: next.replaces, what: next.what });
  };

  useEffect(() => {
    if (!draft || !userId) return;
    if (!writer.current) writer.current = roundDrafts.writer(userId, draft.draft_id, () => {});
    return undefined;
  }, [draft, userId]);
  useEffect(() => () => writer.current?.dispose(), []);

  const update = useCallback(
    (changes: Parameters<typeof editDraft>[1]) => {
      setDraft((current) => {
        if (!current) return current;
        const next = editDraft(current, changes);
        if (!next) return current; // a live attempt blocks edits (E5)
        writer.current?.schedule(next);
        return next;
      });
      setDirty(true);
      setFormError(null);
    },
    [],
  );
  const setField = (name: string, value: unknown) => {
    update({ fields: { [name]: value } });
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  };

  // ---- Derived ----
  const type = draft?.type ?? null;
  const fields = draft?.fields ?? {};
  const str = (k: string) => (typeof fields[k] === "string" ? (fields[k] as string) : "");
  const missions = orderedMissions(bundle?.missions);
  const mission = type ? missions.find((m) => m.key === TYPE_MISSION[type]) : null;
  const part = mission?.parts.find((p) => p.type === type);
  const partLabel =
    type && part && part.need > 1 ? t("ui.slot", { n: Math.min(part.have + 1, part.need) }) : type ? t(typeKey(type)) : "";
  const editable = draft ? canEdit(draft) : false;
  const paused = flags ? !flags.submissions_enabled : false;
  const closingSoon = bundle ? lastHours(bundle, 2) : null;
  const voiceOn = !!flags?.transcription_enabled && (type === "interview" || type === "tester");
  const today = ictDate(Date.now());
  const earliest = bundle?.round ? addDays(ictDate(bundle.round.starts_at), -7) : undefined;
  const whoLabels = useMemo(() => {
    if (!type || !bundle) return [];
    const recent = recentLabels(bundle.evidence, [type]).slice(0, 3);
    const defaults = [t("ui.who.classmate"), t("ui.who.junior"), t("ui.who.teacher"), t("ui.who.parent")];
    const seen = new Set(recent.map(whoKey));
    return [...recent, ...defaults.filter((d) => !seen.has(whoKey(d)))];
  }, [bundle, t, type]);
  const duplicateLabel = useMemo(() => {
    const label = str("who_label");
    if (!label || !type || !bundle) return null;
    return recentLabels(bundle.evidence, [type]).find((l) => whoKey(l) === whoKey(label)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, type, fields.who_label]);
  const sources = bundle ? changeSources(bundle.evidence) : [];
  const dateChips = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, -i);
      if (earliest && d < earliest) break;
      out.push({ value: d, label: i === 0 ? t("capture.date.today") : i === 1 ? t("ui.date.yesterday") : formatIsoDate(d, lang) });
    }
    return out;
  }, [earliest, lang, t, today]);

  // ---- Media ----
  const pickPhoto = async () => {
    if (!draft) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, exif: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const prepared = await prepareDraftPhoto(draft.draft_id, asset.uri, { width: asset.width, height: asset.height });
    setPhotoLost(false);
    update({ photo: { local_uri: prepared.local_uri, consent: false, width: prepared.width, height: prepared.height, uploaded_path: draft.photo?.uploaded_path, uploaded_uri: draft.photo?.uploaded_uri } });
  };

  const runTranscription = async (d: RoundDraft) => {
    if (!d.audio || !flags?.transcription_enabled) return;
    setTranscribeState("working");
    const path = mediaPath(d.round_id, d.user_id, d.draft_id, "audio");
    let audio = d.audio;
    if (audio.uploaded_uri !== audio.local_uri) {
      if (audio.uploaded_path) await removeUploaded(audio.uploaded_path);
      const up = await uploadMedia(path, audio.local_uri, "audio");
      if (!up.ok) {
        setTranscribeState("failed");
        return;
      }
      audio = { ...audio, uploaded_path: path, uploaded_uri: audio.local_uri, bytes: up.bytes };
    }
    const token = session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token ?? "";
    const result = await transcribe({ webBaseUrl: flags.web_base_url, path, lang, accessToken: token });
    if (!result.ok) {
      update({ audio });
      setTranscribeState("failed");
      return;
    }
    update({ audio: { ...audio, transcript: result.data.text, segments: result.data.segments, selected: [] } });
    setTranscribeState("idle");
  };

  const onRecorded = async (uri: string, durationMs: number) => {
    if (!draft) return;
    const local = await persistDraftAudio(draft.draft_id, uri);
    const audio = { local_uri: local, duration_ms: durationMs, consent: false, uploaded_path: draft.audio?.uploaded_path, uploaded_uri: draft.audio?.uploaded_uri };
    const next = editDraft(draft, { audio });
    if (!next) return;
    setDraft(next);
    writer.current?.schedule(next);
    setDirty(true);
    void runTranscription(next);
  };

  const onToggleSegment = (index: number) => {
    if (!draft?.audio?.segments) return;
    const selected = toggleSegment(draft.audio.selected ?? [], index);
    update({ audio: { ...draft.audio, selected }, fields: { key_point: keyPointFrom(draft.audio.segments, selected) } });
  };

  // ---- Send ----
  async function runSend(frozen: RoundDraft) {
    setStatus("sending");
    const result = await sendDraft(frozen);
    if (result.kind === "receipt") {
      setSent(result.draft);
      setDraft(null);
      setReceipt(result.receipt);
      setStatus("idle");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility(t("receipt.title"));
      await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
      if (await shouldOfferPushPrompt(userId)) setPushPrompt(true);
      return;
    }
    setDraft(result.draft);
    if (result.category === "unauthenticated") {
      setStatus("idle");
      router.replace(signInHref("/round/log", "expired"));
      return;
    }
    if (result.category === "offline") {
      setStatus("offline_saved");
      return;
    }
    if (result.category === "retryable" || result.category === "unavailable") {
      setStatus("unknown");
      setFormError(errorCopy(lang, result));
      return;
    }
    setStatus("idle");
    const message = errorCopy(lang, result, {
      field: result.field ? t(FIELD_LABEL_KEYS[result.field] ?? "ui.note") : "",
      n: bundle?.round?.number ?? "",
    });
    if (result.field) {
      setErrors({ [result.field]: message });
      inputs.current[result.field]?.focus();
    } else {
      setFormError(message);
    }
    AccessibilityInfo.announceForAccessibility(message);
  }

  const onSave = async () => {
    if (!draft || status === "sending") return;
    const check = prepareSend(draft, { earliestDate: earliest, today });
    if (!check.ok) {
      const next: FieldErrors = {};
      for (const issue of check.issues) {
        const label = t(FIELD_LABEL_KEYS[issue.field] ?? "ui.note");
        next[issue.field] = errorCopy(lang, { code: issue.code, category: "validation", field: label, details: issue.rule ? { rule: issue.rule } : {} });
      }
      setErrors(next);
      const first = check.issues[0]?.field;
      if (first && inputs.current[first]) inputs.current[first]?.focus();
      AccessibilityInfo.announceForAccessibility(Object.values(next)[0] ?? "");
      return;
    }
    setErrors({});
    await writer.current?.flush().catch(() => {});
    await roundDrafts.save(check.draft);
    setDraft(check.draft);
    await runSend(check.draft);
  };

  const close = () => {
    void writer.current?.flush();
    if (!dirty && draft && !draft.attempt && userId) void roundDrafts.remove(userId, draft.draft_id).catch(() => {});
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/shift");
  };

  // ---- Render: loading / guards ----
  if (!userId || home.isPending || (!loaded && !!entry)) {
    return (
      <RoundShell>
        <ListSkeleton rows={3} />
      </RoundShell>
    );
  }
  if (!entry) {
    return (
      <RoundShell dock={<PillowButton label={t("receipt.back")} icon="back" onPress={close} />}>
        <Banner tone="warning" text={t("error.entry_not_found")} />
      </RoundShell>
    );
  }

  // ---- Receipt ----
  if (receipt) {
    const sentType = sent?.type ?? null;
    const sentFields = sent?.fields ?? {};
    const counts = orderedMissions(receipt.missions);
    const m = sentType ? counts.find((x) => x.key === TYPE_MISSION[sentType]) : null;
    const plannedChange =
      typeof sentFields.planned_change === "string" && sentFields.planned_change.trim() && (sentType === "interview" || sentType === "tester");
    return (
      <RoundShell dock={<PillowButton label={t("receipt.back")} icon="house" onPress={() => router.replace("/(tabs)/shift")} />}>
        <Animated.View entering={reduced ? undefined : FadeInUp.duration(350)}>
          <Card style={{ gap: 10 }}>
            <Tag label={t("receipt.title")} tone="success" />
            {receipt.after_close ? <Banner tone="warning" text={t("receipt.after_close")} /> : null}
            {receipt.duplicate_label ? <Banner tone="violet" text={t("receipt.duplicate_label")} /> : null}
            {m
              ? m.parts.map((p) => (
                  <RText key={p.type} variant="title" latin={false}>
                    {t("receipt.count", { mission: t(typeKey(p.type)), have: Math.min(p.have, p.need), need: p.need })}
                  </RText>
                ))
              : null}
            {receipt.newly_completed.map((key) => (
              <RText key={key} variant="h3" color={Status.success}>
                {t("receipt.mission_complete", { n: MISSION_NUMBER[key] })}
              </RText>
            ))}
          </Card>
        </Animated.View>
        {pushPrompt ? (
          <Card style={{ gap: 8 }}>
            <RText variant="h3">{t("push.prompt.title")}</RText>
            <RText variant="body">{t("push.prompt.body")}</RText>
            <View style={styles.row}>
              <TextButton
                label={t("push.prompt.yes")}
                onPress={() => {
                  setPushPrompt(false);
                  void acceptPushPrompt(userId);
                }}
              />
              <TextButton
                label={t("push.prompt.no")}
                tone="ink"
                onPress={() => {
                  setPushPrompt(false);
                  void declinePushPrompt(userId);
                }}
              />
            </View>
          </Card>
        ) : null}
        {plannedChange ? (
          <TextButton
            label={t("receipt.make_change")}
            icon="pencil"
            onPress={() =>
              restart({ type: "change", sourceId: receipt.evidence_id, what: String(sentFields.planned_change), draftId: undefined, replaces: undefined })
            }
          />
        ) : null}
        <TextButton
          label={t("receipt.add_another")}
          icon="plus"
          onPress={() => restart({ type: sentType ?? undefined, draftId: undefined, sourceId: undefined, replaces: undefined, what: undefined })}
        />
      </RoundShell>
    );
  }

  // ---- Type picker ----
  if (!draft) {
    return (
      <RoundShell>
        <View style={styles.top}>
          <Tag label={t("log.add")} />
          <IconButton icon="close" size={48} label={t("ui.close")} onPress={close} />
        </View>
        {EVIDENCE_TYPES.map((ty) => {
          const key = TYPE_MISSION[ty];
          return (
            <Pressable
              key={ty}
              accessibilityRole="button"
              onPress={() => restart({ type: ty, draftId: undefined, sourceId: undefined, replaces: undefined, what: undefined })}
              style={({ pressed }) => [styles.typeRow, pressed && { backgroundColor: Violet[50] }]}
            >
              <Tag label={t("mission.tag", { n: MISSION_NUMBER[key] })} />
              <View style={{ flex: 1 }}>
                <RText variant="label">{t(typeKey(ty))}</RText>
                <RText variant="meta">{t(missionTitleKey(key))}</RText>
              </View>
            </Pressable>
          );
        })}
      </RoundShell>
    );
  }

  // ---- Composer ----
  const question = t(`capture.q.${draft.type}` as CopyKey);
  const sending = status === "sending";
  const ro = !editable || sending;
  const err = (k: string) => errors[k] || null;
  const ref = (k: string) => (r: TextInput | null) => {
    inputs.current[k] = r;
  };

  const whoField = (
    <Field label={t("capture.who")} hint={t("capture.who.hint")} error={err("who_label")}>
      <ChipPicker
        chips={[...whoLabels.map((l) => ({ value: l, label: l })), { value: "__custom", label: t("ui.who_add") }]}
        value={customWho ? "__custom" : str("who_label") || null}
        onChange={(v) => {
          if (ro) return;
          if (v === "__custom") {
            setCustomWho(true);
            setField("who_label", "");
            setTimeout(() => inputs.current.who_label?.focus(), 50);
          } else {
            setCustomWho(false);
            setField("who_label", v);
          }
        }}
        accessibilityLabel={t("capture.who")}
      />
      {customWho ? (
        <RTextInput
          ref={ref("who_label")}
          value={str("who_label")}
          editable={!ro}
          onChangeText={(v) => setField("who_label", v)}
          placeholder={t("ui.who_custom")}
          accessibilityLabel={t("capture.who")}
          maxLength={60}
          invalid={!!err("who_label")}
        />
      ) : null}
      {duplicateLabel ? <Banner tone="violet" text={t("capture.who.duplicate", { label: duplicateLabel })} /> : null}
    </Field>
  );

  const dateField = (
    <Field error={err("occurred_on")}>
      <ChipPicker chips={dateChips} value={str("occurred_on") || today} onChange={(v) => !ro && setField("occurred_on", v)} />
    </Field>
  );

  const linkField = (
    <Field label={t("ui.link")} error={err("link")}>
      <RTextInput
        ref={ref("link")}
        value={str("link")}
        editable={!ro}
        onChangeText={(v) => setField("link", v)}
        placeholder="https://"
        autoCapitalize="none"
        keyboardType="url"
        accessibilityLabel={t("ui.link")}
        invalid={!!err("link")}
      />
    </Field>
  );

  const photoField = (
    <Field error={err("photo")}>
      {draft.photo ? (
        <View style={{ gap: 8 }}>
          <View style={styles.row}>
            <Image source={{ uri: draft.photo.local_uri }} style={styles.thumb} accessibilityIgnoresInvertColors />
            <TextButton label={t("ui.photo.remove")} icon="trash" disabled={ro} onPress={() => update({ photo: null })} />
          </View>
          <Checkbox
            checked={draft.photo.consent}
            label={t("capture.consent.photo")}
            onChange={(c) => !ro && update({ photo: { ...draft.photo!, consent: c } })}
          />
        </View>
      ) : (
        <TextButton label={t("capture.photo.add")} icon="camera" disabled={ro} onPress={() => void pickPhoto()} />
      )}
    </Field>
  );

  const keyPointField = (
    <Field label={t("ui.key_point")} error={err("key_point")}>
      <RTextInput
        ref={ref("key_point")}
        value={str("key_point")}
        editable={!ro}
        multiline
        onChangeText={(v) => setField("key_point", v)}
        placeholder={draft.type === "tester" ? t("capture.q.tester") : t("capture.q.interview")}
        accessibilityLabel={t("ui.key_point")}
        maxLength={500}
        invalid={!!err("key_point")}
      />
    </Field>
  );

  let body: React.ReactNode = null;
  let optional: React.ReactNode = null;
  switch (draft.type) {
    case "contact":
      body = (
        <>
          {whoField}
          <Field label={t("capture.channel")} error={err("channel")}>
            <ChipPicker
              chips={CHANNELS.map((c) => ({ value: c, label: t(`capture.channel.${c}` as CopyKey) }))}
              value={(str("channel") as (typeof CHANNELS)[number]) || null}
              onChange={(v) => !ro && setField("channel", v)}
              accessibilityLabel={t("capture.channel")}
            />
          </Field>
          {dateField}
        </>
      );
      optional = (
        <>
          {photoField}
          {linkField}
        </>
      );
      break;
    case "interview":
    case "tester":
      body = (
        <>
          {voiceOn ? (
            <VoiceRecorder
              audio={draft.audio ?? null}
              disabled={ro}
              onRecorded={(uri, ms) => void onRecorded(uri, ms)}
              onRemove={() => {
                if (draft.audio?.uploaded_path) void removeUploaded(draft.audio.uploaded_path);
                update({ audio: null });
                setTranscribeState("idle");
              }}
              labels={{
                record: t("capture.record"),
                recording: (time) => t("capture.recording", { time }),
                stop: t("ui.record.stop"),
                play: t("ui.record.play"),
                pause: t("ui.record.pause"),
                remove: t("ui.record.remove"),
                permission: t("ui.record.permission"),
              }}
            />
          ) : null}
          {voiceOn && draft.audio ? (
            <Checkbox
              checked={draft.audio.consent}
              label={t("capture.consent.audio")}
              onChange={(c) => !ro && update({ audio: { ...draft.audio!, consent: c } })}
            />
          ) : null}
          {err("audio") ? <Banner tone="error" text={err("audio")!} /> : null}
          {transcribeState === "working" ? <Banner tone="violet" text={t("capture.transcribing")} /> : null}
          {transcribeState === "failed" ? (
            <Banner tone="warning" text={t("capture.transcript_failed")} actionLabel={t("capture.transcribe_now")} onAction={() => void runTranscription(draft)} />
          ) : null}
          {draft.audio?.segments?.length ? (
            <TranscriptPicker
              segments={draft.audio.segments}
              selected={draft.audio.selected ?? []}
              onToggle={(i) => !ro && onToggleSegment(i)}
              hint={t("capture.tap_key")}
            />
          ) : null}
          {keyPointField}
          {whoField}
          {dateField}
          <Field label={t("capture.change_plan")} error={err("planned_change")}>
            <RTextInput
              ref={ref("planned_change")}
              value={str("planned_change")}
              editable={!ro}
              onChangeText={(v) => setField("planned_change", v)}
              accessibilityLabel={t("capture.change_plan")}
              maxLength={280}
            />
          </Field>
        </>
      );
      optional = (
        <>
          {draft.type === "tester" ? (
            <Field label={t("ui.what_tried")} error={err("what_tried")}>
              <RTextInput
                ref={ref("what_tried")}
                value={str("what_tried")}
                editable={!ro}
                onChangeText={(v) => setField("what_tried", v)}
                accessibilityLabel={t("ui.what_tried")}
                maxLength={200}
              />
            </Field>
          ) : null}
          {linkField}
          {photoField}
        </>
      );
      break;
    case "problem_statement":
      body = (
        <Field label={t("ui.problem_text")} error={err("text")}>
          <RTextInput
            ref={ref("text")}
            value={str("text")}
            editable={!ro}
            multiline
            onChangeText={(v) => setField("text", v)}
            placeholder={t("capture.template.problem")}
            accessibilityLabel={t("ui.problem_text")}
            maxLength={500}
            invalid={!!err("text")}
          />
        </Field>
      );
      optional = (
        <>
          {linkField}
          {photoField}
        </>
      );
      break;
    case "mvp":
      body = (
        <>
          <Field label={t("ui.mvp_link")} error={err("link")}>
            <RTextInput
              ref={ref("link")}
              value={str("link")}
              editable={!ro}
              onChangeText={(v) => setField("link", v)}
              placeholder="https://"
              autoCapitalize="none"
              keyboardType="url"
              accessibilityLabel={t("ui.mvp_link")}
              invalid={!!err("link")}
            />
          </Field>
          {photoField}
        </>
      );
      optional = (
        <Field label={t("ui.note")}>
          <RTextInput value={str("note")} editable={!ro} onChangeText={(v) => setField("note", v)} maxLength={280} accessibilityLabel={t("ui.note")} />
        </Field>
      );
      break;
    case "change":
      body = (
        <>
          <ChipPicker
            chips={[
              { value: "changed", label: t("capture.change.changed") },
              { value: "decided_not_to", label: t("capture.change.decided_not_to") },
            ]}
            value={(str("kind") as "changed" | "decided_not_to") || "changed"}
            onChange={(v) => !ro && setField("kind", v)}
          />
          <Field label={t("capture.change.source")} error={err("source_evidence_id")}>
            {sources.length ? (
              <View style={{ gap: 6 }}>
                {sources.map((s) => {
                  const on = draft.source_evidence_id === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on, checked: on }}
                      onPress={() => !ro && update({ source_evidence_id: s.id })}
                      style={[styles.source, on && styles.sourceOn]}
                    >
                      <RText variant="small" color={on ? "#FFFFFF" : Ink.primary} numberOfLines={2}>
                        {`${t(typeKey(s.type))} · ${evidenceSummary(s.payload)}`}
                      </RText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Banner tone="violet" text={t("ui.change_no_source")} />
            )}
          </Field>
          <Field label={t("ui.change_what")} error={err("what")}>
            <RTextInput
              ref={ref("what")}
              value={str("what")}
              editable={!ro}
              multiline
              onChangeText={(v) => setField("what", v)}
              accessibilityLabel={t("ui.change_what")}
              maxLength={500}
              invalid={!!err("what")}
            />
          </Field>
        </>
      );
      optional = (
        <>
          {linkField}
          {photoField}
        </>
      );
      break;
    case "demo_post":
      body = (
        <>
          <Field label={t("ui.demo_url")} error={err("url")}>
            <RTextInput
              ref={ref("url")}
              value={str("url")}
              editable={!ro}
              onChangeText={(v) => setField("url", v)}
              placeholder="https://"
              autoCapitalize="none"
              keyboardType="url"
              accessibilityLabel={t("ui.demo_url")}
              invalid={!!err("url")}
            />
          </Field>
          <ChipPicker
            chips={[
              { value: "public", label: t("capture.demo.public") },
              { value: "reviewer_only", label: t("capture.demo.reviewer_only") },
            ]}
            value={(str("visibility") as "public" | "reviewer_only") || "public"}
            onChange={(v) => !ro && setField("visibility", v)}
          />
        </>
      );
      optional = (
        <Field label={t("ui.note")}>
          <RTextInput value={str("note")} editable={!ro} onChangeText={(v) => setField("note", v)} maxLength={280} accessibilityLabel={t("ui.note")} />
        </Field>
      );
      break;
  }

  const dock = (
    <View style={{ gap: 8 }}>
      <PillowButton
        label={sending ? t("capture.sending") : t("capture.save")}
        icon="check"
        busy={sending}
        disabled={paused || !editable}
        onPress={() => void onSave()}
      />
      <RText variant="meta" style={{ textAlign: "center" }}>
        {t("capture.visibility")}
      </RText>
    </View>
  );

  return (
    <RoundShell dock={dock} keyboard>
      <View style={styles.top}>
        <Tag label={`${t("mission.tag", { n: MISSION_NUMBER[TYPE_MISSION[draft.type]] })} · ${partLabel}`} />
        <IconButton icon="close" size={48} label={t("ui.close")} onPress={close} />
      </View>
      <RText variant="display" style={{ fontSize: 26, lineHeight: 34 }} accessibilityRole="header">
        {question}
      </RText>
      {paused ? <Banner tone="warning" text={t("capture.read_only")} /> : null}
      {closingSoon ? <Banner tone="warning" text={t("capture.closing_soon", closingSoon)} /> : null}
      {photoLost ? <Banner tone="warning" text={t("capture.photo.repick")} actionLabel={t("capture.photo.add")} onAction={() => void pickPhoto()} /> : null}
      {status === "offline_saved" ? <Banner tone="violet" text={t("capture.offline_saved")} /> : null}
      {status === "unknown" ? <Banner tone="violet" text={t("capture.unknown_outcome")} actionLabel={t("ui.retry")} onAction={() => draft && void runSend(draft)} /> : null}
      {formError && status !== "unknown" ? <Banner tone="error" text={formError} /> : null}
      {body}
      {optional ? (
        <View style={{ gap: 12 }}>
          <TextButton label={t("capture.more")} icon={showMore ? "close" : "plus"} onPress={() => setShowMore((v) => !v)} />
          {showMore ? optional : null}
        </View>
      ) : null}
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  thumb: { width: 88, height: 88, borderRadius: 14, backgroundColor: Violet[50] },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    minHeight: 64,
  },
  source: { borderRadius: 14, borderWidth: 1.5, borderColor: "#CFC8E6", backgroundColor: "#FFFFFF", padding: 12, minHeight: 48 },
  sourceOn: { backgroundColor: Violet[600], borderColor: Violet[600] },
});
