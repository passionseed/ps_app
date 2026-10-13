/**
 * Next action, needs-attention priority and home state (DS1, DS3, DS4, DS5, spec 5.3/5.4).
 * Pure functions: the Shift home renders whatever these return.
 */
import type { CopyKey, CopyParams } from "./copy";
import { MISSION_NUMBER, orderedMissions } from "./missions";
import { countdown } from "./time";
import type {
  Checkpoint,
  EvidenceItem,
  EvidenceType,
  HomeBundle,
  JoinableRound,
  MissionCounts,
  MissionKey,
} from "./types";

export type NextAction =
  | {
      kind: "log";
      mission: MissionKey;
      missionNumber: number;
      type: EvidenceType;
      copyKey: CopyKey;
      params: CopyParams;
      voice: boolean;
      slots: { filled: boolean; label: number }[] | null;
    }
  | { kind: "all_done"; copyKey: CopyKey };

const VOICE_TYPES: EvidenceType[] = ["interview", "tester"];

/** First incomplete mission in SHIFT order (DS3), then its first incomplete part. */
export function nextAction(counts: MissionCounts | null | undefined, opts: { voiceEnabled?: boolean } = {}): NextAction {
  for (const mission of orderedMissions(counts)) {
    if (mission.complete) continue;
    const part = mission.parts.find((p) => p.have < p.need) ?? mission.parts[0];
    const type = part.type;
    const params: CopyParams = {};
    if (type === "interview" || type === "tester") params.n = Math.min(part.have + 1, part.need);
    const slots =
      part.need > 1
        ? Array.from({ length: part.need }, (_, i) => ({ filled: i < part.have, label: i + 1 }))
        : null;
    return {
      kind: "log",
      mission: mission.key,
      missionNumber: MISSION_NUMBER[mission.key],
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

export type HomeState =
  | { kind: "guest" }
  | { kind: "no_round"; nextRound: HomeBundle["next_round"]; onWaitlist: boolean }
  | { kind: "open"; joinable: JoinableRound }
  | { kind: "invite_only"; joinable: JoinableRound }
  | { kind: "join_closed"; joinable: JoinableRound; day: number }
  | { kind: "already_in_round"; joinable: JoinableRound }
  | { kind: "pre_start" }
  | { kind: "active" }
  | { kind: "review" }
  | { kind: "review_overdue" }
  | { kind: "not_eligible" }
  | { kind: "cert_issued" }
  | { kind: "cert_revoked" };

const OVERDUE_MS = 2 * 3_600_000;

/** Which Shift home layout to show (5.4 states table). */
export function homeState(home: HomeBundle | null, opts: { guest?: boolean } = {}): HomeState {
  if (opts.guest || !home) return { kind: "guest" };
  const { entry, round } = home;
  if (entry && round) {
    if (home.certificate && !home.certificate.tombstone) {
      return home.certificate.status === "revoked" ? { kind: "cert_revoked" } : { kind: "cert_issued" };
    }
    if (entry.outcome === "not_eligible") return { kind: "not_eligible" };
    if (round.phase === "upcoming") return { kind: "pre_start" };
    if (round.phase === "active") return { kind: "active" };
    const nowMs = Date.parse(home.now);
    if (nowMs > Date.parse(round.review_ends_at) + OVERDUE_MS) return { kind: "review_overdue" };
    if (round.phase === "review" || round.phase === "finished") return { kind: "review" };
  }
  const joinable = home.joinable?.[0];
  if (joinable) {
    if (joinable.can_join) return { kind: "open", joinable };
    if (joinable.reason === "invite_only") return { kind: "invite_only", joinable };
    if (joinable.reason === "already_in_active_round") return { kind: "already_in_round", joinable };
    return { kind: "join_closed", joinable, day: home.round?.join_cutoff_day ?? 7 };
  }
  return { kind: "no_round", nextRound: home.next_round, onWaitlist: home.on_waitlist };
}

/** Whether a home bundle describes an entry in an upcoming/active round (E16 reminder guard). */
export function hasActiveEntry(home: HomeBundle | null | undefined): boolean {
  return !!home?.entry && !!home.round && (home.round.phase === "upcoming" || home.round.phase === "active");
}

/** Hours/minutes left when within the last 24h (home) or 2h (composer). */
export function lastHours(home: HomeBundle, withinHours: number): { h: number; m: number } | null {
  if (!home.round || home.round.phase !== "active") return null;
  const c = countdown(home.now, home.round.closes_at);
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
