/**
 * Round calendar in Bangkok time (scale spec D2, 2.1, 2.3): which round day it is, which days
 * have a mentor session, and where today's session stands. Pure; every function takes `now`.
 */
import { DEFAULT_SESSION_END, DEFAULT_SESSION_START } from "./missions";
import { addDays, formatWeekday, ictDate, roundDay } from "./time";
import type { HomeRound, JoinableRound, Lang } from "./types";

type RoundClock = Pick<HomeRound, "starts_at" | "duration_days" | "session_days" | "session_start" | "session_end">;

const CLOCK = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

/** "19:00:00" (Postgres `time`) or "19:00" to "19:00"; anything else to the fallback. */
export function normalizeClock(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const match = value.trim().match(CLOCK);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

/** Epoch ms of a Bangkok wall-clock time on an ICT calendar date (Bangkok has no DST). */
export function bangkokMs(isoDate: string, clock: string): number {
  return Date.parse(`${isoDate}T${normalizeClock(clock, "00:00")}:00+07:00`);
}

/** ICT date (YYYY-MM-DD) of round day `day` (day 1 = the start date). */
export function roundDayDate(round: Pick<HomeRound, "starts_at">, day: number): string {
  return addDays(ictDate(round.starts_at), day - 1);
}

/** Round day for `now` (may be <= 0 before start or > duration after close). */
export function currentDay(round: Pick<HomeRound, "starts_at">, now: string | number | Date): number {
  return roundDay(round.starts_at, now);
}

export function isSessionDay(round: Pick<HomeRound, "session_days">, day: number): boolean {
  return round.session_days.includes(day);
}

export type SessionWindow = { day: number; start: number; end: number };

export function sessionWindow(round: RoundClock, day: number): SessionWindow | null {
  if (!isSessionDay(round, day) || day < 1 || day > round.duration_days) return null;
  const date = roundDayDate(round, day);
  const start = bangkokMs(date, round.session_start || DEFAULT_SESSION_START);
  let end = bangkokMs(date, round.session_end || DEFAULT_SESSION_END);
  if (!(end > start)) end = start + 2 * 3_600_000;
  return { day, start, end };
}

export function sessionWindows(round: RoundClock): SessionWindow[] {
  return [...round.session_days]
    .sort((a, b) => a - b)
    .map((d) => sessionWindow(round, d))
    .filter((w): w is SessionWindow => !!w);
}

/** First session of the round (state 3 countdown). */
export function firstSession(round: RoundClock): SessionWindow | null {
  return sessionWindows(round)[0] ?? null;
}

/** The next session that has not ended yet. */
export function nextSession(round: RoundClock, now: string | number | Date): SessionWindow | null {
  const ms = toMs(now);
  return sessionWindows(round).find((w) => w.end > ms) ?? null;
}

export type TodaySession =
  | { kind: "upcoming"; window: SessionWindow }
  | { kind: "live"; window: SessionWindow }
  | { kind: "ended"; window: SessionWindow; next: SessionWindow | null }
  | { kind: "none"; next: SessionWindow | null };

/** Today's session card (scale spec 4.1 state 4): before start, during, after, or no session today. */
export function todaySession(round: RoundClock, now: string | number | Date): TodaySession {
  const ms = toMs(now);
  const day = currentDay(round, now);
  const window = sessionWindow(round, day);
  if (!window) return { kind: "none", next: nextSession(round, now) };
  if (ms < window.start) return { kind: "upcoming", window };
  if (ms < window.end) return { kind: "live", window };
  return { kind: "ended", window, next: nextSession(round, now) };
}

/**
 * True once today's Bangkok clock has passed the session end time, on any day: the evening
 * "post today's update" moment (the no-log nudge runs right after, at 21:15 by default).
 */
export function afterSessionEnd(round: Pick<HomeRound, "session_end">, now: string | number | Date): boolean {
  const ms = toMs(now);
  return ms >= bangkokMs(ictDate(ms), round.session_end || DEFAULT_SESSION_END);
}

export type DayCellState = "done" | "today" | "future" | "missed";
export type DayCell = { day: number; label: string; state: DayCellState; session: boolean };

const TODAY_LABEL: Record<Lang, string> = { th: "วันนี้", en: "Today" };
const DEMO_LABEL: Record<Lang, string> = { th: "เดโม", en: "Demo" };

/**
 * Day strip cells (DayStrip props): past days done, today highlighted, session dots, the last
 * day labelled as the demo. Rounds longer than 7 days show a 7-day window around today.
 */
export function dayStrip(round: RoundClock, now: string | number | Date, lang: Lang, size = 7): DayCell[] {
  const today = currentDay(round, now);
  const total = Math.max(1, round.duration_days);
  let first = 1;
  if (total > size) first = Math.min(Math.max(1, today - Math.floor(size / 2)), total - size + 1);
  const last = Math.min(total, first + size - 1);
  const cells: DayCell[] = [];
  for (let day = first; day <= last; day++) {
    const state: DayCellState = day < today ? "done" : day === today ? "today" : "future";
    const label =
      state === "today"
        ? TODAY_LABEL[lang]
        : day === total
          ? DEMO_LABEL[lang]
          : formatWeekday(Date.parse(`${roundDayDate(round, day)}T05:00:00Z`), lang);
    cells.push({ day, label, state, session: isSessionDay(round, day) });
  }
  return cells;
}

/** Landing/round card: number of session evenings and the start time. */
export function sessionSummary(round: Pick<JoinableRound, "session_days" | "session_start">): { count: number; time: string } {
  return { count: round.session_days.length, time: normalizeClock(round.session_start, DEFAULT_SESSION_START) };
}

function toMs(ts: string | number | Date): number {
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return Date.parse(ts);
}
