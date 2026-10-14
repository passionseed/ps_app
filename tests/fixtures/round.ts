import { emptyMissionCounts } from "../../lib/round/missions";
import type { EvidenceItem, HomeBundle, JoinableRound, MissionCounts, MissionKey, RoundPlan } from "../../lib/round/types";

export const ROUND_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";
export const ENTRY_ID = "33333333-3333-4333-8333-333333333333";

/**
 * Mission counts (SHIFT default config) with given parts filled, e.g. { testers: { tester: 3 } }.
 * Habits: pass `daily` / `sessions` to override.
 */
export function counts(
  fill: Partial<Record<MissionKey, Record<string, number>>> = {},
  habits: Partial<Pick<MissionCounts, "daily" | "sessions" | "people_talked_to">> = {},
): MissionCounts {
  const base = emptyMissionCounts();
  for (const m of base.missions) {
    const f = fill[m.key];
    if (!f) continue;
    for (const p of m.parts) if (f[p.type] !== undefined) p.have = f[p.type];
    m.complete = m.parts.every((p) => p.have >= p.need);
  }
  base.missions_complete = base.missions.filter((m) => m.complete).length;
  base.eligible = base.missions_complete === base.missions.length;
  return { ...base, ...habits };
}

/** Every mission of the SHIFT default complete. */
export function allDone(habits: Partial<Pick<MissionCounts, "daily" | "sessions">> = {}): MissionCounts {
  return counts(
    {
      ideas: { ideas: 1 },
      interviews: { interview: 3 },
      problem: { problem_statement: 1 },
      prototype: { mvp: 1 },
      testers: { tester: 3 },
      change: { change: 1 },
      demo: { demo_post: 1 },
    },
    habits,
  );
}

export function evidence(over: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "e1",
    type: "interview",
    status: "submitted",
    counted: true,
    after_close: false,
    invalidated: false,
    mission: "interviews",
    submitted_at: "2026-10-15T05:00:00Z",
    local_date: "2026-10-15",
    payload: { who_label: "ครู", occurred_on: "2026-10-15", key_point: "จดไม่ทัน" },
    media: [],
    status_reason_code: null,
    status_note: null,
    replaces_evidence_id: null,
    source_evidence_id: null,
    replaced_by: null,
    ...over,
  };
}

export function joinable(over: Partial<JoinableRound> = {}): JoinableRound {
  return {
    round_id: "44444444-4444-4444-8444-444444444444",
    number: 3,
    title_th: "SHIFT[3]",
    title_en: "SHIFT[3]",
    starts_at: "2026-10-20T17:00:00Z",
    closes_at: "2026-10-27T17:00:00Z",
    join_by: "2026-10-22T17:00:00Z",
    join_mode: "invite",
    can_join: false,
    reason: "invite_only",
    session_days: [1, 2, 4, 6, 7],
    session_start: "19:00",
    session_end: "21:00",
    duration_days: 7,
    ...over,
  };
}

/** SHIFT2-like plan (student-safe fields only). */
export function plan(over: Partial<RoundPlan> = {}): RoundPlan {
  return {
    source: "curriculum",
    rules: ["Discord อย่างเดียว"],
    interview: {
      intro: "คุยสั้น ๆ 10 นาที",
      dm: "สวัสดีครับ/ค่ะ เราเป็นนักเรียน",
      questions: ["ครั้งล่าสุดที่เจอเรื่องนี้คือเมื่อไหร่", "ตอนนั้นทำยังไง"],
      dos: ["ถามเรื่องที่เกิดขึ้นแล้ว"],
      donts: ["อย่าเล่าไอเดียของเราก่อน"],
    },
    days: [
      { day: 1, name: "3 ไอเดีย → เลือก 1", goal: "รู้จักกัน", mission: "คุยกับคนจริง 3 คน", steps: [1, 8, 9] },
      { day: 2, name: "ปัญหาจริงไหม + เริ่มหาคนลอง", goal: "เช็กว่าปัญหามีจริง", mission: "ทักคนตรง + โพสต์กลุ่ม Facebook อย่างน้อย 10 กลุ่ม", steps: [2, 3, 8, 9] },
      { day: 3, name: "Build Fast", goal: "สร้างต้นแบบ", mission: "ต้นแบบที่เปิดได้บนมือถือคนอื่น", steps: [4, 8] },
      { day: 7, name: "Demo Day", goal: "เดโมของจริง", mission: "โปรเจกต์ต่อหลังค่าย", steps: [7, 9] },
    ],
    ...over,
  };
}

/**
 * SHIFT[2]-like round: 7 days from Wed 14 Oct 2026 (ICT), sessions on days 1,2,4,6,7 at
 * 19:00-21:00. `now` is day 2 (Thu 15 Oct) at 12:00 ICT.
 */
export function bundle(over: Partial<HomeBundle> = {}): HomeBundle {
  return {
    now: "2026-10-15T05:00:00Z",
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
      joined_at: "2026-10-12T02:00:00Z",
      joined_day: 0,
      outcome: "in_progress",
      name_display: "handle",
      has_legal_name: false,
      summary_public: false,
    },
    round: {
      id: ROUND_ID,
      number: 2,
      title_th: "แก้ปัญหาใกล้ตัวที่โรงเรียน",
      title_en: "Fix a problem at school",
      brief_th: "brief",
      brief_en: "brief",
      starts_at: "2026-10-13T17:00:00Z",
      closes_at: "2026-10-20T17:00:00Z",
      review_ends_at: "2026-10-22T17:00:00Z",
      duration_days: 7,
      join_cutoff_day: 2,
      day: 2,
      phase: "active",
      discord_url: "https://discord.gg/x",
      join_mode: "invite",
      mentor_led: true,
      grace_minutes: 30,
      session_days: [1, 2, 4, 6, 7],
      session_start: "19:00",
      session_end: "21:00",
      application_cohort: "SHIFT[2]",
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
    plan: null,
    ...over,
  };
}
