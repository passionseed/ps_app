import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useAuth } from "../../lib/auth";
import { Ink, Violet } from "../../lib/theme";
import { errorOf, roundApi } from "../../lib/round/api";
import { errorCopy, type CopyKey, type CopyParams } from "../../lib/round/copy";
import { useInvalidateRound, useRoundDrafts, useRoundHome, useRoundLang, useRoundNow, useRoundUser } from "../../lib/round/hooks";
import {
  activeModel,
  applyUrl,
  homeView,
  missionsTotal,
  preStartModel,
  type ActiveModel,
  type Landing,
  type LandingCta,
} from "../../lib/round/home";
import { needsAttention, lastHours } from "../../lib/round/next";
import { currentDay, sessionSummary } from "../../lib/round/schedule";
import { feedLine } from "../../lib/round/squadCopy";
import { steps as stepsModel, stepsDone } from "../../lib/round/steps";
import { countdown, dateTimeDisplay, formatCountdown, formatDate, formatDateRange, formatTime, formatWeekday } from "../../lib/round/time";
import { DEFAULT_DURATION_DAYS, DEFAULT_SESSION_START, typeKey } from "../../lib/round/missions";
import { shiftStorage } from "../../lib/shiftStorage";
import type { HomeBundle, JoinableRound, Lang } from "../../lib/round/types";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { ShiftKey } from "../../components/round/Key";
import { Banner, Tag, TextButton } from "../../components/round/primitives";
import { HomeSkeleton } from "../../components/round/Skeleton";
import { SquadCard } from "../../components/round/SquadCard";
import { NeedsAttention } from "../../components/round/NeedsAttention";
import { DiscordFooter } from "../../components/round/DiscordFooter";
import { GlassCard } from "../../components/round/GlassCard";
import { HeroCard } from "../../components/round/HeroCard";
import { DayStrip } from "../../components/round/DayStrip";
import { SessionCard, type SessionState } from "../../components/round/SessionCard";
import { ProgressRing } from "../../components/round/ProgressRing";
import { StepChip } from "../../components/round/StepChip";
import { GemIcon } from "../../components/round/GemIcon";
import { ShiftOrb } from "../../components/round/ShiftOrb";
import { Icon, type IconName } from "../../components/round/Icons";
import { SHIFT_TAB_BAR_HEIGHT, shiftTabBarBottom } from "../../components/round/ShiftTabBar";

/** Public project titles from earlier shifts (titles only: students are minors). */
const ALUMNI = ["Magnified Lens", "TradBid", "ปฏิทิน กสพท70"] as const;
const OUTCOMES: CopyKey[] = ["landing.outcome.1", "landing.outcome.2", "landing.outcome.3"];

type T = (key: CopyKey, params?: CopyParams) => string;

/** Space the floating tab bar takes above the safe area (RoundShell adds the safe area itself). */
function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return shiftTabBarBottom(insets.bottom) - insets.bottom + SHIFT_TAB_BAR_HEIGHT + 10;
}

export default function ShiftHomeScreen() {
  const { userId, isGuest } = useRoundUser();
  const { exitGuestMode } = useAuth();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const drafts = useRoundDrafts();
  const invalidate = useInvalidateRound();
  const bottomInset = useTabBarInset();
  const bundle = home.data?.bundle ?? null;
  // Unsent work for this entry: drafts and failed sends, fixed from the log screen.
  const draftCount = (drafts.data ?? []).filter((d) => d.entry_id === bundle?.entry?.id).length;
  const now = useRoundNow(bundle?.now, home.dataUpdatedAt, 30_000, home.data?.fromCache);

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

  const signedIn = !!userId && !isGuest;
  const view = homeView({
    signedIn,
    bundle,
    error: !bundle && home.error ? errorOf(home.error) : null,
    pending: signedIn && home.isPending,
  });

  const refresh = signedIn ? { refreshing: home.isRefetching, onRefresh: () => void home.refetch() } : {};

  if (view.kind === "loading") {
    return (
      <RoundShell bottomInset={bottomInset}>
        <HomeSkeleton />
      </RoundShell>
    );
  }

  /** Runs a landing call to action (sign in, join, apply on the web, waitlist). */
  const runCta = (cta: LandingCta, _round: JoinableRound | null) => {
    if (cta.kind === "sign_in") return goSignIn();
    if (cta.kind === "join") return router.push({ pathname: "/round/join", params: { r: cta.roundId } });
    if (cta.kind === "waitlist") return waitlist.mutate();
    const base = bundle?.flags.web_base_url ?? "https://www.passionseed.org";
    // No fallback to the shown round: a null number means "the next open cohort" (the shown one is closed).
    void WebBrowser.openBrowserAsync(applyUrl(base, cta.number ?? null)).catch(() => {});
  };

  if (view.kind === "guest" || view.kind === "landing") {
    const landing = view.landing;
    return (
      <RoundShell bottomInset={bottomInset} dock={<LandingDock landing={landing} t={t} busy={waitlist.isPending} onCta={runCta} done={waitlist.isSuccess} />} {...refresh}>
        <LandingBody
          landing={landing}
          bundle={bundle}
          lang={lang}
          t={t}
          waitlistDone={waitlist.isSuccess}
          waitlistError={waitlist.isError ? errorCopy(lang, waitlist.error as never) : null}
          fromCache={!!home.data?.fromCache}
          onRetry={() => void home.refetch()}
        />
      </RoundShell>
    );
  }

  // Entry states: a bundle with entry and round exists from here on.
  const b = bundle!;
  const round = b.round!;
  const banners = <HomeBanners bundle={b} now={now} lang={lang} t={t} fromCache={!!home.data?.fromCache} />;
  const attention = <Attention bundle={b} now={now} t={t} />;
  const squad = <HomeSquad bundle={b} lang={lang} t={t} />;
  const footer = <DiscordFooter url={round.discord_url} label={t("footer.discord")} />;
  const openComposer = (type?: string) => router.push(type ? { pathname: "/round/capture", params: { type } } : "/round/capture");

  if (view.kind === "active") {
    const m = activeModel(b, now, lang)!;
    return (
      <RoundShell
        bottomInset={bottomInset}
        {...refresh}
        dock={
          <ShiftKey
            label={t(m.keyAction.labelKey)}
            icon={m.keyAction.icon}
            onPress={() => openComposer(m.keyAction.type)}
            accessibilityHint={t(m.keyAction.hintKey, m.keyAction.hintParams)}
          />
        }
      >
        <ActiveBody m={m} bundle={b} now={now} lang={lang} t={t} banners={banners} squad={squad} footer={footer} draftCount={draftCount} />
      </RoundShell>
    );
  }

  if (view.kind === "pre_start") {
    const m = preStartModel(b, lang)!;
    const left = countdown(now, m.startsAt);
    const first = m.first ? new Date(m.first.start) : new Date(m.startsAt);
    return (
      <RoundShell
        bottomInset={bottomInset}
        {...refresh}
        dock={
          round.discord_url ? (
            <ShiftKey label={t("home.discord")} icon="chat" onPress={() => void Linking.openURL(round.discord_url!)} />
          ) : (
            <ShiftKey label={t("home.cta.ideas")} icon="pencil" onPress={() => openComposer("ideas")} />
          )
        }
      >
        <View style={styles.kicker}>
          <Tag label={m.tag} />
          <RText variant="meta">{formatDateRange(round.starts_at, round.closes_at, lang)}</RText>
        </View>
        <RText variant="display" accessibilityRole="header" style={styles.title}>
          {m.title}
        </RText>
        {banners}
        <HeroCard watermark="1">
          <Tag label={t("day.tag", { d: 1 })} />
          <RText variant="h3" style={styles.heroText}>
            {t("home.pre.first_session", { weekday: formatWeekday(first, lang), date: formatDate(first, lang), time: formatTime(first) })}
          </RText>
          <RText variant="label" color={Violet[700]}>
            {t("home.pre.countdown", { countdown: formatCountdown(left, lang) })}
          </RText>
        </HeroCard>
        <GlassCard style={styles.stack}>
          <RText variant="label">{t("home.pre.homework.title")}</RText>
          <RText variant="body">{t("home.pre.homework.body")}</RText>
          <View style={styles.start}>
            <TextButton label={t("home.pre.homework.cta")} icon="pencil" onPress={() => openComposer("ideas")} />
          </View>
        </GlassCard>
        {attention}
        {squad}
        {footer}
      </RoundShell>
    );
  }

  // 5. After the round: review, overdue, not eligible, certificate.
  const total = missionsTotal(b.missions);
  const done = b.missions?.missions_complete ?? 0;
  const people = b.missions?.people_talked_to ?? 0;
  let hero: React.ReactNode = null;
  let dock: React.ReactNode = null;
  let next: Landing | null = null;
  /** The next-round card carries its own action unless the Shift key already does. */
  let nextAction = true;
  if (view.kind === "review" || view.kind === "review_overdue") {
    const when = dateTimeDisplay(round.review_ends_at, lang);
    hero = (
      <HeroCard>
        <RText variant="title">{t("home.review.title")}</RText>
        <RText variant="body" style={styles.heroBody}>
          {view.kind === "review_overdue"
            ? t("home.review.overdue")
            : b.missions?.eligible
              ? t("home.review.body", when)
              : t("home.review.incomplete", { n: done, total, ...when })}
        </RText>
        <RText variant="meta">{t("home.people", { n: people })}</RText>
      </HeroCard>
    );
  } else if (view.kind === "not_eligible") {
    next = view.next;
    hero = (
      <HeroCard>
        <RText variant="title">{t("home.not_eligible.title", { n: done, total })}</RText>
        <RText variant="body" style={styles.heroBody}>
          {t("home.not_eligible.body", { people })}
        </RText>
      </HeroCard>
    );
    dock = next.cta ? <LandingDock landing={next} t={t} busy={waitlist.isPending} onCta={runCta} done={waitlist.isSuccess} /> : null;
    nextAction = false;
  } else if (view.kind === "cert_issued") {
    next = view.next;
    hero = <CertHero bundle={b} lang={lang} t={t} userId={userId} people={people} />;
    dock = <ShiftKey label={t("home.cert.issued.cta")} icon="share" onPress={() => router.push("/round/certificate")} />;
  } else if (view.kind === "cert_revoked") {
    next = view.next;
    hero = (
      <HeroCard>
        <RText variant="title">{t("cert.revoked.title")}</RText>
        <RText variant="body" style={styles.heroBody}>
          {t("home.cert.revoked", { date: formatDate(b.certificate?.revoked_at ?? b.now, lang) })}
        </RText>
      </HeroCard>
    );
  }
  const finalSteps = stepsModel(b.missions, { lang, day: currentDay(round, now) });
  return (
    <RoundShell bottomInset={bottomInset} dock={dock} {...refresh}>
      <View style={styles.kicker}>
        <Tag label={t("round.tag", { n: round.number })} />
        <RText variant="meta">{formatDateRange(round.starts_at, round.closes_at, lang)}</RText>
      </View>
      <RText variant="display" accessibilityRole="header" style={styles.title}>
        {(lang === "en" ? round.title_en || round.title_th : round.title_th || round.title_en) || t("round.tag", { n: round.number })}
      </RText>
      {banners}
      {attention}
      {hero}
      <StepsCard done={stepsDone(finalSteps)} total={finalSteps.length} line={t("home.missions_done", { n: done })} t={t} />
      {next ? <NextRoundCard landing={next} lang={lang} t={t} onCta={nextAction ? runCta : null} /> : null}
      {squad}
      {footer}
    </RoundShell>
  );
}

// ---------------------------------------------------------------------------
// Landing (states 1 and 2)
// ---------------------------------------------------------------------------

function ctaLabel(cta: LandingCta, t: T): { label: string; icon: IconName } {
  switch (cta.kind) {
    case "sign_in":
      return { label: t("ui.sign_in"), icon: "person" };
    case "join":
      return { label: t("landing.join", { n: cta.number }), icon: "arrow" };
    case "waitlist":
      return { label: t("landing.notify"), icon: "bell" };
    case "apply":
      return { label: cta.number === null ? t("landing.apply_next") : t("landing.apply", { n: cta.number }), icon: "arrow" };
  }
}

function LandingDock({
  landing,
  t,
  busy,
  done,
  onCta,
}: {
  landing: Landing;
  t: T;
  busy: boolean;
  done: boolean;
  onCta: (cta: LandingCta, round: JoinableRound | null) => void;
}) {
  const cta = landing.cta && !(landing.cta.kind === "waitlist" && done) ? landing.cta : null;
  if (!cta && !landing.inviteLink) return null;
  const { label, icon } = cta ? ctaLabel(cta, t) : { label: "", icon: "arrow" as IconName };
  return (
    <View style={styles.dock}>
      {cta ? <ShiftKey label={label} icon={icon} busy={cta.kind === "waitlist" && busy} onPress={() => onCta(cta, landing.round)} /> : null}
      {landing.inviteLink ? (
        <View style={styles.center}>
          <TextButton
            label={t("landing.invite")}
            onPress={() => router.push(landing.round ? { pathname: "/round/join", params: { r: landing.round.round_id } } : "/round/join")}
          />
        </View>
      ) : null}
    </View>
  );
}

function LandingBody({
  landing,
  bundle,
  lang,
  t,
  waitlistDone,
  waitlistError,
  fromCache,
  onRetry,
}: {
  landing: Landing;
  bundle: HomeBundle | null;
  lang: Lang;
  t: T;
  waitlistDone: boolean;
  waitlistError: string | null;
  fromCache: boolean;
  onRetry: () => void;
}) {
  const days = landing.round?.duration_days ?? DEFAULT_DURATION_DAYS;
  const emergency = bundle?.flags.emergency_message;
  return (
    <>
      <View style={styles.orb}>
        <ShiftOrb size={156} subtitle={t("landing.wordmark_sub", { days })} />
      </View>
      <RText variant="display" accessibilityRole="header" style={styles.landingTitle}>
        {t("landing.title")}
      </RText>
      {emergency && (emergency.th || emergency.en) ? (
        <Banner
          tone="warning"
          text={(lang === "en" ? emergency.en : emergency.th) ?? emergency.th ?? emergency.en ?? ""}
          actionLabel={emergency.url ? t("ui.emergency.more") : undefined}
          onAction={emergency.url ? () => void Linking.openURL(emergency.url!) : undefined}
        />
      ) : null}
      {fromCache && landing.notice !== "offline" ? <Banner tone="violet" text={t("home.offline")} /> : null}
      <LandingNotice landing={landing} bundle={bundle} t={t} onRetry={onRetry} />
      <RoundLine landing={landing} lang={lang} t={t} waitlistDone={waitlistDone} />
      {waitlistError ? <Banner tone="error" text={waitlistError} /> : null}
      <RText variant="label" style={styles.section}>
        {t("landing.outcomes")}
      </RText>
      <GlassCard padding={6} style={styles.outcomes}>
        {OUTCOMES.map((key, i) => (
          <View key={key} style={[styles.outcome, i > 0 && styles.outcomeLine]}>
            <View style={styles.num}>
              <RText variant="label" latin color={Violet[700]} style={styles.numText}>
                {String(i + 1)}
              </RText>
            </View>
            <RText variant="body" color={Ink.primary} style={styles.flex}>
              {t(key)}
            </RText>
          </View>
        ))}
      </GlassCard>
      <RText variant="label" style={styles.section}>
        {t("landing.alumni")}
      </RText>
      <View style={styles.alumni}>
        {ALUMNI.map((title) => (
          <GlassCard key={title} padding={12} style={styles.alumniChip}>
            <RText variant="label" style={styles.alumniText}>
              {title}
            </RText>
          </GlassCard>
        ))}
      </View>
    </>
  );
}

function LandingNotice({ landing, bundle, t, onRetry }: { landing: Landing; bundle: HomeBundle | null; t: T; onRetry: () => void }) {
  switch (landing.notice) {
    case "offline":
      return <Banner tone="violet" text={t("home.offline")} />;
    case "retry":
      return <Banner tone="warning" text={t("error.retryable")} actionLabel={t("ui.retry")} onAction={onRetry} />;
    case "join_closed":
      return <Banner tone="violet" text={t("home.join_closed", { day: bundle?.round?.join_cutoff_day ?? 2 })} />;
    case "enrollment_paused":
      return <Banner tone="warning" text={t("error.enrollment_paused")} />;
    case "already_in_round":
      return <Banner tone="violet" text={t("landing.already")} />;
    case "invite_only":
      return <Banner tone="violet" text={t("home.invite_only")} />;
    default:
      return null;
  }
}

/** The next shift: SHIFT[N] · dates and the session time, or "coming soon" with the waitlist state. */
function RoundLine({ landing, lang, t, waitlistDone }: { landing: Landing; lang: Lang; t: T; waitlistDone: boolean }) {
  const round = landing.round;
  let title: string;
  let meta: string | null;
  if (round) {
    title = t("landing.round", { n: round.number, dates: formatDateRange(round.starts_at, round.closes_at, lang) });
    meta = t("landing.round_line", { time: sessionSummary(round).time });
  } else if (landing.source === "builtin") {
    title = t("landing.builtin_round", { days: DEFAULT_DURATION_DAYS });
    meta = t("landing.round_line", { time: DEFAULT_SESSION_START });
  } else {
    title = t("landing.no_round");
    meta =
      landing.onWaitlist || waitlistDone
        ? t("home.no_round.notified")
        : landing.nextRound
          ? t("home.no_round.body", { date: formatDate(landing.nextRound.starts_at, lang) })
          : null;
  }
  return (
    <GlassCard style={styles.row} padding={14}>
      <GemIcon icon={round || landing.source === "builtin" ? "calendar" : "bell"} shape="tile" size={42} iconSize={19} />
      <View style={styles.flex}>
        <RText variant="label">{title}</RText>
        {meta ? <RText variant="meta">{meta}</RText> : null}
      </View>
    </GlassCard>
  );
}

function NextRoundCard({
  landing,
  lang,
  t,
  onCta,
}: {
  landing: Landing;
  lang: Lang;
  t: T;
  onCta: ((cta: LandingCta, round: JoinableRound | null) => void) | null;
}) {
  if (!landing.round) return null;
  const cta = onCta ? landing.cta : null;
  return (
    <View style={styles.stack}>
      <RText variant="label" style={styles.section}>
        {t("home.next_round")}
      </RText>
      <RoundLine landing={landing} lang={lang} t={t} waitlistDone={false} />
      {cta && cta.kind !== "sign_in" ? (
        <View style={styles.start}>
          <TextButton label={ctaLabel(cta, t).label} icon="chevron" onPress={() => onCta?.(cta, landing.round)} />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active (state 4, mockup B)
// ---------------------------------------------------------------------------

function sessionCard(m: ActiveModel, bundle: HomeBundle, now: number, lang: Lang, t: T) {
  const round = bundle.round!;
  const discord = round.discord_url;
  const join = discord ? { actionLabel: t("home.discord"), onAction: () => void Linking.openURL(discord) } : {};
  const s = m.session;
  const props: { state: SessionState; title: string; subtitle: string; actionLabel?: string; onAction?: () => void } =
    s.kind === "upcoming"
      ? {
          state: "upcoming",
          title: t("home.session.upcoming", { time: round.session_start }),
          subtitle: t("home.session.starts_in", { countdown: formatCountdown(countdown(now, s.window.start), lang) }),
          ...join,
        }
      : s.kind === "live"
        ? { state: "live", title: t("home.session.live"), subtitle: t("home.session.live_sub", { start: round.session_start, end: round.session_end }), ...join }
        : s.kind === "ended"
          ? { state: "ended", title: t("home.session.ended"), subtitle: t("home.session.ended_sub") }
          : { state: "none", title: t("home.session.none"), subtitle: t("home.session.none_sub") };
  return <SessionCard {...props} />;
}

function ActiveBody({
  m,
  bundle,
  now,
  lang,
  t,
  banners,
  squad,
  footer,
  draftCount,
}: {
  m: ActiveModel;
  bundle: HomeBundle;
  now: number;
  lang: Lang;
  t: T;
  banners: React.ReactNode;
  squad: React.ReactNode;
  draftCount: number;
  footer: React.ReactNode;
}) {
  return (
    <>
      <View style={styles.kicker}>
        <Tag label={m.tag} />
        <RText variant="meta">{m.dateLabel}</RText>
      </View>
      <RText variant="display" accessibilityRole="header" style={styles.title}>
        {m.title}
      </RText>
      <DayStrip days={m.strip} onPress={(day) => router.push(`/round/day/${day}`)} />
      {banners}
      {/* A sent-back log is urgent; the optional check-in waits below today's mission. */}
      <Attention bundle={bundle} now={now} t={t} only="rejected" />
      {sessionCard(m, bundle, now, lang, t)}
      <HeroCard watermark={m.hero.watermark}>
        <Tag label={m.hero.tag} />
        <RText variant="h3" style={styles.heroText}>
          {m.hero.text}
        </RText>
        {m.hero.chips.length ? (
          <View style={styles.chips}>
            {m.hero.chips.map((c) => (
              <StepChip key={c.n} label={c.label} state={c.state} />
            ))}
          </View>
        ) : null}
      </HeroCard>
      <StepsCard
        done={m.stepsDone}
        total={m.steps.length}
        line={m.nextText ? t("steps.next", { text: m.nextText }) : t("steps.all_done")}
        t={t}
      />
      <Attention bundle={bundle} now={now} t={t} only="checkin" />
      <GlassCard
        onPress={() => router.push("/round/log")}
        accessibilityLabel={`${t("home.logs.title")}. ${draftCount ? t("home.logs.drafts", { n: draftCount }) : t("home.logs.sub")}`}
        style={styles.row}
        padding={14}
      >
        <GemIcon icon="book" shape="tile" size={42} iconSize={19} />
        <View style={styles.flex}>
          <RText variant="label">{t("home.logs.title")}</RText>
          <RText variant="meta" color={draftCount ? Violet[700] : undefined}>
            {draftCount ? t("home.logs.drafts", { n: draftCount }) : t("home.logs.sub")}
          </RText>
        </View>
        <Icon name="chevron" size={20} color={Violet[700]} />
      </GlassCard>
      {m.showGuide ? (
        <GlassCard
          onPress={() => router.push("/round/guide")}
          accessibilityLabel={`${t("home.guide.title")}. ${t("home.guide.sub")}`}
          style={styles.row}
          padding={14}
        >
          <GemIcon icon="chat" shape="tile" size={42} iconSize={19} />
          <View style={styles.flex}>
            <RText variant="label">{t("home.guide.title")}</RText>
            <RText variant="meta">{t("home.guide.sub")}</RText>
          </View>
          <Icon name="chevron" size={20} color={Violet[700]} />
        </GlassCard>
      ) : null}
      {squad}
      {footer}
    </>
  );
}

function StepsCard({ done, total, line, t }: { done: number; total: number; line: string; t: T }) {
  const title = t("steps.title", { total });
  return (
    <GlassCard onPress={() => router.push("/round/steps")} accessibilityLabel={`${title}, ${done}/${total}. ${line}`} style={styles.row} padding={14}>
      <ProgressRing value={done} total={total} />
      <View style={styles.flex}>
        <RText variant="label">{title}</RText>
        <RText variant="meta" numberOfLines={2}>
          {line}
        </RText>
      </View>
      <Icon name="chevron" size={20} color={Violet[700]} />
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function HomeBanners({ bundle, now, lang, t, fromCache }: { bundle: HomeBundle; now: number; lang: Lang; t: T; fromCache: boolean }) {
  const emergency = bundle.flags.emergency_message;
  const closing = lastHours(bundle, 24, now);
  const round = bundle.round;
  return (
    <>
      {emergency && (emergency.th || emergency.en) ? (
        <Banner
          tone="warning"
          text={(lang === "en" ? emergency.en : emergency.th) ?? emergency.th ?? emergency.en ?? ""}
          actionLabel={emergency.url ? t("ui.emergency.more") : undefined}
          onAction={emergency.url ? () => void Linking.openURL(emergency.url!) : undefined}
        />
      ) : null}
      {fromCache ? <Banner tone="violet" text={t("home.offline")} /> : null}
      {!bundle.flags.submissions_enabled && bundle.entry && round && round.phase !== "finished" ? (
        <Banner tone="warning" text={t("home.paused_submissions")} />
      ) : null}
      {closing ? <Banner tone="warning" text={t("home.last_hours", closing)} /> : null}
    </>
  );
}

function Attention({
  bundle,
  now,
  t,
  only,
}: {
  bundle: HomeBundle;
  now: number;
  t: T;
  only?: "rejected" | "checkin";
}) {
  const attention = needsAttention(bundle, now);
  if (only && attention?.kind !== only) return null;
  if (attention?.kind === "rejected") {
    const e = attention.evidence;
    return (
      <NeedsAttention
        text={t("attention.rejected", {
          type: t(typeKey(e.type)),
          reason: e.status_reason_code ? t(`reason.${e.status_reason_code}` as CopyKey, { note: e.status_note ?? "" }) : "",
        })}
        actionLabel={t("attention.replace")}
        onAction={() => router.push(`/round/evidence/${e.id}`)}
      />
    );
  }
  if (attention?.kind === "checkin") {
    return (
      <NeedsAttention
        tone="violet"
        text={t("attention.checkin")}
        detail={t("checkin.optional")}
        actionLabel={t("ui.checkin.title")}
        onAction={() => router.push({ pathname: "/round/checkin", params: { checkpoint: attention.checkpoint } })}
      />
    );
  }
  return null;
}

function HomeSquad({ bundle, lang, t }: { bundle: HomeBundle; lang: Lang; t: T }) {
  const open = () => router.navigate("/(tabs)/squad");
  if (bundle.squad) {
    const latest = bundle.squad.latest;
    return (
      <SquadCard
        title={t("squad.title")}
        line={latest ? feedLine(lang, latest, bundle.missions) : t("squad.icebreaker.live")}
        initials={latest ? [latest.handle] : []}
        onPress={open}
      />
    );
  }
  if (bundle.entry && bundle.round && bundle.round.phase !== "finished") {
    return <SquadCard title={t("squad.title")} line={t("squad.waiting")} initials={[]} onPress={open} />;
  }
  return null;
}

function CertHero({ bundle, lang, t, userId, people }: { bundle: HomeBundle; lang: Lang; t: T; userId: string; people: number }) {
  const reduced = useReducedMotion();
  const [celebrate, setCelebrate] = useState(false);
  const certId = bundle.certificate?.status === "issued" ? bundle.certificate.id : null;
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
  const issued = bundle.certificate?.issued_at;
  return (
    <Animated.View entering={celebrate && !reduced ? FadeIn.duration(500) : undefined}>
      <HeroCard watermark={String(bundle.round?.number ?? "")}>
        {celebrate ? <Tag label={t("cert.celebrate")} tone="success" /> : null}
        <RText variant="title" style={celebrate ? styles.heroText : undefined}>
          {t("home.cert.issued.title")}
        </RText>
        <RText variant="body" style={styles.heroBody}>
          {t("home.people", { n: people })}
        </RText>
        {issued ? <RText variant="meta">{formatDate(issued, lang)}</RText> : null}
      </HeroCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  kicker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 26, lineHeight: 34, fontWeight: "600" },
  landingTitle: { fontSize: 24, lineHeight: 34, textAlign: "center" },
  orb: { alignItems: "center", paddingTop: 4 },
  heroText: { marginTop: 10, marginBottom: 4, lineHeight: 27 },
  heroBody: { marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  stack: { gap: 8 },
  start: { alignItems: "flex-start" },
  center: { alignItems: "center" },
  flex: { flex: 1, minWidth: 0 },
  dock: { gap: 4 },
  section: { marginTop: 6, marginHorizontal: 2 },
  outcomes: { paddingHorizontal: 14 },
  outcome: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  outcomeLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(114,92,191,0.12)" },
  num: { width: 26, height: 26, borderRadius: 9, backgroundColor: Violet[50], alignItems: "center", justifyContent: "center" },
  numText: { fontSize: 12, lineHeight: 16 },
  alumni: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alumniChip: { borderRadius: 16 },
  alumniText: { fontSize: 14 },
});
