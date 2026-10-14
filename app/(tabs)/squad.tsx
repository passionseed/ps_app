import React, { useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Depth, Glass, Ink, Status, Violet } from "../../lib/theme";
import { errorOf, roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { useRoundHome, useRoundLang, useRoundSquad, useRoundUser } from "../../lib/round/hooks";
import { roundKeys } from "../../lib/round/queryCore";
import { feedLine } from "../../lib/round/squadCopy";
import { formatDate, formatTime } from "../../lib/round/time";
import type { RoundError, SquadBundle } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { Key, ShiftKey } from "../../components/round/Key";
import { Banner, RTextInput, Tag, TextButton } from "../../components/round/primitives";
import { ListSkeleton } from "../../components/round/Skeleton";
import { AvatarGem, AvatarStack } from "../../components/round/AvatarStack";
import { GemIcon } from "../../components/round/GemIcon";
import { GlassCard } from "../../components/round/GlassCard";
import { HeroCard } from "../../components/round/HeroCard";
import { Icon } from "../../components/round/Icons";
import { StepChip } from "../../components/round/StepChip";

const TAB_BAR_SPACE = 64;

/**
 * Cheer: a small round key with a heart. Sending latches it down and lights it violet for good
 * (a one-way toggle), so "sent" reads by position and colour, plus the label.
 */
function CheerButton({ sent, disabled, label, onPress }: { sent: boolean; disabled: boolean; label: string; onPress: () => void }) {
  return <Key round size="sm" tone={sent ? "shift" : "porcelain"} icon="heart" label={label} down={sent} disabled={disabled} onPress={onPress} />;
}

/** Empty / waiting state: a hero with a people gem and one line. */
function SquadNotice({ title, body, note, action }: { title: string; body: string; note?: string; action?: React.ReactNode }) {
  return (
    <HeroCard>
      <View style={styles.notice}>
        <GemIcon icon="people" size={52} />
        <RText variant="h3" style={styles.center}>
          {title}
        </RText>
        <RText variant="body" style={styles.center}>
          {body}
        </RText>
        {note ? (
          <RText variant="meta" style={styles.center}>
            {note}
          </RText>
        ) : null}
        {action}
      </View>
    </HeroCard>
  );
}

export default function SquadScreen() {
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const entry = home.data?.bundle.entry ?? null;
  const round = home.data?.bundle.round ?? null;
  const counts = home.data?.bundle.missions ?? null;
  const squadQuery = useRoundSquad(entry?.id ?? null);
  const queryClient = useQueryClient();
  const squadKey = roundKeys.squad(userId, entry?.id ?? null);

  const bundle = squadQuery.data?.bundle ?? null;
  const me = bundle?.members.find((m) => m.is_me) ?? null;
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string | null>(null);
  useEffect(() => {
    if (me?.answer) setAnswer(me.answer);
  }, [me?.answer]);

  const closed = !!round && (round.phase === "review" || round.phase === "finished");

  const saveAnswer = useMutation({
    mutationFn: async (text: string) => {
      const result = await roundApi.setIcebreaker(entry!.id, text);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      setAnswerError(null);
      void queryClient.invalidateQueries({ queryKey: squadKey });
    },
    onError: (e) => setAnswerError(errorCopy(lang, e as unknown as RoundError)),
  });

  const cheer = useMutation({
    mutationFn: async (input: { to: string; evidenceId: string | null }) => {
      const result = await roundApi.sendCheer(entry!.id, input.to, input.evidenceId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: squadKey });
      const previous = queryClient.getQueryData<{ bundle: SquadBundle }>(squadKey);
      if (previous && input.evidenceId) {
        queryClient.setQueryData(squadKey, {
          ...previous,
          bundle: {
            ...previous.bundle,
            feed: previous.bundle.feed.map((f) =>
              f.evidence_id === input.evidenceId ? { ...f, cheered_by_me: true, cheers: f.cheers + 1 } : f,
            ),
          },
        });
      }
      return { previous };
    },
    onError: (_e, _input, context) => {
      if (context?.previous) queryClient.setQueryData(squadKey, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: squadKey }),
  });

  const header = (
    <>
      <Tag label={t("squad.title")} />
    </>
  );

  if (!entry) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE}>
        {header}
        <RText variant="display" accessibilityRole="header">
          {t("squad.title")}
        </RText>
        {home.isPending ? (
          <ListSkeleton rows={3} />
        ) : (
          <SquadNotice
            title={t("squad.title")}
            body={t("squad.not_in_round")}
            action={<TextButton label={t("ui.profile.none_cta")} icon="arrow" onPress={() => router.navigate("/(tabs)/shift")} />}
          />
        )}
      </RoundShell>
    );
  }

  if (squadQuery.isPending) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE}>
        {header}
        <RText variant="display">{t("squad.title")}</RText>
        <ListSkeleton rows={4} />
      </RoundShell>
    );
  }

  if (squadQuery.isError || !bundle) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE} dock={<ShiftKey label={t("ui.retry")} icon="chevron" onPress={() => void squadQuery.refetch()} />}>
        {header}
        <RText variant="display">{t("squad.title")}</RText>
        <Banner tone="warning" text={errorCopy(lang, errorOf(squadQuery.error))} />
      </RoundShell>
    );
  }

  if (bundle.state !== "assigned" || !bundle.squad) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE} refreshing={squadQuery.isRefetching} onRefresh={() => void squadQuery.refetch()}>
        {header}
        <RText variant="display" accessibilityRole="header">
          {t("squad.title")}
        </RText>
        <SquadNotice
          title={t("squad.title")}
          body={bundle.state === "none" ? t("squad.not_in_round") : t("squad.waiting")}
          note={t("squad.icebreaker.live")}
        />
      </RoundShell>
    );
  }

  const squad = bundle.squad;
  const discord = squad.discord_url ?? round?.discord_url ?? null;
  const question = me ? (lang === "en" ? me.question.en : me.question.th) : "";
  const mentorName = squad.mentor?.display_name ?? null;
  const mentorLabel = lang === "th" ? "พี่" : "M";
  const people = [
    ...bundle.members.map((m) => ({ label: m.handle })),
    ...(mentorName ? [{ label: mentorLabel, tone: "ink" as const }] : []),
  ];

  return (
    <RoundShell
      bottomInset={TAB_BAR_SPACE}
      refreshing={squadQuery.isRefetching}
      onRefresh={() => void squadQuery.refetch()}
      keyboard
      dock={discord ? <ShiftKey label={t("squad.discord")} icon="chat" onPress={() => void Linking.openURL(discord)} /> : undefined}
    >
      {header}
      <RText variant="display" accessibilityRole="header">
        {squad.name}
      </RText>
      {squadQuery.data?.fromCache ? <Banner tone="violet" text={t("home.offline")} /> : null}
      {closed ? <Banner tone="violet" text={t("squad.closed")} /> : null}

      <HeroCard watermark={String(bundle.members.length)} style={styles.hero}>
        <AvatarStack people={people} size={42} />
        <View style={styles.heroText}>
          <RText variant="label">
            {mentorName ? t("ui.squad.size", { n: bundle.members.length }) : t("ui.squad.size_no_mentor", { n: bundle.members.length })}
          </RText>
          {mentorName ? (
            <RText variant="meta" color={Ink.secondary}>
              {`${t("squad.mentor")} · ${mentorName}`}
            </RText>
          ) : null}
        </View>
      </HeroCard>

      <RText variant="label" style={styles.section} accessibilityRole="header">
        {t("squad.icebreaker.title")}
      </RText>
      <GlassCard padding={6}>
        {bundle.members.map((m, idx) => (
          <View key={m.entry_id} style={[styles.member, (idx < bundle.members.length - 1 || mentorName) && styles.divider]}>
            <AvatarGem label={m.handle} index={idx} size={40} />
            <View style={styles.memberText}>
              <RText variant="label">{m.handle}</RText>
              <RText variant="meta">{lang === "en" ? m.question.en : m.question.th}</RText>
              {m.answer ? (
                <RText variant="body" color={Ink.primary}>
                  {m.answer}
                </RText>
              ) : null}
              <StepChip label={t("ui.squad.member_missions", { n: m.missions_complete })} state={m.missions_complete > 0 ? "progress" : "todo"} />
            </View>
          </View>
        ))}
        {mentorName ? (
          <View style={styles.member}>
            <AvatarGem label={mentorLabel} tone="ink" size={40} />
            <View style={styles.memberText}>
              <RText variant="label">{mentorName}</RText>
              <RText variant="meta">{t("squad.mentor")}</RText>
            </View>
          </View>
        ) : null}
      </GlassCard>

      {me && !closed ? (
        <GlassCard style={styles.answerCard}>
          <RText variant="label">{t("squad.icebreaker.your_q")}</RText>
          <RText variant="body" color={Ink.primary}>
            {question}
          </RText>
          <RTextInput
            value={answer}
            onChangeText={(v) => setAnswer(v.replace(/\n/g, " ").slice(0, 140))}
            placeholder={t("squad.icebreaker.answer")}
            accessibilityLabel={t("squad.icebreaker.answer")}
            maxLength={140}
            returnKeyType="done"
            invalid={!!answerError}
          />
          {answerError ? (
            <RText variant="small" color={Status.error}>
              {answerError}
            </RText>
          ) : null}
          <View style={styles.answerFoot}>
            <RText variant="meta" style={{ flex: 1 }}>
              {t("squad.icebreaker.live")}
            </RText>
            <TextButton
              label={t("ui.save")}
              disabled={!answer.trim() || answer.trim() === (me.answer ?? "") || saveAnswer.isPending}
              onPress={() => saveAnswer.mutate(answer.trim())}
            />
          </View>
        </GlassCard>
      ) : null}

      <RText variant="label" style={styles.section} accessibilityRole="header">
        {t("squad.feed.title")}
      </RText>
      {bundle.feed.length === 0 ? (
        <GlassCard>
          <RText variant="body">{t("squad.feed.empty")}</RText>
        </GlassCard>
      ) : null}
      <View style={styles.feed}>
        {bundle.feed.map((item, i) => {
          const mine = item.entry_id === entry.id;
          const canCheer = !mine && !closed && !item.cheered_by_me && !!item.evidence_id;
          const memberIndex = Math.max(0, bundle.members.findIndex((m) => m.entry_id === item.entry_id));
          return (
            <View key={`${item.evidence_id ?? "m"}-${item.at}-${i}`} style={[styles.feedRow, Depth.row]}>
              <AvatarGem label={item.handle} index={memberIndex} size={34} ring={false} />
              <View style={styles.feedText}>
                <RText variant="body" color={Ink.primary}>
                  {feedLine(lang, item, counts)}
                </RText>
                <RText variant="meta">
                  {`${formatDate(item.at, lang)} ${formatTime(item.at)}`}
                  {item.cheers ? ` · ${t("squad.cheer.count", { n: item.cheers })}` : ""}
                </RText>
              </View>
              {!mine ? (
                <CheerButton
                  sent={item.cheered_by_me}
                  disabled={!canCheer}
                  label={item.cheered_by_me ? t("squad.cheer.sent") : t("squad.cheer")}
                  onPress={() => cheer.mutate({ to: item.entry_id, evidenceId: item.evidence_id })}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      {cheer.isError ? <Banner tone="warning" text={errorCopy(lang, cheer.error as unknown as RoundError)} /> : null}
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroText: { flex: 1, minWidth: 0, gap: 2 },
  section: { marginTop: 6, marginLeft: 4 },
  member: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 10 },
  memberText: { flex: 1, minWidth: 0, gap: 3 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E6E5F0" },
  answerCard: { gap: 10 },
  answerFoot: { flexDirection: "row", alignItems: "center", gap: 8 },
  feed: { gap: 8 },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Platform.OS === "android" ? Glass.fillAndroid : "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: Glass.border,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  feedText: { flex: 1, minWidth: 0, gap: 2 },
  notice: { alignItems: "center", gap: 10, paddingVertical: 8 },
  center: { textAlign: "center" },
});
