import { describe, expect, it } from "vitest";
import { normalizeCounts, normalizeHome, normalizePlan, normalizeReceipt } from "../lib/round/normalize";
import { BUILTIN_INTERVIEW, interviewGuide, planDay } from "../lib/round/plan";
import { normalizeClock } from "../lib/round/schedule";
import { bundle, evidence, plan } from "./fixtures/round";

/** What `shift_curriculum.content` looks like to mentors (with mentor-only fields). */
const mentorDoc = {
  source: "curriculum",
  sessionTime: "19:00–21:00",
  rules: ["Discord อย่างเดียว"],
  interview: { intro: "คุยสั้น ๆ", dm: "สวัสดีครับ/ค่ะ", questions: ["q1", "q2"], dos: ["d1"], donts: ["n1"], mentorNote: "secret" },
  days: [
    {
      day: 1,
      date: "2026-10-14",
      name: "3 ไอเดีย → เลือก 1",
      goal: "รู้จักกัน",
      mission: "คุยกับคน 3 คน",
      steps: [1, 8, 9],
      schedule: [["19:00", "Park", "กติกา"]],
      mentorChecks: ["DM คนที่ยังเลือกไม่ได้"],
    },
    { day: 9, name: "beyond the round", goal: "", mission: "", steps: [8] },
  ],
};

describe("plan normalization (spec 2.5): student-safe fields only", () => {
  it("never carries mentor-only fields, even if a server sends them", () => {
    const p = normalizePlan(mentorDoc, 7)!;
    const json = JSON.stringify(p);
    for (const leak of ["mentorChecks", "schedule", "date", "sessionTime", "mentorNote", "secret", "DM คนที่ยังเลือกไม่ได้"]) {
      expect(json, leak).not.toContain(leak);
    }
    expect(p.days).toEqual([{ day: 1, name: "3 ไอเดีย → เลือก 1", goal: "รู้จักกัน", mission: "คุยกับคน 3 คน", steps: [1, 8, 9] }]);
    expect(p.interview).toEqual({ intro: "คุยสั้น ๆ", dm: "สวัสดีครับ/ค่ะ", questions: ["q1", "q2"], dos: ["d1"], donts: ["n1"] });
    expect(p.source).toBe("curriculum");
  });

  it("clamps strings and arrays and drops bad days and step numbers", () => {
    const p = normalizePlan({
      rules: Array.from({ length: 30 }, (_, i) => `r${i}`),
      days: [{ day: 2, name: "x".repeat(2500), goal: 5, mission: null, steps: [2, 0, 21, 3.5, "4", 3] }, { day: 2, name: "dup" }, { day: 0 }, "nope"],
    })!;
    expect(p.rules.length).toBe(20);
    expect(p.days).toEqual([{ day: 2, name: "x".repeat(2000), goal: "", mission: "", steps: [2, 3] }]);
    expect(p.interview).toBeNull();
    expect(p.source).toBe("default");
  });

  it("is null when absent or empty", () => {
    expect(normalizePlan(null)).toBeNull();
    expect(normalizePlan("plan")).toBeNull();
    expect(normalizePlan({ days: [], rules: [] })).toBeNull();
  });
});

describe("plan fallback (scale spec 4.1)", () => {
  it("the guide uses the plan's interview, else the built-in SHIFT2 guide", () => {
    expect(interviewGuide(plan(), "en")).toEqual({ guide: plan().interview, source: "plan" });
    expect(interviewGuide(null, "th")).toEqual({ guide: BUILTIN_INTERVIEW.th, source: "builtin" });
    expect(interviewGuide(plan({ interview: null }), "en").guide).toBe(BUILTIN_INTERVIEW.en);
    expect(interviewGuide(plan({ interview: { intro: "", dm: " ", questions: [], dos: [], donts: [] } }), "th").source).toBe("builtin");
    expect(BUILTIN_INTERVIEW.th.questions).toHaveLength(5);
    expect(BUILTIN_INTERVIEW.en.questions).toHaveLength(5);
    expect(BUILTIN_INTERVIEW.th.dm).toContain("[ปัญหา]");
  });

  it("finds a plan day, or nothing (day screens then show only the session line)", () => {
    expect(planDay(plan(), 2)?.name).toBe("ปัญหาจริงไหม + เริ่มหาคนลอง");
    expect(planDay(plan(), 5)).toBeNull();
    expect(planDay(null, 1)).toBeNull();
  });
});

describe("bundle normalization (older servers and caches)", () => {
  it("fills the scale fields an older home bundle lacks", () => {
    const old = JSON.parse(JSON.stringify(bundle())) as Record<string, unknown>;
    const round = old.round as Record<string, unknown>;
    delete round.session_days;
    delete round.session_start;
    delete round.session_end;
    delete round.application_cohort;
    delete old.plan;
    old.missions = {
      missions: [{ key: "first_contact", n: 1, complete: true, parts: [{ type: "contact", have: 1, need: 1 }] }],
      missions_complete: 1,
      people_talked_to: 1,
      eligible: false,
    };
    old.evidence = [evidence({ local_date: "2026-10-14" }), evidence({ id: "e2", local_date: "2026-10-15" }), evidence({ id: "e3", local_date: "2026-10-15", counted: false })];
    const b = normalizeHome(old);
    expect(b.round).toMatchObject({ session_days: [1, 2, 4, 6, 7], session_start: "19:00", session_end: "21:00", application_cohort: null });
    expect(b.plan).toBeNull();
    expect(b.missions).toMatchObject({ missions_total: 1, sessions: null, daily: { days: 2, need: 7, today_logged: true } });
    expect(b.missions!.missions[0]).toMatchObject({ key: "first_contact", title_th: null, title_en: null });
  });

  it("normalizes Postgres times, session days and partial joinable rows", () => {
    expect(normalizeClock("19:00:00", "x")).toBe("19:00");
    expect(normalizeClock("7:05", "x")).toBe("07:05");
    expect(normalizeClock("25:00", "21:00")).toBe("21:00");
    const b = normalizeHome({
      now: "2026-10-15T05:00:00Z",
      flags: { tab_enabled: true },
      round: { ...bundle().round, session_days: [7, 1, 1, 9, 0], session_start: "18:30:00", duration_days: 7 },
      joinable: [{ round_id: "r", number: 3, can_join: true }],
    });
    expect(b.round).toMatchObject({ session_days: [1, 7], session_start: "18:30" });
    expect(b.joinable[0]).toMatchObject({ number: 3, can_join: true, reason: null, duration_days: 7, session_days: [1, 2, 4, 6, 7], session_start: "19:00" });
    expect(b.flags).toMatchObject({ tab_enabled: true, submissions_enabled: true, web_base_url: "https://www.passionseed.org" });
    expect(b.evidence).toEqual([]);
    expect(b.entry).toBeNull();
  });

  it("drops unknown evidence types and keeps free logs without a mission", () => {
    const b = normalizeHome({
      ...bundle(),
      evidence: [evidence({ id: "d", type: "daily", mission: null }), { ...evidence({ id: "x" }), type: "selfie" }, { ...evidence({ id: "c", type: "contact" }), mission: undefined }],
    });
    expect(b.evidence.map((e) => [e.id, e.mission])).toEqual([
      ["d", null],
      ["c", null],
    ]);
  });

  it("normalizes counts and receipts in the new shape", () => {
    const c = normalizeCounts({
      missions: [
        { key: "b", n: 2, parts: [{ type: "tester", have: 3, need: 3 }] },
        { key: "a", n: 1, complete: false, parts: [{ type: "interview", have: 1, need: 3 }, { type: "selfie", have: 1, need: 1 }] },
        { key: "", parts: [] },
      ],
      daily: { days: 3, need: 7, today_logged: false },
      sessions: { attended: 2, held: 3, total: 5 },
    })!;
    expect(c.missions.map((m) => [m.key, m.n, m.complete, m.parts.length])).toEqual([
      ["a", 1, false, 1],
      ["b", 2, true, 1],
    ]);
    expect(c).toMatchObject({ missions_complete: 1, missions_total: 2, eligible: false, daily: { days: 3 }, sessions: { held: 3 } });
    expect(normalizeCounts({ missions: [] })).toBeNull();
    const r = normalizeReceipt({ evidence_id: "e", missions: { missions: [{ key: "ideas", n: 1, parts: [{ type: "ideas", have: 1, need: 1 }] }] }, newly_completed: ["ideas", 4] });
    expect(r).toMatchObject({ evidence_id: "e", counted: true, after_close: false, newly_completed: ["ideas"], missions: { missions_total: 1 } });
  });
});
