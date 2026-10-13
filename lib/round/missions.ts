/** Mission metadata shared by home, log, mission and composer screens (spec 2.4, DS3). */
import type { CopyKey } from "./copy";
import type { EvidenceItem, EvidenceType, Mission, MissionCounts, MissionKey } from "./types";
import { MISSION_KEYS } from "./types";

export const MISSION_NUMBER: Record<MissionKey, number> = {
  first_contact: 1,
  interviews_problem: 2,
  mvp: 3,
  testers: 4,
  change: 5,
  demo_post: 6,
};

export const MISSION_TYPES: Record<MissionKey, EvidenceType[]> = {
  first_contact: ["contact"],
  interviews_problem: ["interview", "problem_statement"],
  mvp: ["mvp"],
  testers: ["tester"],
  change: ["change"],
  demo_post: ["demo_post"],
};

export const TYPE_MISSION: Record<EvidenceType, MissionKey> = {
  contact: "first_contact",
  interview: "interviews_problem",
  problem_statement: "interviews_problem",
  mvp: "mvp",
  tester: "testers",
  change: "change",
  demo_post: "demo_post",
};

/** Default requirement when the server has not sent counts yet (e.g. before join). */
const DEFAULT_PARTS: Record<MissionKey, { type: EvidenceType; need: number }[]> = {
  first_contact: [{ type: "contact", need: 1 }],
  interviews_problem: [
    { type: "interview", need: 3 },
    { type: "problem_statement", need: 1 },
  ],
  mvp: [{ type: "mvp", need: 1 }],
  testers: [{ type: "tester", need: 3 }],
  change: [{ type: "change", need: 1 }],
  demo_post: [{ type: "demo_post", need: 1 }],
};

export function emptyMissionCounts(): MissionCounts {
  return {
    missions: MISSION_KEYS.map((key) => ({
      key,
      n: MISSION_NUMBER[key],
      complete: false,
      parts: DEFAULT_PARTS[key].map((p) => ({ type: p.type, have: 0, need: p.need })),
    })),
    missions_complete: 0,
    people_talked_to: 0,
    eligible: false,
  };
}

/** Missions in SHIFT order regardless of server ordering. */
export function orderedMissions(counts: MissionCounts | null | undefined): Mission[] {
  const source = counts?.missions?.length ? counts : emptyMissionCounts();
  return MISSION_KEYS.map(
    (key) => source.missions.find((m) => m.key === key) ?? emptyMissionCounts().missions[MISSION_NUMBER[key] - 1],
  );
}

export function missionTitleKey(key: MissionKey): CopyKey {
  return `mission.${MISSION_NUMBER[key]}` as CopyKey;
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
