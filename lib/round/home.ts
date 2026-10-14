/**
 * Home state machine (scale spec 4.1, D1, D8, D10). Pure and unit-tested; `app/(tabs)/shift.tsx`
 * renders whatever `homeView` returns.
 *
 * States and triggers:
 * 1. `guest`: no signed-in user (guest mode or signed out), or the session expired.
 * 2. `landing`: signed in without a current entry. Source `server` uses the joinable round and
 *    can_join (join, apply on the web, waitlist); source `builtin` when `tab_enabled` is false,
 *    the SHIFT RPCs are missing or nothing could be loaded (D10: never an error screen).
 * 3. `pre_start`: entry in a round whose phase is `upcoming`.
 * 4. `active`: entry in a round whose phase is `active`.
 * 5. `review` / `review_overdue` / `not_eligible` / `cert_issued` / `cert_revoked`: after close.
 * `loading` only while the first load is in flight with nothing cached.
 */
import { t, type CopyKey, type CopyParams } from "./copy";
import { missionForType, orderedMissions } from "./missions";
import { nextAction } from "./next";
import { planDay } from "./plan";
import { afterSessionEnd, currentDay, dayStrip, firstSession, todaySession, type DayCell, type SessionWindow, type TodaySession } from "./schedule";
import { currentStep, dayChips, steps, stepsDone, type DayChip, type Step } from "./steps";
import { formatDate, formatWeekday } from "./time";
import type { EvidenceType, HomeBundle, HomeRound, JoinableRound, Lang, MissionCounts, RoundError } from "./types";

export type LandingCta =
  | { kind: "join"; roundId: string; number: number }
  | { kind: "apply"; number: number | null }
  | { kind: "waitlist" }
  | { kind: "sign_in" };

export type LandingNotice = "invite_only" | "join_closed" | "enrollment_paused" | "already_in_round" | "offline" | "retry";

export type Landing = {
  source: "server" | "builtin";
  round: JoinableRound | null;
  cta: LandingCta | null;
  /** "มีคำเชิญแล้ว? เข้าร่วมรอบ" link to /round/join. */
  inviteLink: boolean;
  notice: LandingNotice | null;
  nextRound: { number: number; starts_at: string } | null;
  onWaitlist: boolean;
};

export type HomeView =
  | { kind: "loading" }
  | { kind: "guest"; landing: Landing }
  | { kind: "landing"; landing: Landing }
  | { kind: "pre_start" }
  | { kind: "active" }
  | { kind: "review" }
  | { kind: "review_overdue" }
  | { kind: "not_eligible"; next: Landing }
  | { kind: "cert_issued"; next: Landing | null }
  | { kind: "cert_revoked"; next: Landing | null };

export type HomeInput = {
  /** A signed-in, non-guest user (the home RPC needs a session). */
  signedIn: boolean;
  bundle: HomeBundle | null;
  /** The load error when there is no bundle to show. */
  error: RoundError | null;
  /** First load in flight with nothing cached. */
  pending: boolean;
};

const OVERDUE_MS = 2 * 3_600_000;

export function builtinLanding(cta: LandingCta | null, notice: LandingNotice | null = null): Landing {
  return { source: "builtin", round: null, cta, inviteLink: false, notice, nextRound: null, onWaitlist: false };
}

function noticeFor(error: RoundError | null): LandingNotice | null {
  if (!error) return null;
  if (error.category === "offline") return "offline";
  if (error.category === "retryable") return "retry";
  return null; // unavailable (RPC missing, production before migrations): a normal-looking landing
}

/** Landing from the server bundle: the next joinable round and what the student can do with it. */
export function landingFrom(bundle: HomeBundle): Landing {
  const base = { source: "server" as const, nextRound: bundle.next_round, onWaitlist: bundle.on_waitlist };
  const round = bundle.joinable.find((j) => j.can_join) ?? bundle.joinable[0] ?? null;
  if (!round) {
    return { ...base, round: null, cta: bundle.on_waitlist ? null : { kind: "waitlist" }, inviteLink: false, notice: null };
  }
  if (round.can_join) {
    if (!bundle.flags.enrollment_enabled) return { ...base, round, cta: null, inviteLink: false, notice: "enrollment_paused" };
    return { ...base, round, cta: { kind: "join", roundId: round.round_id, number: round.number }, inviteLink: false, notice: null };
  }
  if (round.reason === "join_closed") {
    return { ...base, round, cta: { kind: "apply", number: null }, inviteLink: false, notice: "join_closed" };
  }
  if (round.reason === "already_in_active_round") {
    return { ...base, round, cta: null, inviteLink: false, notice: "already_in_round" };
  }
  // invite_only (or not open to this user yet): apply on the website (D8), or join with an invite.
  return { ...base, round, cta: { kind: "apply", number: round.number }, inviteLink: true, notice: null };
}

export function homeView(input: HomeInput): HomeView {
  if (!input.signedIn) return { kind: "guest", landing: builtinLanding({ kind: "sign_in" }) };
  const { bundle, error } = input;
  if (!bundle) {
    if (input.pending) return { kind: "loading" };
    if (error?.category === "unauthenticated") return { kind: "guest", landing: builtinLanding({ kind: "sign_in" }) };
    return { kind: "landing", landing: builtinLanding({ kind: "apply", number: null }, noticeFor(error)) };
  }
  // D10: the flag keeps meaning "in-round features on".
  if (!bundle.flags.tab_enabled) return { kind: "landing", landing: builtinLanding({ kind: "apply", number: null }) };

  const { entry, round } = bundle;
  if (!entry || !round) return { kind: "landing", landing: landingFrom(bundle) };

  const next = bundle.joinable.length ? landingFrom(bundle) : null;
  if (bundle.certificate && !bundle.certificate.tombstone) {
    return bundle.certificate.status === "revoked" ? { kind: "cert_revoked", next } : { kind: "cert_issued", next };
  }
  if (entry.outcome === "not_eligible") return { kind: "not_eligible", next: landingFrom(bundle) };
  if (round.phase === "upcoming") return { kind: "pre_start" };
  if (round.phase === "active") return { kind: "active" };
  if (Date.parse(bundle.now) > Date.parse(round.review_ends_at) + OVERDUE_MS) return { kind: "review_overdue" };
  return { kind: "review" };
}

// ---------------------------------------------------------------------------
// Active home (state 4) and pre-start (state 3) view models
// ---------------------------------------------------------------------------

export type PillowAction = {
  type: EvidenceType;
  labelKey: CopyKey;
  icon: "mic" | "pencil";
  hintKey: CopyKey;
  hintParams: CopyParams;
};

/**
 * Pillow = the next incomplete mission's type; "อัปเดตวันนี้" (daily) when every mission is done,
 * or when today's update is still missing after the session time.
 */
export function homePillow(
  counts: MissionCounts | null | undefined,
  ctx: { round: Pick<HomeRound, "session_end">; now: string | number | Date; voiceEnabled: boolean },
): PillowAction {
  const next = nextAction(counts, { voiceEnabled: ctx.voiceEnabled });
  const todayLogged = counts?.daily?.today_logged ?? false;
  if (next.kind === "all_done" || (!todayLogged && afterSessionEnd(ctx.round, ctx.now))) {
    return { type: "daily", labelKey: "home.cta.daily", icon: "pencil", hintKey: "home.next.daily", hintParams: {} };
  }
  return {
    type: next.type,
    labelKey: `home.cta.${next.type}` as CopyKey,
    icon: next.voice ? "mic" : "pencil",
    hintKey: next.copyKey,
    hintParams: next.params,
  };
}

/** Guide card: days 1 to 4, or while a mission with interviews or testers is still open. */
export function showGuideCard(day: number, counts: MissionCounts | null | undefined): boolean {
  if (day >= 1 && day <= 4) return true;
  return (["interview", "tester"] as EvidenceType[]).some((type) => {
    const mission = missionForType(counts, type);
    return !!mission && !mission.complete;
  });
}

export type ActiveModel = {
  /** Round day clamped to 1..duration. */
  day: number;
  tag: string;
  dateLabel: string;
  title: string;
  strip: DayCell[];
  session: TodaySession;
  hero: { tag: string; text: string; chips: DayChip[]; watermark: string };
  steps: Step[];
  stepsDone: number;
  /** "ถัดไป: …" line for the ring card; null when every mission is done. */
  nextText: string | null;
  showGuide: boolean;
  pillow: PillowAction;
};

export function activeModel(bundle: HomeBundle, now: string | number | Date, lang: Lang): ActiveModel | null {
  const round = bundle.round;
  if (!round) return null;
  const rawDay = currentDay(round, now);
  const day = Math.min(Math.max(rawDay, 1), round.duration_days);
  const counts = bundle.missions;
  const list = steps(counts, { lang, day: rawDay });
  const plan = planDay(bundle.plan, day);
  const roundTitle = lang === "en" ? round.title_en || round.title_th : round.title_th || round.title_en;
  const next = nextAction(counts, { voiceEnabled: bundle.flags.transcription_enabled });
  const nextText = next.kind === "log" ? t(lang, next.copyKey, next.params) : null;
  const last = day >= round.duration_days;
  return {
    day,
    tag: t(lang, "round.day_tag", { n: round.number, d: day }),
    dateLabel: `${formatWeekday(now, lang)} ${formatDate(now, lang)}`,
    title: plan?.name?.trim() || roundTitle,
    strip: dayStrip(round, now, lang),
    session: todaySession(round, now),
    hero: {
      tag: last ? t(lang, "home.mission.after") : t(lang, "home.mission.before", { d: day + 1 }),
      text: plan?.mission?.trim() || nextText || t(lang, "home.next.all_done"),
      chips: dayChips(plan, list, { missionsOnly: true }),
      watermark: String(day),
    },
    steps: list,
    stepsDone: stepsDone(list),
    nextText: currentStep(list) ? nextText : null,
    showGuide: showGuideCard(rawDay, counts),
    pillow: homePillow(counts, { round, now, voiceEnabled: bundle.flags.transcription_enabled }),
  };
}

export type PreStartModel = {
  tag: string;
  title: string;
  first: SessionWindow | null;
  /** First session start, or the round start when the round has no sessions. */
  startsAt: number;
};

export function preStartModel(bundle: HomeBundle, lang: Lang): PreStartModel | null {
  const round = bundle.round;
  if (!round) return null;
  const first = firstSession(round);
  return {
    tag: t(lang, "round.tag", { n: round.number }),
    title: (lang === "en" ? round.title_en || round.title_th : round.title_th || round.title_en) || t(lang, "round.tag", { n: round.number }),
    first,
    startsAt: first?.start ?? Date.parse(round.starts_at),
  };
}

/** Apply on the website (D8): `${web_base_url}/shift/apply?round=N`, or the next open round. */
export function applyUrl(webBaseUrl: string, number: number | null): string {
  const base = `${webBaseUrl.replace(/\/+$/, "")}/shift/apply`;
  return number === null ? base : `${base}?round=${number}`;
}

/** Missions count for "ครบ {n} ข้อได้ใบรับรอง". */
export function missionsTotal(counts: MissionCounts | null | undefined): number {
  return orderedMissions(counts).length;
}
