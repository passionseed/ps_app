/**
 * Next action and needs-attention priority (DS1, DS3, DS5, spec 5.3; scale spec 4.1).
 * Pure functions: the Home screen renders whatever these return. The Home state machine itself
 * lives in `lib/round/home.ts`.
 */
import type { CopyKey, CopyParams } from "./copy";
import { orderedMissions } from "./missions";
import { countdown } from "./time";
import type { Checkpoint, EvidenceItem, EvidenceType, HomeBundle, MissionCounts } from "./types";

export type NextAction =
  | {
      kind: "log";
      mission: string;
      /** The mission's 1-based position in the round config. */
      missionNumber: number;
      type: EvidenceType;
      copyKey: CopyKey;
      /** n = the next item number, need, left = still missing for this part. */
      params: CopyParams;
      voice: boolean;
      slots: { filled: boolean; label: number }[] | null;
    }
  | { kind: "all_done"; copyKey: CopyKey };

const VOICE_TYPES: EvidenceType[] = ["interview", "tester"];

/**
 * First incomplete mission in config order (DS3, missions are met in any order), then its first
 * incomplete part.
 */
export function nextAction(counts: MissionCounts | null | undefined, opts: { voiceEnabled?: boolean } = {}): NextAction {
  for (const mission of orderedMissions(counts)) {
    if (mission.complete) continue;
    const part = mission.parts.find((p) => p.have < p.need) ?? mission.parts[0];
    const type = part.type;
    const have = Math.min(part.have, part.need);
    const params: CopyParams = { n: Math.min(have + 1, part.need), need: part.need, left: Math.max(1, part.need - have) };
    const slots =
      part.need > 1
        ? Array.from({ length: part.need }, (_, i) => ({ filled: i < have, label: i + 1 }))
        : null;
    return {
      kind: "log",
      mission: mission.key,
      missionNumber: mission.n,
      type,
      copyKey: `home.next.${type}` as CopyKey,
      params,
      voice: !!opts.voiceEnabled && VOICE_TYPES.includes(type),
      slots,
    };
  }
  return { kind: "all_done", copyKey: "home.next.all_done" };
}

export type Attention =
  | { kind: "rejected"; evidence: EvidenceItem }
  | { kind: "checkin"; checkpoint: Checkpoint }
  | null;

const WEEK_MS = 7 * 86_400_000;

/** Newest rejected item without a replacement (last 7 days), else first due check-in (DS1, DS5). */
export function needsAttention(
  home: Pick<HomeBundle, "evidence" | "checkins_due">,
  now: string | number | Date,
): Attention {
  const nowMs = typeof now === "string" ? Date.parse(now) : now instanceof Date ? now.getTime() : now;
  const rejected = home.evidence
    .filter((e) => e.status === "rejected" && !e.replaced_by)
    .filter((e) => nowMs - Date.parse(e.status_changed_at ?? e.submitted_at) <= WEEK_MS)
    .sort((a, b) =>
      Date.parse(b.status_changed_at ?? b.submitted_at) - Date.parse(a.status_changed_at ?? a.submitted_at),
    );
  if (rejected[0]) return { kind: "rejected", evidence: rejected[0] };
  if (home.checkins_due?.[0]) return { kind: "checkin", checkpoint: home.checkins_due[0] };
  return null;
}

/** Whether a home bundle describes an entry in an upcoming/active round (E16 reminder guard). */
export function hasActiveEntry(home: HomeBundle | null | undefined): boolean {
  return !!home?.entry && !!home.round && (home.round.phase === "upcoming" || home.round.phase === "active");
}

/** Hours/minutes left when within the last N hours before close (home 24h, composer 2h). */
export function lastHours(home: HomeBundle, withinHours: number, now: string | number | Date = home.now): { h: number; m: number } | null {
  if (!home.round || home.round.phase !== "active") return null;
  const c = countdown(now, home.round.closes_at);
  if (c.totalMs <= 0 || c.totalMs > withinHours * 3_600_000) return null;
  return { h: c.d * 24 + c.h, m: c.m };
}

/** Recent who labels of a type, newest first, for chips and duplicate warnings (E19). */
export function recentLabels(evidence: EvidenceItem[], types: EvidenceType[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of [...evidence].sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))) {
    if (!types.includes(e.type)) continue;
    const label = typeof e.payload?.who_label === "string" ? (e.payload.who_label as string) : "";
    const key = label.trim().toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/** Up to 5 counted interview/tester logs that can be a change source (5.5). */
export function changeSources(evidence: EvidenceItem[]): EvidenceItem[] {
  return evidence
    .filter((e) => (e.type === "interview" || e.type === "tester") && e.counted)
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
    .slice(0, 5);
}
