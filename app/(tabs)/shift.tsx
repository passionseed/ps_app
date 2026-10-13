import React, { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useAuth } from "../../lib/auth";
import { Ink, Violet } from "../../lib/theme";
import { roundApi, errorOf, needsSignIn } from "../../lib/round/api";
import { errorCopy, type CopyKey } from "../../lib/round/copy";
import {
  useInvalidateRound,
  useRoundDrafts,
  useRoundHome,
  useRoundLang,
  useRoundUser,
} from "../../lib/round/hooks";
import { missionDisplay, missionTitleKey, orderedMissions, typeKey } from "../../lib/round/missions";
import { homeState, lastHours, needsAttention, nextAction } from "../../lib/round/next";
import { feedLine } from "../../lib/round/squadCopy";
import { closeDisplay, countdown, dateTimeDisplay, formatCountdown, formatDate } from "../../lib/round/time";
import { shiftStorage } from "../../lib/shiftStorage";
import type { HomeBundle, Mission } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { Banner, Card, Tag, TextButton } from "../../components/round/primitives";
import { HomeSkeleton } from "../../components/round/Skeleton";
import { NextMissionCard } from "../../components/round/NextMissionCard";
import { MissionTrail, type TrailItem } from "../../components/round/MissionTrail";
import { SquadCard } from "../../components/round/SquadCard";
import { NeedsAttention } from "../../components/round/NeedsAttention";
import { DiscordFooter } from "../../components/round/DiscordFooter";

const TAB_BAR_SPACE = 64;

function trailItems(missions: Mission[], bundle: HomeBundle, currentKey: string | null, t: (k: CopyKey, p?: Record<string, string | number>) => string): TrailItem[] {
  return missions.map((m) => {
    const display = missionDisplay(m, bundle.evidence);
    const have = m.parts.reduce((s, p) => s + Math.min(p.have, p.need), 0);
    const need = m.parts.reduce((s, p) => s + p.need, 0);
    const stateLabel =
      display.state === "done"
        ? t("mission.done")
        : m.key === currentKey
          ? `${have}/${need}`
          : display.state === "not_yet"
            ? t("mission.not_yet")
            : display.state === "credit_removed"
              ? t("mission.needs_more", { n: display.n })
              : `${have}/${need}`;
    return {
      key: m.key,
      number: m.n,
      title: t(missionTitleKey(m.key)),
      stateLabel,
      state: m.complete ? "done" : m.key === currentKey ? "current" : "todo",
    };
  });
}

export default function ShiftHomeScreen() {
  const { userId, isGuest } = useRoundUser();
  const { exitGuestMode } = useAuth();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const drafts = useRoundDrafts();
  const invalidate = useInvalidateRound();
  const reduced = useReducedMotion();
  const [celebrate, setCelebrate] = useState(false);

  const bundle = home.data?.bundle ?? null;
  const certId = bundle?.certificate?.status === "issued" ? bundle.certificate.id : null;
  useEffect(() => {
    if (!certId || !userId) return;
    const key = `round:celebrated:${userId}:${certId}`;
    void shiftStorage.getItem(key).then((seen) => {
      if (!seen) {
        setCelebrate(true);
        void shiftStorage.setItem(key, "1");
      }
    });
  }, [certId, userId]);

  const waitlist = useMutation({
    mutationFn: async () => {
      const result = await roundApi.joinWaitlist();
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: () => void invalidate(),
  });

  const goSignIn = () => {
    if (isGuest) exitGuestMode();
    router.push("/sign-in");
  };

  if (isGuest || !userId) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE} dock={<PillowButton label={t("ui.sign_in")} icon="person" onPress={goSignIn} />}>
        <Tag label="SHIFT" />
        <RText variant="display" accessibilityRole="header">
          {t("home.guest")}
        </RText>
        <RText variant="body">{t("signin.hackathon")}</RText>
      </RoundShell>
    );
  }

  if (home.isPending) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE}>
        <HomeSkeleton />
      </RoundShell>
    );
  }

  if (home.isError || !bundle) {
    const error = errorOf(home.error);
    return (
      <RoundShell
        bottomInset={TAB_BAR_SPACE}
        dock={
          needsSignIn(error) ? (
            <PillowButton label={t("ui.sign_in")} icon="person" onPress={goSignIn} />
          ) : (
            <PillowButton label={t("ui.retry")} icon="chevron" onPress={() => void home.refetch()} busy={home.isFetching} />
          )
        }
      >
        <Tag label="SHIFT" />
        <Banner tone={error.category === "offline" ? "violet" : "warning"} text={errorCopy(lang, error)} />
      </RoundShell>
    );
  }

  const state = homeState(bundle);
  const round = bundle.round;
  const flags = bundle.flags;
  const title = round ? (lang === "en" ? round.title_en : round.title_th) : "";
  const brief = round ? (lang === "en" ? round.brief_en : round.brief_th) : "";
  const missions = orderedMissions(bundle.missions);
  const next = nextAction(bundle.missions, { voiceEnabled: flags.transcription_enabled });
  const attention = needsAttention(bundle, bundle.now);
  const discordUrl = round?.discord_url ?? null;
  const pendingDrafts = (drafts.data ?? []).filter((d) => d.entry_id === bundle.entry?.id);
  const closing = lastHours(bundle, 24);
  const emergency = flags.emergency_message;

  const header = round ? (
    <View style={{ gap: 8 }}>
      <View style={styles.kicker}>
        <Tag label={t("round.tag", { n: round.number })} />
        {round.phase === "active" || round.phase === "upcoming" ? (
          <RText variant="meta" color={closing ? Violet[700] : Ink.tertiary} weight={closing ? "700" : "500"}>
            {closing ? t("home.last_hours", closing) : t("home.closes", closeDisplay(round.closes_at, lang))}
          </RText>
        ) : null}
      </View>
      <RText variant="display" accessibilityRole="header">
        {title}
      </RText>
      {round.phase === "active" ? (
        <View style={styles.progress}>
          <RText variant="meta">{t("home.day", { d: Math.max(1, round.day), total: round.duration_days })}</RText>
          <View style={styles.track} accessibilityElementsHidden>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(4, (round.day / round.duration_days) * 100))}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  ) : null;

  const banners = (
    <>
      {emergency && (emergency.th || emergency.en) ? (
        <Banner
          tone="warning"
          text={(lang === "en" ? emergency.en : emergency.th) ?? emergency.th ?? emergency.en ?? ""}
          actionLabel={emergency.url ? t("ui.emergency.more") : undefined}
          onAction={emergency.url ? () => void Linking.openURL(emergency.url!) : undefined}
        />
      ) : null}
      {home.data?.fromCache ? <Banner tone="violet" text={t("home.offline")} /> : null}
      {!flags.submissions_enabled && bundle.entry && round && round.phase !== "finished" ? (
        <Banner tone="warning" text={t("home.paused_submissions")} />
      ) : null}
    </>
  );

  const attentionCard =
    attention?.kind === "rejected" ? (
      <NeedsAttention
        text={t("attention.rejected", {
          type: t(typeKey(attention.evidence.type)),
          reason: attention.evidence.status_reason_code
            ? t(`reason.${attention.evidence.status_reason_code}` as CopyKey, { note: attention.evidence.status_note ?? "" })
            : "",
        })}
        actionLabel={t("attention.replace")}
        onAction={() => router.push(`/round/evidence/${attention.evidence.id}`)}
      />
    ) : attention?.kind === "checkin" ? (
      <NeedsAttention
        tone="violet"
        text={t("attention.checkin")}
        detail={t("checkin.optional")}
        actionLabel={t("ui.checkin.title")}
        onAction={() => router.push({ pathname: "/round/checkin", params: { checkpoint: attention.checkpoint } })}
      />
    ) : null;

  const squadCard = bundle.squad ? (
    <SquadCard
      title={t("squad.title")}
      line={bundle.squad.latest ? feedLine(lang, bundle.squad.latest) : t("squad.icebreaker.live")}
      initials={bundle.squad.latest ? [bundle.squad.latest.handle] : []}
      onPress={() => router.navigate("/(tabs)/squad")}
    />
  ) : bundle.entry && round && round.phase !== "finished" ? (
    <SquadCard title={t("squad.title")} line={t("squad.waiting")} initials={[]} onPress={() => router.navigate("/(tabs)/squad")} />
  ) : null;

  const trail = (
    <View style={{ gap: 10 }}>
      <RText variant="label">{t("ui.missions")}</RText>
      <MissionTrail
        items={trailItems(missions, bundle, next.kind === "log" ? next.mission : null, t)}
        onPress={(key) => router.push(`/round/mission/${key}`)}
      />
      <View style={{ alignItems: "flex-start" }}>
        <TextButton
          label={pendingDrafts.length ? `${t("ui.see_all_logs")} (${t("log.draft")} ${pendingDrafts.length})` : t("ui.see_all_logs")}
          icon="chevron"
          onPress={() => router.push("/round/log")}
        />
      </View>
    </View>
  );

  const openComposer = (type?: string) =>
    router.push(type ? { pathname: "/round/capture", params: { type } } : "/round/capture");

  // ---- Not joined / no round states ----
  if (state.kind === "no_round" || state.kind === "open" || state.kind === "invite_only" || state.kind === "join_closed" || state.kind === "already_in_round") {
    const joinable = state.kind === "no_round" ? null : state.joinable;
    let dock: React.ReactNode = null;
    let body: React.ReactNode = null;
    if (state.kind === "no_round") {
      body = (
        <Card style={{ gap: 8 }}>
          <RText variant="title">{t("home.no_round.title")}</RText>
          <RText variant="body">
            {state.nextRound ? t("home.no_round.body", { date: formatDate(state.nextRound.starts_at, lang) }) : t("home.no_round.body_unknown")}
          </RText>
          {state.onWaitlist || waitlist.isSuccess ? (
            <RText variant="label" color={Violet[700]}>
              {t("home.no_round.notified")}
            </RText>
          ) : null}
          {waitlist.isError ? <Banner tone="error" text={errorCopy(lang, waitlist.error as never)} /> : null}
        </Card>
      );
      if (!state.onWaitlist && !waitlist.isSuccess) {
        dock = <PillowButton label={t("home.no_round.notify")} icon="send" busy={waitlist.isPending} onPress={() => waitlist.mutate()} />;
      }
    } else if (joinable) {
      body = (
        <Card style={{ gap: 8 }}>
          <Tag label={t("round.tag", { n: joinable.number })} />
          <RText variant="title">{t("home.open.title", { n: joinable.number })}</RText>
          <RText variant="h3">{lang === "en" ? joinable.title_en : joinable.title_th}</RText>
          {brief ? <RText variant="body">{brief}</RText> : null}
          {state.kind === "open" ? <RText variant="meta">{t("home.open.join_by", { date: formatDate(joinable.join_by, lang) })}</RText> : null}
          {state.kind === "invite_only" ? <Banner tone="violet" text={t("home.invite_only")} /> : null}
          {state.kind === "join_closed" ? <Banner tone="violet" text={t("home.join_closed", { day: state.day })} /> : null}
          {state.kind === "already_in_round" ? <Banner tone="violet" text={t("error.already_in_active_round", { n: round?.number ?? "" })} /> : null}
        </Card>
      );
      if (state.kind === "open" && flags.enrollment_enabled) {
        dock = (
          <PillowButton
            label={t("home.open.cta")}
            icon="plus"
            onPress={() => router.push({ pathname: "/round/join", params: { r: joinable.round_id } })}
          />
        );
      }
    }
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE} dock={dock} refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
        <Tag label="SHIFT" />
        {banners}
        {state.kind === "open" && !flags.enrollment_enabled ? <Banner tone="warning" text={t("error.enrollment_paused")} /> : null}
        {body}
        {bundle.past_certificates?.length ? (
          <Card style={{ gap: 6 }}>
            <RText variant="label">{t("profile.certificates")}</RText>
            {bundle.past_certificates.map((c) => (
              <TextButton
                key={c.public_id}
                label={`${t("round.tag", { n: c.round_number })} · ${c.status === "issued" ? t("ui.cert.valid") : t("ui.cert.revoked")}`}
                onPress={() => void Linking.openURL(c.verify_url)}
                icon="link"
              />
            ))}
          </Card>
        ) : null}
        <DiscordFooter url={discordUrl} label={t("footer.discord")} />
      </RoundShell>
    );
  }

  // ---- Entry states ----
  let main: React.ReactNode = null;
  let dock: React.ReactNode = null;
  const missionsDone = bundle.missions?.missions_complete ?? 0;
  const people = bundle.missions?.people_talked_to ?? 0;

  if (state.kind === "active" || state.kind === "pre_start") {
    if (next.kind === "log") {
      const mission = missions.find((m) => m.key === next.mission)!;
      main = (
        <NextMissionCard
          tag={t("mission.tag", { n: next.missionNumber })}
          count={t("home.missions_done", { n: missionsDone })}
          title={t(missionTitleKey(mission.key))}
          body={t(next.copyKey, next.params)}
          slots={next.slots}
          slotLabel={(n) => t("ui.slot", { n })}
          filledLabel={t("mission.done")}
          footer={
            state.kind === "pre_start" && round ? (
              <RText variant="meta" color={Violet[700]}>
                {t("home.pre_start", { countdown: formatCountdown(countdown(bundle.now, round.starts_at), lang) })}
              </RText>
            ) : null
          }
        />
      );
      dock = (
        <PillowButton
          label={next.voice ? t("home.cta.voice") : t("home.cta.log")}
          icon={next.voice ? "mic" : "pencil"}
          onPress={() => openComposer(next.type)}
          accessibilityHint={t(next.copyKey, next.params)}
        />
      );
    } else {
      main = (
        <Card style={{ gap: 8 }}>
          <Tag label={t("home.missions_done", { n: 6 })} tone="success" />
          <RText variant="title">{t("cert.celebrate")}</RText>
          <RText variant="body">{t("home.next.all_done")}</RText>
        </Card>
      );
      dock = <PillowButton label={t("log.add")} icon="plus" onPress={() => openComposer()} />;
    }
  } else if (state.kind === "review" || state.kind === "review_overdue") {
    const when = round ? dateTimeDisplay(round.review_ends_at, lang) : { date: "", time: "" };
    main = (
      <Card style={{ gap: 8 }}>
        <RText variant="title">{t("home.review.title")}</RText>
        <RText variant="body">
          {state.kind === "review_overdue"
            ? t("home.review.overdue")
            : bundle.missions?.eligible
              ? t("home.review.body", when)
              : t("home.review.incomplete", { n: missionsDone, ...when })}
        </RText>
      </Card>
    );
  } else if (state.kind === "not_eligible") {
    main = (
      <Card style={{ gap: 8 }}>
        <RText variant="title">{t("home.not_eligible.title", { n: missionsDone })}</RText>
        <RText variant="body">{t("home.not_eligible.body", { people })}</RText>
      </Card>
    );
    const nextOpen = bundle.joinable?.find((j) => j.can_join);
    dock = (
      <PillowButton
        label={t("home.not_eligible.cta")}
        icon="chevron"
        onPress={() =>
          nextOpen ? router.push({ pathname: "/round/join", params: { r: nextOpen.round_id } }) : waitlist.mutate()
        }
        busy={waitlist.isPending}
      />
    );
  } else if (state.kind === "cert_issued") {
    main = (
      <Animated.View entering={celebrate && !reduced ? FadeIn.duration(500) : undefined}>
        <Card style={{ gap: 8 }}>
          {celebrate ? <Tag label={t("cert.celebrate")} tone="success" /> : null}
          <RText variant="title">{t("home.cert.issued.title")}</RText>
          <RText variant="body">{t("home.people", { n: people })}</RText>
        </Card>
      </Animated.View>
    );
    dock = <PillowButton label={t("home.cert.issued.cta")} icon="share" onPress={() => router.push("/round/certificate")} />;
  } else if (state.kind === "cert_revoked") {
    main = (
      <Card style={{ gap: 8 }}>
        <RText variant="title">{t("cert.revoked.title")}</RText>
        <RText variant="body">{t("home.cert.revoked", { date: formatDate(bundle.certificate?.revoked_at ?? bundle.now, lang) })}</RText>
      </Card>
    );
  }

  return (
    <RoundShell bottomInset={TAB_BAR_SPACE} dock={dock} refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      {header}
      {banners}
      {attentionCard}
      {main}
      {bundle.entry && (state.kind === "active" || state.kind === "pre_start") ? (
        <View style={{ gap: 2 }}>
          <RText variant="small">{t("home.people", { n: people })}</RText>
          <RText variant="meta">{t("home.review_note")}</RText>
        </View>
      ) : null}
      {squadCard}
      {trail}
      <DiscordFooter url={discordUrl} label={t("footer.discord")} />
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  kicker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  progress: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 6, borderRadius: 6, backgroundColor: Violet[100], overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6, backgroundColor: Violet[600] },
});
