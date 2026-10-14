import { describe, expect, it } from "vitest";
import { emptyMissionCounts, missionDisplay, missionForType, missionNumber, missionTitle, missionTitleKey, orderedMissions } from "../lib/round/missions";
import { changeSources, hasActiveEntry, lastHours, needsAttention, nextAction, recentLabels } from "../lib/round/next";
import { feedLine } from "../lib/round/squadCopy";
import type { MissionCounts } from "../lib/round/types";
import { allDone, bundle, counts, evidence } from "./fixtures/round";

/** A custom round config (spec 2.1): different keys, order and needs; one unknown key with titles. */
function customCounts(): MissionCounts {
  return {
    missions: [
      { key: "testers", n: 2, complete: false, title_th: null, title_en: null, parts: [{ type: "tester", have: 0, need: 5 }] },
      { key: "interviews", n: 1, complete: true, title_th: null, title_en: null, parts: [{ type: "interview", have: 2, need: 2 }] },
      {
        key: "pitch_deck",
        n: 3,
        complete: false,
        title_th: "ทำสไลด์ขาย",
        title_en: "Pitch deck",
        parts: [{ type: "demo_post", have: 0, need: 1 }],
      },
    ],
    missions_complete: 1,
    missions_total: 3,
    people_talked_to: 2,
    eligible: false,
    daily: null,
    sessions: null,
  };
}

describe("next action with config missions (DS3, scale spec 2.1)", () => {
  it("starts with the ideas step in the SHIFT default", () => {
    expect(nextAction(counts())).toMatchObject({ kind: "log", mission: "ideas", type: "ideas", copyKey: "home.next.ideas", missionNumber: 1 });
  });

  it("asks for the remaining interviews with slots", () => {
    const next = nextAction(counts({ ideas: { ideas: 1 }, interviews: { interview: 1 } }));
    expect(next).toMatchObject({ type: "interview", copyKey: "home.next.interview", params: { n: 2, need: 3, left: 2 } });
    expect(next.kind === "log" && next.slots).toEqual([
      { filled: true, label: 1 },
      { filled: false, label: 2 },
      { filled: false, label: 3 },
    ]);
    expect(nextAction(counts({ ideas: { ideas: 1 }, interviews: { interview: 3 } }))).toMatchObject({ type: "problem_statement", slots: null });
  });

  it("follows config order (n), not server array order or a fixed list", () => {
    const next = nextAction(customCounts());
    expect(next).toMatchObject({ kind: "log", mission: "testers", missionNumber: 2, type: "tester", params: { left: 5 } });
    const testersDone = customCounts();
    testersDone.missions[0] = { ...testersDone.missions[0], complete: true, parts: [{ type: "tester", have: 5, need: 5 }] };
    expect(nextAction(testersDone)).toMatchObject({ mission: "pitch_deck", missionNumber: 3, type: "demo_post" });
  });

  it("follows SHIFT order even when a later mission is done first (testers-first student)", () => {
    expect(nextAction(counts({ testers: { tester: 3 } }))).toMatchObject({ mission: "ideas" });
    const almost = counts({
      ideas: { ideas: 1 },
      interviews: { interview: 3 },
      problem: { problem_statement: 1 },
      prototype: { mvp: 1 },
      testers: { tester: 3 },
      demo: { demo_post: 1 },
    });
    expect(nextAction(almost)).toMatchObject({ mission: "change", missionNumber: 6, copyKey: "home.next.change" });
  });

  it("offers voice only for interviews/testers and only when transcription is on", () => {
    const c = counts({ ideas: { ideas: 1 } });
    expect(nextAction(c, { voiceEnabled: true })).toMatchObject({ voice: true });
    expect(nextAction(c, { voiceEnabled: false })).toMatchObject({ voice: false });
    expect(nextAction(counts(), { voiceEnabled: true })).toMatchObject({ voice: false });
  });

  it("reports all done", () => {
    expect(nextAction(allDone())).toEqual({ kind: "all_done", copyKey: "home.next.all_done" });
  });
});

describe("mission metadata", () => {
  it("keeps the SHIFT default for previews (7 missions, habits at zero)", () => {
    const empty = emptyMissionCounts();
    expect(empty.missions.map((m) => m.key)).toEqual(["ideas", "interviews", "problem", "prototype", "testers", "change", "demo"]);
    expect(empty.missions_total).toBe(7);
    expect(empty.daily).toEqual({ days: 0, need: 7, today_logged: false });
    expect(empty.sessions).toEqual({ attended: 0, held: 0, total: 5 });
    expect(orderedMissions(null).length).toBe(7);
  });

  it("titles known keys from copy and unknown keys from the config", () => {
    const c = customCounts();
    expect(missionTitle("th", c.missions[0])).toBe("ให้คนนอกลองใช้");
    expect(missionTitle("en", c.missions[1])).toBe("Talk to people who have the problem");
    expect(missionTitle("en", c.missions[2])).toBe("Pitch deck");
    expect(missionTitle("th", c.missions[2])).toBe("ทำสไลด์ขาย");
    expect(missionTitle("en", { key: "x_y", n: 4, title_th: null, title_en: null })).toBe("Mission 4");
    expect(missionTitle("th", null)).toBe("บันทึกทั่วไป");
    expect(missionTitleKey("ideas")).toBe("mission.title.ideas");
    expect(missionTitleKey("pitch_deck")).toBe("mission.title.custom");
    expect(missionTitleKey(null)).toBe("mission.title.free");
  });

  it("maps evidence types to missions from the config; free logs have none", () => {
    expect(missionForType(counts(), "problem_statement")?.key).toBe("problem");
    expect(missionForType(counts(), "contact")).toBeNull();
    expect(missionForType(counts(), "daily")).toBeNull();
    expect(missionForType(customCounts(), "demo_post")?.key).toBe("pitch_deck");
    expect(missionNumber(customCounts(), "testers")).toBe(2);
    expect(missionNumber(null, "testers")).toBe(5);
    expect(missionNumber(null, "pitch_deck")).toBeNull();
  });

  it("numbers squad mission lines from the config", () => {
    const item = { handle: "ต้น", kind: "mission_completed" as const, type: null, n: 9, mission: "testers" };
    expect(feedLine("th", item, customCounts())).toBe("ต้น: ภารกิจ 2 สำเร็จ");
    expect(feedLine("th", item)).toBe("ต้น: ภารกิจ 5 สำเร็จ");
    expect(feedLine("en", { ...item, mission: "unknown_key" })).toBe("ต้น finished Mission 9");
    expect(feedLine("en", { handle: "Ton", kind: "evidence_logged", type: "daily", n: null })).toBe("Ton posted today's update");
  });
});

describe("needs attention (DS1, DS5)", () => {
  const rejected = evidence({ id: "r1", status: "rejected", status_reason_code: "duplicate", counted: false, submitted_at: "2026-10-14T05:00:00Z" });
  it("prefers the newest rejected item without a replacement", () => {
    const older = evidence({ id: "r0", status: "rejected", submitted_at: "2026-10-13T05:00:00Z", counted: false });
    const b = bundle({ evidence: [older, rejected], checkins_due: ["join"] });
    expect(needsAttention(b, b.now)).toEqual({ kind: "rejected", evidence: rejected });
  });
  it("skips replaced or old rejections, then shows the first due check-in", () => {
    const replaced = { ...rejected, replaced_by: "new" };
    const old = evidence({ id: "r2", status: "rejected", submitted_at: "2026-10-01T05:00:00Z" });
    const b = bundle({ evidence: [replaced, old], checkins_due: ["join", "midpoint"] });
    expect(needsAttention(b, b.now)).toEqual({ kind: "checkin", checkpoint: "join" });
    expect(needsAttention(bundle(), "2026-10-15T05:00:00Z")).toBeNull();
  });
});

describe("active entry and close", () => {
  it("knows when an entry is active and when the close is near", () => {
    expect(hasActiveEntry(bundle())).toBe(true);
    expect(hasActiveEntry(bundle({ round: { ...bundle().round!, phase: "review" } }))).toBe(false);
    expect(lastHours(bundle({ now: "2026-10-20T15:00:00Z" }), 2)).toEqual({ h: 2, m: 0 });
    expect(lastHours(bundle(), 24)).toBeNull();
    expect(lastHours(bundle(), 24, "2026-10-20T10:30:00Z")).toEqual({ h: 6, m: 30 });
  });
});

describe("mission display and pickers", () => {
  it("shows credit removed calmly after a rejection (DS8)", () => {
    const c = counts({ testers: { tester: 2 } });
    const testers = orderedMissions(c).find((m) => m.key === "testers")!;
    expect(missionDisplay(testers, [])).toEqual({ state: "needs_more", n: 1 });
    expect(missionDisplay(testers, [evidence({ type: "tester", mission: "testers", status: "rejected" })])).toEqual({ state: "credit_removed", n: 1 });
    expect(missionDisplay(orderedMissions(counts()).find((m) => m.key === "prototype")!, [])).toEqual({ state: "not_yet", need: 1 });
  });
  it("lists recent labels and counted change sources", () => {
    const items = [
      evidence({ id: "a", type: "interview", mission: "interviews", payload: { who_label: "ครู" }, submitted_at: "2026-10-14T01:00:00Z" }),
      evidence({ id: "b", type: "interview", mission: "interviews", payload: { who_label: "ครู " }, submitted_at: "2026-10-15T01:00:00Z" }),
      evidence({ id: "c", type: "tester", mission: "testers", payload: { who_label: "รุ่นน้อง" }, counted: false }),
    ];
    expect(recentLabels(items, ["interview"])).toEqual(["ครู "]);
    expect(changeSources(items).map((e) => e.id)).toEqual(["b", "a"]);
  });
});
