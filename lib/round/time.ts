/**
 * Bangkok clock for SHIFT rounds (E17, A19). ICT is UTC+7 with no DST, so we shift the
 * instant by +7h and read UTC fields. This is identical on every device time zone and does
 * not depend on Intl time-zone data being present in the JS engine.
 */
import type { Lang } from "./types";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

const WEEKDAYS: Record<Lang, string[]> = {
  th: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const MONTHS: Record<Lang, string[]> = {
  th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
export const MONTH_NAMES = MONTHS;

function toMs(ts: string | number | Date): number {
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return Date.parse(ts);
}

export type IctParts = {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
};

export function ictParts(ts: string | number | Date): IctParts {
  const d = new Date(toMs(ts) + ICT_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ICT calendar date `YYYY-MM-DD`. */
export function ictDate(ts: string | number | Date): string {
  const p = ictParts(ts);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** "26 ต.ค." / "26 Oct" */
export function formatDate(ts: string | number | Date, lang: Lang): string {
  const p = ictParts(ts);
  return `${p.day} ${MONTHS[lang][p.month - 1]}`;
}

/** Date-only string (YYYY-MM-DD, already ICT) to "26 ต.ค.". */
export function formatIsoDate(isoDate: string, lang: Lang): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${MONTHS[lang][m - 1]}`;
}

export function formatWeekday(ts: string | number | Date, lang: Lang): string {
  return WEEKDAYS[lang][ictParts(ts).weekday];
}

export function formatTime(ts: string | number | Date): string {
  const p = ictParts(ts);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Close is stored as 00:00 ICT on day duration+1; students see the last day at 23:59 (R15).
 * Returns params for `home.closes`.
 */
export function closeDisplay(closesAt: string, lang: Lang): { weekday: string; date: string; time: string } {
  const lastMinute = toMs(closesAt) - 60_000;
  return { weekday: formatWeekday(lastMinute, lang), date: formatDate(lastMinute, lang), time: "23:59" };
}

/** Params for `home.review.body` and similar `{date} {time}` copy. */
export function dateTimeDisplay(ts: string, lang: Lang): { date: string; time: string } {
  return { date: formatDate(ts, lang), time: formatTime(ts) };
}

export type Countdown = { totalMs: number; d: number; h: number; m: number };

export function countdown(from: string | number | Date, to: string | number | Date): Countdown {
  const totalMs = Math.max(0, toMs(to) - toMs(from));
  const totalMinutes = Math.floor(totalMs / 60_000);
  return {
    totalMs,
    d: Math.floor(totalMinutes / 1440),
    h: Math.floor((totalMinutes % 1440) / 60),
    m: totalMinutes % 60,
  };
}

/** "3 วัน 4 ชม." style countdown text for `home.pre_start`. */
export function formatCountdown(c: Countdown, lang: Lang): string {
  if (lang === "th") {
    if (c.d > 0) return `${c.d} วัน ${c.h} ชม.`;
    return `${c.h} ชม. ${c.m} นาที`;
  }
  if (c.d > 0) return `${c.d}d ${c.h}h`;
  return `${c.h}h ${c.m}m`;
}

/** Round day number in ICT (may be <= 0 before start or > duration after close). */
export function roundDay(startsAt: string, now: string | number | Date): number {
  const start = Date.parse(`${ictDate(startsAt)}T00:00:00Z`);
  const today = Date.parse(`${ictDate(now)}T00:00:00Z`);
  return Math.round((today - start) / 86_400_000) + 1;
}

/** Within the last N hours before close (used for `home.last_hours`, `capture.closing_soon`). */
export function withinHoursOfClose(closesAt: string, now: string | number | Date, hours: number): boolean {
  const left = toMs(closesAt) - toMs(now);
  return left > 0 && left <= hours * 3_600_000;
}

/** Recording timer "0:42". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}
