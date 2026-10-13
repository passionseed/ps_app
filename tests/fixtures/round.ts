import { emptyMissionCounts } from "../../lib/round/missions";
import type { EvidenceItem, HomeBundle, MissionCounts, MissionKey } from "../../lib/round/types";

export const ROUND_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";
export const ENTRY_ID = "33333333-3333-4333-8333-333333333333";

/** Mission counts with given parts filled: e.g. { testers: { tester: 3 } }. */
export function counts(fill: Partial<Record<MissionKey, Record<string, number>>> = {}): MissionCounts {
  const base = emptyMissionCounts();
  for (const m of base.missions) {
    const f = fill[m.key];
    if (!f) continue;
    for (const p of m.parts) if (f[p.type] !== undefined) p.have = f[p.type];
    m.complete = m.parts.every((p) => p.have >= p.need);
  }
  base.missions_complete = base.missions.filter((m) => m.complete).length;
  base.eligible = base.missions_complete === 6;
  return base;
}

export function evidence(over: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "e1",
    type: "contact",
    status: "submitted",
    counted: true,
    after_close: false,
    invalidated: false,
    mission: "first_contact",
    submitted_at: "2026-11-12T05:00:00Z",
    local_date: "2026-11-12",
    payload: { who_label: "ครู", channel: "chat", occurred_on: "2026-11-12" },
    media: [],
    status_reason_code: null,
    status_note: null,
    replaces_evidence_id: null,
    source_evidence_id: null,
    replaced_by: null,
    ...over,
  };
}

export function bundle(over: Partial<HomeBundle> = {}): HomeBundle {
  return {
    now: "2026-11-15T05:00:00Z",
    flags: {
      tab_enabled: true,
      enrollment_enabled: true,
      submissions_enabled: true,
      transcription_enabled: false,
      emergency_message: null,
      web_base_url: "https://www.passionseed.org",
    },
    entry: {
      id: ENTRY_ID,
      round_id: ROUND_ID,
      track: "high_school",
      handle: "ต้น",
      joined_at: "2026-11-10T02:00:00Z",
      joined_day: 1,
      outcome: "in_progress",
      name_display: "handle",
      has_legal_name: false,
      summary_public: false,
    },
    round: {
      id: ROUND_ID,
      number: 4,
      title_th: "แก้ปัญหาใกล้ตัวที่โรงเรียน",
      title_en: "Fix a problem at school",
      brief_th: "brief",
      brief_en: "brief",
      starts_at: "2026-11-09T17:00:00Z",
      closes_at: "2026-11-23T17:00:00Z",
      review_ends_at: "2026-11-25T17:00:00Z",
      duration_days: 14,
      join_cutoff_day: 7,
      day: 6,
      phase: "active",
      discord_url: "https://discord.gg/x",
      join_mode: "invite",
      mentor_led: true,
      grace_minutes: 30,
    },
    joinable: [],
    next_round: null,
    on_waitlist: false,
    missions: counts(),
    evidence: [],
    checkins_due: [],
    checkins_done: [],
    squad: null,
    certificate: null,
    summary: null,
    past_certificates: [],
    ...over,
  };
}
