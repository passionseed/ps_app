import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, StyleSheet, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppText } from "../../components/AppText";
import { CompanionButton, CompanionField, CompanionLoadState, CompanionScreen, LangSwitch, TextAction, companionMessage, isNetworkError, useCompanionLang } from "../../components/shift/CompanionUI";
import { DailyPhoto, DailyUpdateDetail } from "../../components/shift/DailyUpdateDetail";
import { useShiftCompanion } from "../../lib/hooks/useShiftCompanion";
import { queryKeys } from "../../lib/queryClient";
import { rememberActiveComposer, rememberCompanionResume } from "../../lib/shiftCompanionRecovery";
import { shiftStorage } from "../../lib/shiftStorage";
import { Accent, Text } from "../../lib/theme";
import { isIsoDate } from "../../lib/shiftCompanionRules";
import { bangkokClock, draftKey, formatBangkokDate, saveDailyUpdate, requiresCompanionSignIn, uploadDailyImage, validateDailyBody, type CompanionCohort, type DailyUpdate } from "../../lib/shiftCompanion";
import { DailyDraftWriter, editDailyDraft, makeDailyDraft, olderDraftDates, parseDailyDraft, receiptMatches, type DailyDraft } from "../../lib/shiftCompanionDrafts";

export default function ShiftUpdate() {
  const data = useShiftCompanion(true);
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { copy } = useCompanionLang();
  if (!data.cohort) return <CompanionScreen>
    <TextAction label={copy.back} onPress={() => router.replace("/shift/today")} />
    <CompanionLoadState loading={data.loading} error={data.error} onRetry={() => void data.reload()} />
    {!data.loading && !data.error ? <CompanionButton label={copy.connectTitle} onPress={() => router.replace("/shift/link")} /> : null}
  </CompanionScreen>;
  return <Composer key={`${data.userId}:${data.cohort.id}:${date ?? "current"}`} userId={data.userId} cohort={data.cohort}
    server={data.today?.mine} serverLoaded={!!data.today} requestedDate={date} offline={data.offline || !!data.error} />;
}

function Composer({ userId, cohort, server, serverLoaded, requestedDate, offline }: {
  userId: string; cohort: CompanionCohort; server?: DailyUpdate | null; serverLoaded: boolean; requestedDate?: string; offline: boolean;
}) {
  const { lang, setLang, copy } = useCompanionLang();
  const client = useQueryClient();
  // A composer keeps the date it opened with, even through midnight/refetches.
  const [date] = useState(() => requestedDate && isIsoDate(requestedDate) ? requestedDate : bangkokClock().date);
  const [draft, setDraft] = useState<DailyDraft | null>(null);
  const [localState, setLocalState] = useState<"saving" | "saved" | "failed" | "idle">("idle");
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showLearned, setShowLearned] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [conflict, setConflict] = useState<DailyUpdate | null>(null);
  const [older, setOlder] = useState<string[]>([]);
  const triedRef = useRef<TextInput>(null);
  const learnedRef = useRef<TextInput>(null);
  const helpRef = useRef<TextInput>(null);
  const linkRef = useRef<TextInput>(null);
  const alive = useRef(true);
  const sendingLock = useRef(false);
  const editVersion = useRef(0);
  const initialServer = useRef(server);
  const writer = useRef<DailyDraftWriter | null>(null);
  const draftRef = useRef<DailyDraft | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    alive.current = true;
    void rememberActiveComposer(userId, { cohortId: cohort.id, date });
    writer.current = new DailyDraftWriter(draftKey(userId, cohort.id, date), state => { if (alive.current) setLocalState(state); });
    let cancelled = false;
    void (async () => {
      let restored: DailyDraft | null = null;
      try { restored = parseDailyDraft(await shiftStorage.getItem(draftKey(userId, cohort.id, date)), date); }
      catch { if (!cancelled) setLocalState("failed"); }
      if (cancelled) return;
      const initial = restored ?? makeDailyDraft(date, initialServer.current?.update_date === date ? initialServer.current : null);
      setDraft(initial); setShowLearned(!!initial.learned); setShowHelp(!!initial.help); setShowExtra(!!initial.link || !!initial.imagePath);
      if (restored) setLocalState("saved");
      setOlder(await olderDraftDates(userId, cohort.id, date).catch(() => []));
    })();
    const appState = AppState.addEventListener("change", state => { if (state !== "active") void writer.current?.flush().catch(() => {}); });
    const flush = () => { void writer.current?.flush().catch(() => {}); };
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("pagehide", flush);
    return () => { cancelled = true; alive.current = false; writer.current?.dispose(); appState.remove();
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") window.removeEventListener("pagehide", flush); };
  }, [userId, cohort.id, date]);

  // A late server response can seed an untouched blank editor, never replace local work.
  useEffect(() => {
    if (!draft || !serverLoaded || !server || server.update_date !== date || draft.expectedRevision === server.revision || editVersion.current || localState !== "idle") return;
    const initial = makeDailyDraft(date, server);
    setDraft(initial); setShowLearned(!!initial.learned); setShowHelp(!!initial.help); setShowExtra(!!initial.link || !!initial.imagePath);
  }, [server, serverLoaded, draft, date, localState]);

  const patch = (changes: Partial<DailyDraft>) => {
    if (!draftRef.current || sendingLock.current) return;
    const next = editDailyDraft(draftRef.current, changes);
    draftRef.current = next; editVersion.current++; setDraft(next); writer.current?.schedule(next); setError(null); setInvalidField(null);
  };
  const save = useMutation({ mutationFn: async (next: DailyDraft) => {
    await writer.current?.flush().catch(() => {});
    return saveDailyUpdate({ cohortId: cohort.id, updateDate: next.date, expectedRevision: next.expectedRevision,
      idempotencyKey: next.idempotencyKey, tried: next.tried, learned: next.learned, help: next.help, link: next.link, imagePath: next.imagePath });
  }, retry: false });
  const send = async (next = draftRef.current) => {
    if (!next || sendingLock.current || photoBusy || photoAsset || conflict) return;
    const invalid = validateDailyBody(next);
    if (invalid) {
      setError(companionMessage(copy, invalid)); setInvalidField(invalid.split("_")[0]);
      (invalid === "link" ? linkRef : invalid === "learned_length" ? learnedRef : invalid === "help_length" ? helpRef : triedRef).current?.focus();
      return;
    }
    sendingLock.current = true; setError(null); setAuthExpired(false);
    // Persist the exact request and retry key before attempting delivery.
    writer.current?.schedule(next);
    try {
      const result = await save.mutateAsync(next);
      if (!alive.current) return;
      if (!result.ok) {
        if (result.error === "conflict" && result.server) setConflict(result.server);
        else { setError(companionMessage(copy, result.error)); setAuthExpired(["verify_email", "not_linked"].includes(result.error)); }
        return;
      }
      if (!receiptMatches(next, result.update, userId)) { setError(copy.receiptMismatch); return; }
      await writer.current?.confirmReceipt().catch(() => {});
      // Clear/invalidate history as well as Today. Refetch errors cannot undo a receipt.
      const todayKey = queryKeys.shift.daily(userId, cohort.id);
      client.setQueryData(todayKey, (previous: any) => previous ? { ...previous, mine: result.update } : previous);
      void client.invalidateQueries({ queryKey: todayKey });
      void client.invalidateQueries({ queryKey: queryKeys.shift.dailyHistory(userId, cohort.id) });
      router.replace("/shift/today");
    } catch (value) {
      if (alive.current) {
        const expired = requiresCompanionSignIn(value);
        setAuthExpired(expired);
        setError(expired ? copy.authExpired : isNetworkError(value) ? copy.offline : copy.sendFailed);
      }
    } finally { sendingLock.current = false; }
  };
  const upload = async (asset: ImagePicker.ImagePickerAsset) => {
    setPhotoBusy(true); setPhotoError(null);
    try {
      const path = await uploadDailyImage(cohort.id, userId, asset.uri, asset.mimeType ?? "image/jpeg");
      if (!alive.current) return;
      patch({ imagePath: path }); setPhotoAsset(null);
    } catch (value) { if (alive.current) setPhotoError(companionMessage(copy, value instanceof Error && ["image_size", "image_type"].includes(value.message) ? value.message : "image")); }
    finally { if (alive.current) setPhotoBusy(false); }
  };
  const pickPhoto = async () => {
    if (photoBusy || sendingLock.current) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
      if (result.canceled || !alive.current) return;
      setPhotoAsset(result.assets[0]); setShowExtra(true); await upload(result.assets[0]);
    } catch { setPhotoError(copy.photoFailed); }
  };
  if (!draft) return <CompanionScreen><CompanionLoadState loading error={null} onRetry={() => {}} /></CompanionScreen>;
  const busy = save.isPending;
  const localLabel = localState === "saving" ? copy.saving : localState === "failed" ? copy.saveFailed : localState === "saved" ? copy.saved : "";
  const originalDate = date !== bangkokClock().date;
  return <CompanionScreen footer={<View style={styles.footer}>
    <AppText accessibilityLiveRegion="polite" style={styles.secondary}>{busy ? copy.sending : localLabel}</AppText>
    <CompanionButton label={copy.send} disabled={busy || photoBusy || !!photoAsset || !!conflict} onPress={() => void send()} />
  </View>}>
    <View style={styles.header}><TextAction label={copy.back} onPress={() => router.replace("/shift/today")} /><LangSwitch lang={lang} onChange={setLang} /></View>
    <AppText variant="bold" accessibilityRole="header" style={styles.title}>{copy.todayUpdate}</AppText>
    <AppText style={styles.secondary}>{formatBangkokDate(date, lang)} · {cohort.name}</AppText>
    {offline ? <AppText style={styles.notice}>{copy.offline}</AppText> : null}
    {originalDate ? <View style={styles.section}>
      <AppText style={styles.secondary}>{copy.oldDraft} {formatBangkokDate(date, lang)}. {copy.oldDraftHelp}</AppText>
      <TextAction label={copy.moveDraft} onPress={() => Alert.alert(copy.moveDraft, copy.copyDraftHelp, [
        { text: copy.cancel, style: "cancel" }, { text: copy.moveDraft, onPress: () => {
          const currentDate = bangkokClock().date;
          void shiftStorage.getItem(draftKey(userId, cohort.id, currentDate)).then(existing => {
            if (existing) { setError(copy.conflictTitle); return; }
            const copied = makeDailyDraft(currentDate);
            Object.assign(copied, { tried: draft.tried, learned: draft.learned, help: draft.help, link: draft.link, imagePath: draft.imagePath });
            return shiftStorage.setItem(draftKey(userId, cohort.id, currentDate), JSON.stringify(copied)).then(() => router.replace({ pathname: "/shift/update", params: { date: currentDate } }));
          }).catch(() => setError(copy.saveFailed));
        } },
      ])} />
    </View> : null}
    {older.slice(0, 5).map(olderDate => <TextAction key={olderDate} label={`${copy.recoverDraft} · ${formatBangkokDate(olderDate, lang)}`} onPress={() => router.replace({ pathname: "/shift/update", params: { date: olderDate } })} />)}
    <View style={styles.section}><CompanionField ref={triedRef} label={copy.prompt} value={draft.tried} onChangeText={tried => patch({ tried })}
      placeholder={copy.encouragement} multiline editable={!busy} error={invalidField === "tried" ? error : null} />
      {draft.tried.length >= 1800 ? <AppText style={styles.secondary}>{2000 - draft.tried.length} {copy.charsLeft}</AppText> : null}
    </View>
    {!showLearned ? <TextAction label={copy.addLearned} onPress={() => setShowLearned(true)} /> : <View style={styles.section}>
      <CompanionField ref={learnedRef} error={invalidField === "learned" ? error : null} label={copy.learned} value={draft.learned} onChangeText={learned => patch({ learned })} multiline editable={!busy} />
      {draft.learned.length >= 800 ? <AppText style={styles.secondary}>{1000 - draft.learned.length} {copy.charsLeft}</AppText> : null}
    </View>}
    {!showHelp ? <TextAction label={copy.addHelp} onPress={() => setShowHelp(true)} /> : <View style={styles.section}>
      <CompanionField ref={helpRef} error={invalidField === "help" ? error : null} label={copy.help} value={draft.help} onChangeText={help => patch({ help })} multiline editable={!busy} />
      {draft.help.length >= 800 ? <AppText style={styles.secondary}>{1000 - draft.help.length} {copy.charsLeft}</AppText> : null}
    </View>}
    {!showExtra ? <TextAction label={copy.addAttachment} onPress={() => setShowExtra(true)} /> : <View style={styles.section}>
      <CompanionField ref={linkRef} error={invalidField === "link" ? error : null} label={copy.linkLabel} value={draft.link} onChangeText={link => patch({ link })} placeholder={copy.linkPlaceholder} keyboardType="url" autoCapitalize="none" editable={!busy} />
      {draft.imagePath ? <DailyPhoto path={draft.imagePath} /> : null}
      <TextAction label={photoBusy ? copy.photoUploading : draft.imagePath || photoAsset ? copy.replacePhoto : copy.addPhoto} onPress={() => void pickPhoto()} />
      {photoError ? <AppText accessibilityRole="alert" style={styles.error}>{photoError}</AppText> : null}
      {photoAsset && !photoBusy ? <TextAction label={copy.retry} onPress={() => void upload(photoAsset)} /> : null}
      {(draft.imagePath || photoAsset) && !photoBusy ? <TextAction label={copy.removePhoto} onPress={() => { setPhotoAsset(null); setPhotoError(null); patch({ imagePath: null }); }} /> : null}
    </View>}
    <AppText style={styles.notice}>{copy.audience}</AppText>
    {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
    {authExpired ? <TextAction label={copy.resumeSignIn} onPress={() => {
      void writer.current?.flush().catch(() => {});
      void rememberCompanionResume(userId, { cohortId: cohort.id, date }).then(() =>
        router.push("/shift/sign-in")
      ).catch(() => setError(copy.saveFailed));
    }} /> : null}
    {conflict ? <View style={styles.section}>
      <AppText variant="bold" accessibilityRole="header" style={styles.subtitle}>{copy.conflictTitle}</AppText>
      <AppText style={styles.secondary}>{copy.conflictHelp}</AppText>
      <AppText variant="bold" style={styles.body}>{copy.onDevice}</AppText>
      <DailyUpdateDetail update={{ ...conflict, ...draft, image_path: draft.imagePath }} />
      <AppText variant="bold" style={styles.body}>{copy.onServer}</AppText><DailyUpdateDetail update={conflict} />
      <CompanionButton label={copy.keepMine} disabled={busy} onPress={() => { patch({ expectedRevision: conflict.revision }); setConflict(null); }} />
      <TextAction label={copy.useSaved} onPress={() => { patch({ tried: conflict.tried, learned: conflict.learned ?? "", help: conflict.help ?? "", link: conflict.link ?? "", imagePath: conflict.image_path, expectedRevision: conflict.revision }); setConflict(null); }} />
    </View> : null}
  </CompanionScreen>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: Text.primary, fontSize: 24, marginTop: 16, marginBottom: 8 }, subtitle: { color: Text.primary, fontSize: 18 },
  secondary: { color: Text.secondary, fontSize: 16, lineHeight: 24 }, body: { color: Text.primary, fontSize: 16 },
  section: { marginTop: 24, gap: 12 }, notice: { color: Text.secondary, fontSize: 16, lineHeight: 24, marginVertical: 20 },
  error: { color: Accent.errorStrong, fontSize: 16, marginVertical: 12 }, footer: { gap: 12 } });
