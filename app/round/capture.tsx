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
import {
  applyAudioResult,
  canEdit,
  editDraft,
  makeDraft,
  restoreDraftMedia,
  roundDrafts,
  shouldDiscardOnClose,
  type DraftAudio,
  type RoundDraft,
} from "../../lib/round/drafts";
import { DraftWriter } from "../../lib/drafts/store";
import {
  fileExists,
  mediaPath,
  migrateDraftMedia,
  persistDraftAudio,
  prepareDraftPhoto,
  removeUploaded,
  resolveDraftUri,
  syncDraftMedia,
} from "../../lib/round/media";
import { FREE_TYPES, missionForType, missionNumber, missionTitle, orderedMissions, typeKey } from "../../lib/round/missions";
import { addIdeaRow, ideaRows, ideasPayload, newIdeaRows, removeIdeaRow, updateIdeaRow } from "../../lib/round/ideas";
import { progressPost } from "../../lib/round/discord";
import { currentDay } from "../../lib/round/schedule";
import { steps as stepsModel } from "../../lib/round/steps";
import { changeSources, lastHours, recentLabels } from "../../lib/round/next";
import { acceptPushPrompt, declinePushPrompt, shouldOfferPushPrompt } from "../../lib/round/push";
import { roundKeys } from "../../lib/round/queryCore";
import { whoKey } from "../../lib/round/schema";
import { sendDraft } from "../../lib/round/sender";
import { defaultSendDeps, prepareSend } from "../../lib/round/submission";
import { addDays, formatIsoDate, ictDate } from "../../lib/round/time";
import { keyPointFrom, toggleSegment, transcribe } from "../../lib/round/transcribe";
import { evidenceSummary } from "../../lib/round/evidence";
import { signInHref } from "../../lib/round/navigation";
import type { EvidenceType, Receipt } from "../../lib/round/types";
import { EVIDENCE_TYPES } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { ShiftKey } from "../../components/round/Key";
import { Banner, Card, Checkbox, Field, IconButton, RTextInput, Tag, TextButton } from "../../components/round/primitives";
import { ChipPicker } from "../../components/round/ChipPicker";
import { VoiceRecorder } from "../../components/round/VoiceRecorder";
import { TranscriptPicker } from "../../components/round/TranscriptPicker";
import { ListSkeleton } from "../../components/round/Skeleton";
import { IdeasComposer } from "../../components/round/composers/IdeasComposer";
import { DailyComposer } from "../../components/round/composers/DailyComposer";
import { ProblemComposer } from "../../components/round/composers/ProblemComposer";
import { ProgressCopyButton } from "../../components/round/composers/ProgressCopyButton";

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
  ideas: "capture.ideas.text",
  picked: "capture.ideas.pick",
  reachable: "capture.ideas.reachable",
  user_group: "capture.problem.user_group",
  built: "capture.daily.built",
  broke: "capture.daily.broke",
  heard: "capture.daily.heard",
};

function isEvidenceType(v: string | undefined): v is EvidenceType {
  return !!v && (EVIDENCE_TYPES as readonly string[]).includes(v);
}

/** Types offered in the picker: today's update first, then the round's mission types in order, then free logs. */
function pickerTypes(counts: Parameters<typeof orderedMissions>[0]): EvidenceType[] {
  const out: EvidenceType[] = ["daily"];
  for (const m of orderedMissions(counts)) for (const p of m.parts) if (!out.includes(p.type)) out.push(p.type);
  for (const f of FREE_TYPES) if (!out.includes(f)) out.push(f);
  return out;
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
  /** True when this screen made the draft (not opened from storage); only such drafts are discarded on close. */
  const createdHere = useRef(false);
  /** The recording the draft currently holds; late transcription results for older ones are ignored. */
  const currentAudio = useRef<string | null>(null);
  const inputs = useRef<Record<string, TextInput | null>>({});

  // ---- Load or create the draft ----
  useEffect(() => {
    if (!userId || !entry || draft || receipt) return;
    let cancelled = false;
    (async () => {
      let d: RoundDraft | null = null;
      let created = false;
      if (params.draftId) d = await roundDrafts.get(userId, params.draftId).catch(() => null);
      if (!d && isEvidenceType(params.type)) {
        created = true;
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
                  : params.type === "ideas"
                    ? { ideas: newIdeaRows(), picked_id: null, reachable: false }
                    : {},
        });
        if (params.replaces) setDirty(true);
      }
      if (d) {
        const draftId = d.draft_id;
        const restored = await restoreDraftMedia(migrateDraftMedia(d), (uri) => fileExists(resolveDraftUri(draftId, uri)));
        d = restored.draft;
        if (restored.photoLost) setPhotoLost(true);
      }
      if (cancelled) return;
      createdHere.current = created;
      currentAudio.current = d?.audio?.local_uri ?? null;
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
    createdHere.current = false;
    currentAudio.current = null;
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
  const mission = type ? missionForType(bundle?.missions, type) : null;
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

  /** Applies a late result for the recording `localUri`, unless a newer recording replaced it. */
  const applyAudio = (localUri: string, patch: Partial<DraftAudio>) => {
    setDraft((current) => {
      const next = applyAudioResult(current, localUri, patch);
      if (!next) return current;
      writer.current?.schedule(next);
      return next;
    });
  };

  const runTranscription = async (d: RoundDraft) => {
    if (!d.audio || !flags?.transcription_enabled) return;
    const localUri = d.audio.local_uri;
    const isCurrent = () => currentAudio.current === localUri;
    setTranscribeState("working");
    const path = mediaPath(d.round_id, d.user_id, d.draft_id, "audio");
    const synced = await syncDraftMedia(d.draft_id, d.audio, path, "audio", defaultSendDeps, (recorded) =>
      applyAudio(localUri, { uploaded_path: recorded.uploaded_path, uploaded_uri: recorded.uploaded_uri, bytes: recorded.bytes }),
    );
    if (!synced.ok) {
      if (isCurrent()) setTranscribeState("failed");
      return;
    }
    const uploaded = { uploaded_path: synced.item.uploaded_path, uploaded_uri: synced.item.uploaded_uri, bytes: synced.item.bytes };
    const token = session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token ?? "";
    const result = await transcribe({ webBaseUrl: flags.web_base_url, path, lang, accessToken: token });
    if (!isCurrent()) return; // a newer recording replaced this one while we waited
    if (!result.ok) {
      applyAudio(localUri, uploaded);
      setTranscribeState("failed");
      return;
    }
    applyAudio(localUri, { ...uploaded, transcript: result.data.text, segments: result.data.segments, selected: [] });
    setTranscribeState("idle");
  };

  const onRecorded = async (uri: string, durationMs: number) => {
    if (!draft || !canEdit(draft)) return;
    const draftId = draft.draft_id;
    const local = await persistDraftAudio(draftId, uri);
    const fresh = (prev: DraftAudio | null | undefined): DraftAudio => ({
      local_uri: local,
      duration_ms: durationMs,
      consent: false,
      uploaded_path: prev?.uploaded_path,
      uploaded_uri: prev?.uploaded_uri,
    });
    currentAudio.current = local;
    setDraft((current) => {
      if (!current || current.draft_id !== draftId) return current;
      const next = editDraft(current, { audio: fresh(current.audio) });
      if (!next) return current;
      writer.current?.schedule(next);
      return next;
    });
    setDirty(true);
    setTranscribeState("idle");
    void runTranscription({ ...draft, audio: fresh(draft.audio) });
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
    // The server reports problems inside the ideas list on `ideas` with {rule, index, key}; the index
    // points into the frozen payload, whose rows map back through the (unchanged) draft.
    const itemIndex = typeof result.details?.index === "number" ? (result.details.index as number) : null;
    const rowId =
      result.field === "ideas" && itemIndex !== null && result.draft.type === "ideas"
        ? ideasPayload(result.draft.fields.ideas, result.draft.fields.picked_id).rowIds[itemIndex] ?? null
        : null;
    const fieldLabel = rowId
      ? t(result.details?.key === "who" ? "capture.ideas.who" : "capture.ideas.text")
      : result.field
        ? t(FIELD_LABEL_KEYS[result.field] ?? "ui.note")
        : "";
    const message = errorCopy(lang, result, { field: fieldLabel, n: bundle?.round?.number ?? "" });
    const errorKey = rowId ? `ideas.${rowId}.${result.details?.key === "who" ? "who" : "text"}` : result.field;
    if (errorKey) {
      setErrors({ [errorKey]: message });
      inputs.current[errorKey]?.focus();
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
      // Idea items are validated as a list; map item issues back to their row (blank rows were dropped).
      const rowIds = draft.type === "ideas" ? ideasPayload(draft.fields.ideas, draft.fields.picked_id).rowIds : [];
      let firstKey: string | null = null;
      for (const issue of check.issues) {
        let key: string = issue.field;
        let message: string;
        if (issue.field === "ideas" && issue.index !== undefined && rowIds[issue.index]) {
          key = `ideas.${rowIds[issue.index]}.${issue.key === "who" ? "who" : "text"}`;
          const label = t(issue.key === "who" ? "capture.ideas.who" : "capture.ideas.text");
          message = errorCopy(lang, { code: issue.code, category: "validation", field: label, details: issue.rule ? { rule: issue.rule } : {} });
        } else if (issue.field === "ideas") {
          message = t("capture.ideas.need_more");
        } else if (issue.field === "picked") {
          message = t("capture.ideas.need_pick");
        } else {
          const label = t(FIELD_LABEL_KEYS[issue.field] ?? "ui.note");
          message = errorCopy(lang, { code: issue.code, category: "validation", field: label, details: issue.rule ? { rule: issue.rule } : {} });
        }
        if (next[key]) continue;
        next[key] = message;
        firstKey = firstKey ?? key;
      }
      setErrors(next);
      if (firstKey && inputs.current[firstKey]) inputs.current[firstKey]?.focus();
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
    if (userId && draft && shouldDiscardOnClose(draft, { createdInSession: createdHere.current, dirty })) {
      void roundDrafts.remove(userId, draft.draft_id).catch(() => {});
    }
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
      <RoundShell dock={<ShiftKey label={t("receipt.back")} icon="back" onPress={close} />}>
        <Banner tone="warning" text={t("error.entry_not_found")} />
      </RoundShell>
    );
  }

  // ---- Receipt ----
  if (receipt) {
    const sentType = sent?.type ?? null;
    const sentFields = sent?.fields ?? {};
    const m = sentType ? missionForType(receipt.missions, sentType) : null;
    const sentPart = m && sentType ? m.parts.find((p) => p.type === sentType) ?? null : null;
    const sentRound = bundle?.round ?? null;
    const postDay = sentRound ? currentDay(sentRound, Date.now()) : 0;
    // Free logs have no mission: the Daily Show shows the habit (days with a log).
    const dailyStep = sentType === "daily" ? stepsModel(receipt.missions, { lang, day: postDay }).find((x) => x.kind === "daily") ?? null : null;
    // D7: formatted text for Discord #progress from exactly what was sent (no photos or audio).
    const postText = sentType
      ? progressPost({
          lang,
          type: sentType,
          payload: sent?.attempt?.frozen_payload ?? sentFields,
          roundNumber: sentRound?.number ?? null,
          day: postDay >= 1 && sentRound && postDay <= sentRound.duration_days ? postDay : null,
          progress: sentPart ? { have: sentPart.have, need: sentPart.need } : null,
        })
      : "";
    const plannedChange =
      typeof sentFields.planned_change === "string" && sentFields.planned_change.trim() && (sentType === "interview" || sentType === "tester");
    return (
      <RoundShell dock={<ShiftKey label={t("receipt.back")} icon="house" onPress={() => router.replace("/(tabs)/shift")} />}>
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
              : sentType === "daily" && dailyStep
                ? (
                    <RText variant="title" latin={false}>
                      {`${dailyStep.title} · ${dailyStep.trailing}`}
                    </RText>
                  )
                : sentType === "contact"
                  ? (
                      <RText variant="title" latin={false}>
                        {t("home.people", { n: receipt.missions.people_talked_to })}
                      </RText>
                    )
                  : null}
            {receipt.newly_completed.map((key) => (
              <RText key={key} variant="h3" color={Status.success}>
                {t("receipt.mission_complete", { n: missionNumber(receipt.missions, key) ?? "" })}
              </RText>
            ))}
          </Card>
        </Animated.View>
        {postText ? <ProgressCopyButton text={postText} label={t("receipt.copy_progress")} copiedLabel={t("receipt.copied")} /> : null}
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
        {pickerTypes(bundle?.missions).map((ty) => {
          const m = missionForType(bundle?.missions, ty);
          return (
            <Pressable
              key={ty}
              accessibilityRole="button"
              onPress={() => restart({ type: ty, draftId: undefined, sourceId: undefined, replaces: undefined, what: undefined })}
              style={({ pressed }) => [styles.typeRow, pressed && { backgroundColor: Violet[50] }]}
            >
              {m ? <Tag label={t("mission.tag", { n: m.n })} /> : null}
              <View style={{ flex: 1 }}>
                <RText variant="label">{t(typeKey(ty))}</RText>
                <RText variant="meta">{missionTitle(lang, m)}</RText>
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
            <Image source={{ uri: resolveDraftUri(draft.draft_id, draft.photo.local_uri) }} style={styles.thumb} accessibilityIgnoresInvertColors />
            <TextButton
              label={t("ui.photo.remove")}
              icon="trash"
              disabled={ro}
              onPress={() => {
                if (draft.photo?.uploaded_path) void removeUploaded(draft.photo.uploaded_path);
                update({ photo: null });
              }}
            />
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
    case "ideas": {
      const rows = ideaRows(fields.ideas);
      const pickedId = typeof fields.picked_id === "string" ? fields.picked_id : null;
      // Row errors are keyed `ideas.<rowId>.<text|who>` so only the field at fault is outlined.
      const rowErrors: Record<string, { key: "text" | "who"; message: string }> = {};
      for (const [k, v] of Object.entries(errors)) {
        const m = k.match(/^ideas\.(.+)\.(text|who)$/);
        if (m && v) rowErrors[m[1]] = { key: m[2] as "text" | "who", message: v };
      }
      const clearRow = (id: string) => setErrors((e) => ({ ...e, [`ideas.${id}.text`]: "", [`ideas.${id}.who`]: "", ideas: "" }));
      body = (
        <IdeasComposer
          rows={rows}
          pickedId={pickedId}
          reachable={fields.reachable === true}
          rowErrors={rowErrors}
          listError={err("ideas")}
          pickError={err("picked")}
          readOnly={ro}
          t={t}
          onChangeRow={(id, patch) => {
            update({ fields: { ideas: updateIdeaRow(rows, id, patch) } });
            clearRow(id);
          }}
          onPick={(id) => {
            setField("picked_id", id);
            setErrors((e) => ({ ...e, picked: "" }));
          }}
          onAdd={() => setField("ideas", addIdeaRow(rows))}
          onRemove={(id) => {
            update({ fields: { ideas: removeIdeaRow(rows, id), ...(pickedId === id ? { picked_id: null } : {}) } });
            clearRow(id);
          }}
          onReachable={(v) => setField("reachable", v)}
          inputRef={ref}
        />
      );
      optional = (
        <>
          <Field label={t("ui.note")} error={err("note")}>
            <RTextInput value={str("note")} editable={!ro} onChangeText={(v) => setField("note", v)} maxLength={280} accessibilityLabel={t("ui.note")} />
          </Field>
          {photoField}
        </>
      );
      break;
    }
    case "daily":
      body = <DailyComposer fields={fields} errors={errors} readOnly={ro} t={t} onChange={(k, v) => setField(k, v)} inputRef={ref} />;
      optional = (
        <>
          {linkField}
          {photoField}
        </>
      );
      break;
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
              audio={draft.audio ? { ...draft.audio, local_uri: resolveDraftUri(draft.draft_id, draft.audio.local_uri) } : null}
              disabled={ro}
              onRecorded={(uri, ms) => void onRecorded(uri, ms)}
              onRemove={() => {
                if (draft.audio?.uploaded_path) void removeUploaded(draft.audio.uploaded_path);
                currentAudio.current = null;
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
        <ProblemComposer fields={fields} errors={errors} readOnly={ro} t={t} onChange={(k, v) => setField(k, v)} inputRef={ref} />
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
      <ShiftKey
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
        <Tag label={mission ? `${t("mission.tag", { n: mission.n })} · ${partLabel}` : t(typeKey(draft.type))} />
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
  source: { borderRadius: 14, borderWidth: 1.5, borderColor: "#D4D2E2", backgroundColor: "#FFFFFF", padding: 12, minHeight: 48 },
  sourceOn: { backgroundColor: Violet[600], borderColor: Violet[600] },
});
