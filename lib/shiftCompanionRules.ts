export const SHIFT_TIME_ZONE = "Asia/Bangkok";
export const SHIFT_SESSION_LABEL = "19:00–21:00";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type CompanionLang = "en" | "th";

export type DailyUpdate = {
  id: string;
  author_id: string;
  author_name: string;
  mine: boolean;
  update_date: string;
  tried: string;
  learned: string | null;
  help: string | null;
  link: string | null;
  image_path: string | null;
  revision: number;
  edited: boolean;
  submitted_at: string;
  updated_at: string;
};

export type CompanionCohort = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string | null;
  mobile?: string | null;
};

export type CompanionStatus = {
  ok: true;
  linked: boolean;
  email: string | null;
  mobile: string | null;
  cohorts: CompanionCohort[];
};

export type PreviewResult =
  | { ok: true; cohort_name: string; starts_on: string; ends_on: string | null }
  | { ok: false; error: string; wait_minutes?: number };

export type ClaimResult =
  | { ok: true; already: boolean; user_id: string; cohort: CompanionCohort }
  | { ok: false; error: string; wait_minutes?: number };

export type SaveDailyResult =
  | { ok: true; update: DailyUpdate }
  | {
      ok: false;
      error: string;
      update_date?: string;
      server?: DailyUpdate;
      wait_minutes?: number;
    };

export type TodayResult =
  | {
      ok: true;
      cohort: CompanionCohort;
      today: string;
      deadline: string | null;
      session: string;
      window_open: boolean;
      window_reason: string | null;
      mine: DailyUpdate | null;
      history: DailyUpdate[];
    }
  | { ok: false; error: string };

export function bangkokClock(now = new Date()): {
  date: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHIFT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: hour === 24 ? 0 : hour,
    minute: Number(get("minute")),
  };
}

export function updateWindow(
  startsOn: string,
  endsOn: string | null,
  now = new Date(),
): { date: string; open: boolean; reason: string | null } {
  const clock = bangkokClock(now);
  if (clock.date < startsOn) {
    return { date: clock.date, open: false, reason: "before_cohort" };
  }
  if (endsOn && clock.date > endsOn) {
    return { date: clock.date, open: false, reason: "after_cohort" };
  }
  return { date: clock.date, open: true, reason: null };
}

export function normalizeCode(input: string): string | null {
  const canonical = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (canonical.length !== 12) return null;
  if ([...canonical].some((char) => !CODE_ALPHABET.includes(char))) return null;
  return canonical;
}

export function normalizeMobile(country: string, national: string): string | null {
  const cc = country.replace(/\D/g, "").replace(/^0+/, "");
  let nn = national.replace(/\D/g, "");
  if (nn.startsWith("0")) nn = nn.slice(1);
  if (!cc || cc.length > 3 || nn.length < 6 || nn.length > 12) return null;
  const full = `${cc}${nn}`;
  if (full.length < 8 || full.length > 15) return null;
  return `+${full}`;
}

export function validHttpLink(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type DailyDraftBody = {
  tried: string;
  learned: string;
  help: string;
  link: string;
};

export function validateDailyBody(body: DailyDraftBody): string | null {
  const tried = body.tried.trim();
  if (!tried) return "tried";
  if (tried.length > 2000) return "tried_length";
  if (body.learned.trim().length > 1000) return "learned_length";
  if (body.help.trim().length > 1000) return "help_length";
  if (!validHttpLink(body.link)) return "link";
  return null;
}

export function draftKey(userId: string, cohortId: string, date: string): string {
  return `shift-daily-draft:${userId}:${cohortId}:${date}`;
}

export function newIdempotencyKey(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function allowLoggedOutShiftLink(segments: readonly string[]): boolean {
  return segments[0] === "shift" && ["link", "sign-in"].includes(segments[1] ?? "");
}

export function companionEntryTarget(input: {
  linked: boolean;
  onboarded: boolean;
  segments: readonly string[];
}): "/shift/today" | "/shift/link" | null {
  const root = input.segments[0];
  const child = input.segments[1];
  const onFlow =
    root === "shift" &&
    ["link", "today", "update", "account", "history"].includes(child ?? "");
  if (!input.linked) {
    if (onFlow && child !== "link") return "/shift/link";
    return null;
  }
  // A link screen may be an in-progress claim for an additional cohort.
  if (onFlow) return null;
  if (!root || ["index", "onboarding", "welcome"].includes(root)) return "/shift/today";
  return null;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function formatBangkokDate(isoDate: string, lang: CompanionLang): string {
  if (!isIsoDate(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", {
    timeZone: SHIFT_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatBangkokTime(iso: string, lang: CompanionLang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", {
    timeZone: SHIFT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function sessionEmailConfirmed(
  user: { email?: string | null; email_confirmed_at?: string | null; confirmed_at?: string | null } | null,
  email: string,
): boolean {
  if (!user?.email) return false;
  const confirmed = user.email_confirmed_at;
  return !!confirmed && user.email.trim().toLowerCase() === email.trim().toLowerCase();
}
