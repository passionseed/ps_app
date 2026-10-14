/**
 * Mission metadata shared by home, steps, log, mission and composer screens.
 * Missions come from the round config (`shift_rounds.missions`, scale spec 2.1): keys are
 * dynamic, `n` is the 1-based position in the config, and each evidence type belongs to at most
 * one mission. Known keys have copy; unknown keys use the config's `title_th` / `title_en`.
 */
import { t, type CopyKey } from "./copy";
import type { EvidenceItem, EvidenceType, Lang, Mission, MissionCounts, MissionKey } from "./types";
import { KNOWN_MISSION_KEYS } from "./types";

export type MissionPartConfig = { type: EvidenceType; need: number; distinct?: boolean };
export type MissionConfig = { key: MissionKey; parts: MissionPartConfig[]; title_th?: string | null; title_en?: string | null };

/** SHIFT default, same as `shift_round_private.default_missions()` (spec 2.1): SHIFT steps 1 to 7. */
export const DEFAULT_MISSIONS: readonly MissionConfig[] = [
  { key: "ideas", parts: [{ type: "ideas", need: 1 }] },
  { key: "interviews", parts: [{ type: "interview", need: 3, distinct: true }] },
  { key: "problem", parts: [{ type: "problem_statement", need: 1 }] },
  { key: "prototype", parts: [{ type: "mvp", need: 1 }] },
  { key: "testers", parts: [{ type: "tester", need: 3, distinct: true }] },
  { key: "change", parts: [{ type: "change", need: 1 }] },
  { key: "demo", parts: [{ type: "demo_post", need: 1 }] },
];

/** SHIFT template (D2). */
export const DEFAULT_DURATION_DAYS = 7;
export const DEFAULT_SESSION_DAYS: readonly number[] = [1, 2, 4, 6, 7];
export const DEFAULT_SESSION_START = "19:00";
export const DEFAULT_SESSION_END = "21:00";

/** Logs that never belong to a mission (D4): first contact and the Daily Show. */
export const FREE_TYPES: readonly EvidenceType[] = ["contact", "daily"];

/**
 * Counts before join or before the server sends any (previews): the SHIFT default with nothing done.
 * Habits start at zero for the default 7-day template.
 */
export function emptyMissionCounts(
  config: readonly MissionConfig[] = DEFAULT_MISSIONS,
  opts: { durationDays?: number; sessionDays?: readonly number[] } = {},
): MissionCounts {
  const missions: Mission[] = config.map((m, i) => ({
    key: m.key,
    n: i + 1,
    complete: false,
    title_th: m.title_th ?? null,
    title_en: m.title_en ?? null,
    parts: m.parts.map((p) => ({ type: p.type, have: 0, need: p.need })),
  }));
  return {
    missions,
    missions_complete: 0,
    missions_total: missions.length,
    people_talked_to: 0,
    eligible: false,
    daily: { days: 0, need: opts.durationDays ?? DEFAULT_DURATION_DAYS, today_logged: false },
    sessions: { attended: 0, held: 0, total: (opts.sessionDays ?? DEFAULT_SESSION_DAYS).length },
  };
}

/** Missions in config order (`n`), falling back to the SHIFT default before any counts exist. */
export function orderedMissions(counts: MissionCounts | null | undefined): Mission[] {
  const source = counts?.missions?.length ? counts.missions : emptyMissionCounts().missions;
  return [...source].sort((a, b) => a.n - b.n);
}

export function missionByKey(counts: MissionCounts | null | undefined, key: string | null | undefined): Mission | null {
  if (!key) return null;
  return orderedMissions(counts).find((m) => m.key === key) ?? null;
}

/** The mission an evidence type counts toward, or null for free logs (and types not in the config). */
export function missionForType(counts: MissionCounts | null | undefined, type: EvidenceType): Mission | null {
  return orderedMissions(counts).find((m) => m.parts.some((p) => p.type === type)) ?? null;
}

export function missionTypes(mission: Pick<Mission, "parts">): EvidenceType[] {
  return mission.parts.map((p) => p.type);
}

/** Sum of capped progress over all parts (a part never shows more than it needs). */
export function missionProgress(mission: Pick<Mission, "parts">): { have: number; need: number } {
  return mission.parts.reduce(
    (acc, p) => ({ have: acc.have + Math.min(p.have, p.need), need: acc.need + p.need }),
    { have: 0, need: 0 },
  );
}

export function isKnownMissionKey(key: string | null | undefined): key is (typeof KNOWN_MISSION_KEYS)[number] {
  return !!key && (KNOWN_MISSION_KEYS as readonly string[]).includes(key);
}

/**
 * Copy key for a mission's short title. Unknown keys get the generic "Mission {n}" key; prefer
 * `missionTitle()` when the mission (and its config titles) is at hand.
 */
export function missionTitleKey(key: string | null | undefined): CopyKey {
  if (!key) return "mission.title.free";
  return isKnownMissionKey(key) ? (`mission.title.${key}` as CopyKey) : "mission.title.custom";
}

/** Short mission title: known keys use copy, unknown keys the config title, else "Mission {n}". */
export function missionTitle(
  lang: Lang,
  mission: Pick<Mission, "key" | "n"> & Partial<Pick<Mission, "title_th" | "title_en">> | null | undefined,
): string {
  if (!mission) return t(lang, "mission.title.free");
  if (isKnownMissionKey(mission.key)) return t(lang, `mission.title.${mission.key}` as CopyKey);
  const own = lang === "en" ? mission.title_en || mission.title_th : mission.title_th || mission.title_en;
  return own?.trim() ? own.trim() : t(lang, "mission.title.custom", { n: mission.n });
}

/** Position of a mission key in the given counts, else in the SHIFT default, else null. */
export function missionNumber(counts: MissionCounts | null | undefined, key: string | null | undefined): number | null {
  if (!key) return null;
  const own = counts?.missions?.find((m) => m.key === key);
  if (own) return own.n;
  const index = DEFAULT_MISSIONS.findIndex((m) => m.key === key);
  return index >= 0 ? index + 1 : null;
}

export function typeKey(type: EvidenceType): CopyKey {
  return `type.${type}` as CopyKey;
}

export type MissionDisplay =
  | { state: "done" }
  | { state: "not_yet"; need: number }
  | { state: "needs_more"; n: number }
  | { state: "credit_removed"; n: number };

/**
 * Display state for one mission (5.4 Mission row). "credit_removed" when the mission is
 * incomplete and one of its logs was sent back or stopped counting (DS8: calm, no lock wording).
 */
export function missionDisplay(mission: Mission, evidence: EvidenceItem[] = []): MissionDisplay {
  if (mission.complete) return { state: "done" };
  const missing = mission.parts.reduce((sum, p) => sum + Math.max(0, p.need - p.have), 0);
  const have = mission.parts.reduce((sum, p) => sum + Math.min(p.have, p.need), 0);
  const lostCredit = evidence.some(
    (e) =>
      e.mission === mission.key &&
      (e.status === "rejected" || e.invalidated) &&
      !e.replaced_by,
  );
  if (lostCredit) return { state: "credit_removed", n: missing };
  if (have === 0) return { state: "not_yet", need: missing };
  return { state: "needs_more", n: missing };
}
