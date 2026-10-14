/**
 * Normalizes RPC payloads into the client types (scale spec 2.3, 2.5, D10). Every field the
 * app reads gets a safe default, so a server that predates the scale migrations (or a cached
 * bundle written by an older app version) never crashes a screen.
 */
import { DEFAULT_FLAGS } from "./defaults";
import {
  DEFAULT_DURATION_DAYS,
  DEFAULT_SESSION_DAYS,
  DEFAULT_SESSION_END,
  DEFAULT_SESSION_START,
  emptyMissionCounts,
} from "./missions";
import { normalizeClock, roundDayDate } from "./schedule";
import { ictDate } from "./time";
import type {
  DailyHabit,
  EvidenceItem,
  EvidenceType,
  HomeBundle,
  HomeRound,
  JoinableRound,
  Mission,
  MissionCounts,
  PlanDay,
  PlanInterview,
  Receipt,
  RoundFlags,
  RoundPlan,
  SessionHabit,
} from "./types";
import { EVIDENCE_TYPES } from "./types";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const int = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isInteger(v) ? v : fallback);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
const isEvidenceType = (v: unknown): v is EvidenceType => typeof v === "string" && (EVIDENCE_TYPES as readonly string[]).includes(v);

const MAX_TEXT = 2000;
const MAX_ITEMS = 20;

/** Distinct session days within 1..duration, sorted; the SHIFT template when absent. */
export function normalizeSessionDays(raw: unknown, durationDays: number): number[] {
  const source = Array.isArray(raw) ? raw : DEFAULT_SESSION_DAYS;
  const days = new Set<number>();
  for (const d of source) if (typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= durationDays) days.add(d);
  return [...days].sort((a, b) => a - b);
}

function normalizeHabitDaily(raw: unknown): DailyHabit | null {
  if (!isObj(raw)) return null;
  return { days: Math.max(0, int(raw.days, 0)), need: Math.max(1, int(raw.need, DEFAULT_DURATION_DAYS)), today_logged: bool(raw.today_logged, false) };
}

function normalizeHabitSessions(raw: unknown): SessionHabit | null {
  if (!isObj(raw)) return null;
  return { attended: Math.max(0, int(raw.attended, 0)), held: Math.max(0, int(raw.held, 0)), total: Math.max(0, int(raw.total, 0)) };
}

function normalizeMission(raw: unknown, index: number): Mission | null {
  if (!isObj(raw) || typeof raw.key !== "string" || !raw.key) return null;
  const parts = (Array.isArray(raw.parts) ? raw.parts : [])
    .filter(isObj)
    .filter((p) => isEvidenceType(p.type))
    .map((p) => ({ type: p.type as EvidenceType, have: Math.max(0, num(p.have, 0)), need: Math.max(1, num(p.need, 1)) }));
  if (!parts.length) return null;
  return {
    key: raw.key,
    n: Math.max(1, int(raw.n, index + 1)),
    complete: bool(raw.complete, parts.every((p) => p.have >= p.need)),
    title_th: strOrNull(raw.title_th),
    title_en: strOrNull(raw.title_en),
    parts,
  };
}

/** `mission_counts` json (spec 2.3). Returns null when there is nothing usable. */
export function normalizeCounts(raw: unknown): MissionCounts | null {
  if (!isObj(raw)) return null;
  const missions = (Array.isArray(raw.missions) ? raw.missions : [])
    .map((m, i) => normalizeMission(m, i))
    .filter((m): m is Mission => !!m)
    .sort((a, b) => a.n - b.n);
  if (!missions.length) return null;
  const complete = missions.filter((m) => m.complete).length;
  return {
    missions,
    missions_complete: Math.max(0, int(raw.missions_complete, complete)),
    missions_total: Math.max(1, int(raw.missions_total, missions.length)),
    people_talked_to: Math.max(0, int(raw.people_talked_to, 0)),
    eligible: bool(raw.eligible, complete === missions.length),
    daily: normalizeHabitDaily(raw.daily),
    sessions: normalizeHabitSessions(raw.sessions),
  };
}

export function normalizeRound(raw: unknown): HomeRound | null {
  if (!isObj(raw) || typeof raw.id !== "string") return null;
  const duration = Math.max(1, int(raw.duration_days, DEFAULT_DURATION_DAYS));
  return {
    ...(raw as unknown as HomeRound),
    title_th: str(raw.title_th),
    title_en: str(raw.title_en),
    brief_th: str(raw.brief_th),
    brief_en: str(raw.brief_en),
    duration_days: duration,
    join_cutoff_day: int(raw.join_cutoff_day, 2),
    day: int(raw.day, 0),
    discord_url: strOrNull(raw.discord_url),
    session_days: normalizeSessionDays(raw.session_days, duration),
    session_start: normalizeClock(raw.session_start, DEFAULT_SESSION_START),
    session_end: normalizeClock(raw.session_end, DEFAULT_SESSION_END),
    application_cohort: strOrNull(raw.application_cohort),
  };
}

export function normalizeJoinable(raw: unknown): JoinableRound[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObj).filter((j) => typeof j.round_id === "string").map((j) => {
    const duration = Math.max(1, int(j.duration_days, DEFAULT_DURATION_DAYS));
    const reason = j.reason === "invite_only" || j.reason === "join_closed" || j.reason === "already_in_active_round" ? j.reason : null;
    return {
      ...(j as unknown as JoinableRound),
      title_th: str(j.title_th),
      title_en: str(j.title_en),
      join_mode: j.join_mode === "open" ? "open" : "invite",
      can_join: bool(j.can_join, false),
      reason,
      duration_days: duration,
      session_days: normalizeSessionDays(j.session_days, duration),
      session_start: normalizeClock(j.session_start, DEFAULT_SESSION_START),
      session_end: normalizeClock(j.session_end, DEFAULT_SESSION_END),
    };
  });
}

const clampText = (v: unknown): string => str(v).slice(0, MAX_TEXT);
const textList = (v: unknown): string[] =>
  (Array.isArray(v) ? v : [])
    .filter((s): s is string => typeof s === "string" && !!s.trim())
    .slice(0, MAX_ITEMS)
    .map((s) => s.slice(0, MAX_TEXT));

function normalizeInterview(raw: unknown): PlanInterview | null {
  if (!isObj(raw)) return null;
  const interview: PlanInterview = {
    intro: clampText(raw.intro),
    dm: clampText(raw.dm),
    questions: textList(raw.questions),
    dos: textList(raw.dos),
    donts: textList(raw.donts),
  };
  return interview.dm.trim() || interview.questions.length ? interview : null;
}

/**
 * Student-safe plan (spec 2.5). Copies only the student fields (mentor-only fields are dropped
 * even if a server sends them), clamps strings and arrays, and drops days beyond the round.
 */
export function normalizePlan(raw: unknown, durationDays?: number): RoundPlan | null {
  if (!isObj(raw)) return null;
  const seen = new Set<number>();
  const days: PlanDay[] = [];
  for (const d of Array.isArray(raw.days) ? raw.days : []) {
    if (!isObj(d)) continue;
    const day = int(d.day, 0);
    if (day < 1 || day > 28 || (durationDays && day > durationDays) || seen.has(day)) continue;
    seen.add(day);
    const steps = (Array.isArray(d.steps) ? d.steps : [])
      .filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 20)
      .slice(0, MAX_ITEMS);
    days.push({ day, name: clampText(d.name), goal: clampText(d.goal), mission: clampText(d.mission), steps });
  }
  days.sort((a, b) => a.day - b.day);
  const plan: RoundPlan = {
    source: raw.source === "curriculum" ? "curriculum" : "default",
    rules: textList(raw.rules),
    interview: normalizeInterview(raw.interview),
    days: days.slice(0, 28),
  };
  return plan.days.length || plan.interview || plan.rules.length ? plan : null;
}

function normalizeEvidence(raw: unknown): EvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isObj)
    .filter((e) => typeof e.id === "string" && isEvidenceType(e.type))
    .map((e) => ({
      ...(e as unknown as EvidenceItem),
      mission: typeof e.mission === "string" && e.mission ? e.mission : null,
      payload: isObj(e.payload) ? e.payload : {},
      media: Array.isArray(e.media) ? (e.media as EvidenceItem["media"]) : [],
      counted: bool(e.counted, false),
      after_close: bool(e.after_close, false),
      invalidated: bool(e.invalidated, false),
      local_date: str(e.local_date, typeof e.submitted_at === "string" ? ictDate(e.submitted_at) : ""),
    }));
}

/**
 * Step 8 for servers that do not send `daily` yet: distinct round days with a counted log, and
 * whether today has one (same rule as spec 2.3, from the evidence list).
 */
export function deriveDaily(evidence: EvidenceItem[], round: Pick<HomeRound, "starts_at" | "duration_days">, now: string): DailyHabit {
  const first = roundDayDate(round, 1);
  const last = roundDayDate(round, round.duration_days);
  const today = ictDate(now);
  const days = new Set<string>();
  let todayLogged = false;
  for (const e of evidence) {
    if (!e.counted || !e.local_date) continue;
    if (e.local_date >= first && e.local_date <= last) days.add(e.local_date);
    if (e.local_date === today) todayLogged = true;
  }
  return { days: days.size, need: round.duration_days, today_logged: todayLogged };
}

export function normalizeFlags(raw: unknown): RoundFlags {
  if (!isObj(raw)) return { ...DEFAULT_FLAGS };
  const url = typeof raw.web_base_url === "string" && /^https:\/\//.test(raw.web_base_url) ? raw.web_base_url.replace(/\/+$/, "") : DEFAULT_FLAGS.web_base_url;
  return {
    tab_enabled: bool(raw.tab_enabled, DEFAULT_FLAGS.tab_enabled),
    enrollment_enabled: bool(raw.enrollment_enabled, DEFAULT_FLAGS.enrollment_enabled),
    submissions_enabled: bool(raw.submissions_enabled, DEFAULT_FLAGS.submissions_enabled),
    transcription_enabled: bool(raw.transcription_enabled, DEFAULT_FLAGS.transcription_enabled),
    emergency_message: isObj(raw.emergency_message) ? (raw.emergency_message as RoundFlags["emergency_message"]) : null,
    web_base_url: url,
  };
}

/** `shift_round_home` data (spec 3.6 + scale spec 2.5). */
export function normalizeHome(raw: unknown): HomeBundle {
  const b = isObj(raw) ? raw : {};
  const now = str(b.now) || new Date().toISOString();
  const round = normalizeRound(b.round);
  const evidence = normalizeEvidence(b.evidence);
  let missions = normalizeCounts(b.missions);
  if (missions && !missions.daily && round && isObj(b.entry)) {
    missions = { ...missions, daily: deriveDaily(evidence, round, now) };
  }
  const nextRound = isObj(b.next_round) && typeof b.next_round.number === "number" && typeof b.next_round.starts_at === "string"
    ? { number: b.next_round.number, starts_at: b.next_round.starts_at }
    : null;
  return {
    now,
    flags: normalizeFlags(b.flags),
    entry: isObj(b.entry) && typeof b.entry.id === "string" ? (b.entry as unknown as HomeBundle["entry"]) : null,
    round,
    joinable: normalizeJoinable(b.joinable),
    next_round: nextRound,
    on_waitlist: bool(b.on_waitlist, false),
    missions,
    evidence,
    checkins_due: Array.isArray(b.checkins_due) ? (b.checkins_due as HomeBundle["checkins_due"]) : [],
    checkins_done: Array.isArray(b.checkins_done) ? (b.checkins_done as HomeBundle["checkins_done"]) : [],
    squad: isObj(b.squad) ? (b.squad as unknown as HomeBundle["squad"]) : null,
    certificate: isObj(b.certificate) ? (b.certificate as unknown as HomeBundle["certificate"]) : null,
    summary: isObj(b.summary) ? (b.summary as unknown as HomeBundle["summary"]) : null,
    past_certificates: Array.isArray(b.past_certificates) ? (b.past_certificates as HomeBundle["past_certificates"]) : [],
    plan: normalizePlan(b.plan, round?.duration_days),
  };
}

/** Submit receipt (spec 3.7) with counts in the new shape. */
export function normalizeReceipt(raw: unknown): Receipt {
  const r = isObj(raw) ? raw : {};
  return {
    ...(r as unknown as Receipt),
    replayed: bool(r.replayed, false),
    counted: bool(r.counted, true),
    after_close: bool(r.after_close, false),
    duplicate_label: bool(r.duplicate_label, false),
    missions: normalizeCounts(r.missions) ?? emptyMissionCounts(),
    newly_completed: Array.isArray(r.newly_completed) ? r.newly_completed.filter((k): k is string => typeof k === "string") : [],
  };
}
