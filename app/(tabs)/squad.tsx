import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ink, Status, Violet } from "../../lib/theme";
import { errorOf, roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { useRoundHome, useRoundLang, useRoundSquad, useRoundUser } from "../../lib/round/hooks";
import { roundKeys } from "../../lib/round/queryCore";
import { feedLine } from "../../lib/round/squadCopy";
import { formatDate, formatTime } from "../../lib/round/time";
import type { RoundError, SquadBundle } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { Banner, Card, RTextInput, Tag, TextButton } from "../../components/round/primitives";
import { ListSkeleton } from "../../components/round/Skeleton";
import { Avatar } from "../../components/round/SquadCard";
import { Icon } from "../../components/round/Icons";

const TAB_BAR_SPACE = 64;

export default function SquadScreen() {
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const entry = home.data?.bundle.entry ?? null;
  const round = home.data?.bundle.round ?? null;
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

  if (!entry) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE}>
        <RText variant="display" accessibilityRole="header">
          {t("squad.title")}
        </RText>
        {home.isPending ? <ListSkeleton rows={3} /> : <Banner tone="violet" text={t("squad.not_in_round")} />}
      </RoundShell>
    );
  }

  if (squadQuery.isPending) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE}>
        <RText variant="display">{t("squad.title")}</RText>
        <ListSkeleton rows={4} />
      </RoundShell>
    );
  }

  if (squadQuery.isError || !bundle) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE} dock={<PillowButton label={t("ui.retry")} icon="chevron" onPress={() => void squadQuery.refetch()} />}>
        <RText variant="display">{t("squad.title")}</RText>
        <Banner tone="warning" text={errorCopy(lang, errorOf(squadQuery.error))} />
      </RoundShell>
    );
  }

  if (bundle.state !== "assigned" || !bundle.squad) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE} refreshing={squadQuery.isRefetching} onRefresh={() => void squadQuery.refetch()}>
        <RText variant="display" accessibilityRole="header">
          {t("squad.title")}
        </RText>
        <Card style={{ gap: 8 }}>
          <RText variant="body">{bundle.state === "none" ? t("squad.not_in_round") : t("squad.waiting")}</RText>
          <RText variant="meta">{t("squad.icebreaker.live")}</RText>
        </Card>
      </RoundShell>
    );
  }

  const squad = bundle.squad;
  const discord = squad.discord_url ?? round?.discord_url ?? null;
  const question = me ? (lang === "en" ? me.question.en : me.question.th) : "";

  return (
    <RoundShell
      bottomInset={TAB_BAR_SPACE}
      refreshing={squadQuery.isRefetching}
      onRefresh={() => void squadQuery.refetch()}
      keyboard
      dock={discord ? <PillowButton label={t("squad.discord")} icon="people" onPress={() => void Linking.openURL(discord)} /> : undefined}
    >
      <Tag label={t("squad.title")} />
      <RText variant="display" accessibilityRole="header">
        {squad.name}
      </RText>
      {squadQuery.data?.fromCache ? <Banner tone="violet" text={t("home.offline")} /> : null}
      {closed ? <Banner tone="violet" text={t("squad.closed")} /> : null}

      <Card style={{ gap: 12 }}>
        <RText variant="label">{t("squad.icebreaker.title")}</RText>
        {bundle.members.map((m, idx) => (
          <View key={m.entry_id} style={styles.member}>
            <Avatar label={m.handle} index={idx} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <RText variant="label">{m.handle}</RText>
              <RText variant="meta">{lang === "en" ? m.question.en : m.question.th}</RText>
              {m.answer ? <RText variant="body" color={Ink.primary}>{m.answer}</RText> : null}
              <RText variant="meta" latin={false}>
                {t("home.missions_done", { n: m.missions_complete })}
              </RText>
            </View>
          </View>
        ))}
        {squad.mentor?.display_name ? (
          <View style={styles.member}>
            <Avatar label={lang === "th" ? "พี่" : "M"} mentor size={40} />
            <View style={{ flex: 1 }}>
              <RText variant="label">{squad.mentor.display_name}</RText>
              <RText variant="meta">{t("squad.mentor")}</RText>
            </View>
          </View>
        ) : null}
      </Card>

      {me && !closed ? (
        <Card style={{ gap: 8 }}>
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
          <View style={{ alignItems: "flex-end" }}>
            <TextButton
              label={t("ui.save")}
              disabled={!answer.trim() || answer.trim() === (me.answer ?? "") || saveAnswer.isPending}
              onPress={() => saveAnswer.mutate(answer.trim())}
            />
          </View>
          <RText variant="meta">{t("squad.icebreaker.live")}</RText>
        </Card>
      ) : null}

      <View style={{ gap: 8 }}>
        <RText variant="label">{t("squad.feed.title")}</RText>
        {bundle.feed.length === 0 ? <RText variant="body">{t("squad.feed.empty")}</RText> : null}
        {bundle.feed.map((item, i) => {
          const mine = item.entry_id === entry.id;
          const canCheer = !mine && !closed && !item.cheered_by_me && !!item.evidence_id;
          return (
            <View key={`${item.evidence_id ?? "m"}-${item.at}-${i}`} style={styles.feedRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <RText variant="body" color={Ink.primary}>
                  {feedLine(lang, item)}
                </RText>
                <RText variant="meta">
                  {formatDate(item.at, lang)} {formatTime(item.at)}
                  {item.cheers ? ` · ${t("squad.cheer.count", { n: item.cheers })}` : ""}
                </RText>
              </View>
              {!mine ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.cheered_by_me ? t("squad.cheer.sent") : t("squad.cheer")}
                  accessibilityState={{ disabled: !canCheer, selected: item.cheered_by_me }}
                  disabled={!canCheer}
                  onPress={() => cheer.mutate({ to: item.entry_id, evidenceId: item.evidence_id })}
                  style={[styles.cheer, item.cheered_by_me && { backgroundColor: Violet[600] }]}
                >
                  <Icon name="heart" size={20} color={item.cheered_by_me ? "#FFFFFF" : Violet[700]} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {cheer.isError ? <Banner tone="warning" text={errorCopy(lang, cheer.error as unknown as RoundError)} /> : null}
      </View>
      <TextButton label={t("receipt.back")} icon="back" onPress={() => router.navigate("/(tabs)/shift")} />
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
  },
  cheer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Violet[50], alignItems: "center", justifyContent: "center" },
});
