import { describe, expect, it } from "vitest";
import { currentStep, dailyDue, dayChips, steps, stepsDone } from "../lib/round/steps";
import type { MissionCounts } from "../lib/round/types";
import { allDone, counts } from "./fixtures/round";

/** Mockup C (day 2): ideas and problem done, interviews 2/3, both habits on track. */
const mockupC = () =>
  counts(
    { ideas: { ideas: 1 }, interviews: { interview: 2 }, problem: { problem_statement: 1 } },
    { daily: { days: 2, need: 7, today_logged: true }, sessions: { attended: 1, held: 1, total: 5 } },
  );

describe("steps model (9 ขั้นของ SHIFT)", () => {
  it("returns missions 1..7, then daily (8) and sessions (9), as in mockup C", () => {
    const list = steps(mockupC(), { lang: "th", day: 2 });
    expect(list.map((s) => [s.n, s.title, s.state, s.trailing])).toEqual([
      [1, "คิด 3 ไอเดีย แล้วเลือก 1", "done", "เสร็จแล้ว"],
      [2, "คุยกับคนที่เจอปัญหาจริง", "current", "2/3"],
      [3, "1 ปัญหา 1 กลุ่มคนใช้", "done", "เสร็จแล้ว"],
      [4, "สร้างต้นแบบที่คนอื่นลองได้", "todo", "ยังไม่ถึง"],
      [5, "ให้คนนอกลองใช้", "todo", "0/3"],
      [6, "ปรับจากที่คนลองบอก", "todo", "ยังไม่ถึง"],
      [7, "นำเสนอเดโม", "todo", "ยังไม่ถึง"],
      [8, "โพสต์ความคืบหน้าทุกวัน", "done", "2/2 วัน"],
      [9, "เข้าเซสชันทุกครั้ง", "done", "1/1 ครั้ง"],
    ]);
    expect(list.map((s) => s.kind)).toEqual(["mission", "mission", "mission", "mission", "mission", "mission", "mission", "daily", "sessions"]);
    expect(list[1]).toMatchObject({ missionKey: "interviews", type: "interview", have: 2, need: 3 });
    expect(stepsDone(list)).toBe(4);
    expect(currentStep(list)?.n).toBe(2);
  });

  it("marks only the first incomplete mission as current, in config order", () => {
    const list = steps(counts({ testers: { tester: 3 } }), { lang: "en", day: 3 });
    expect(list.filter((s) => s.state === "current").map((s) => s.missionKey)).toEqual(["ideas"]);
    expect(list.find((s) => s.missionKey === "testers")).toMatchObject({ state: "done", trailing: "Done" });
    expect(list[0]).toMatchObject({ state: "current", trailing: "0/1" });
    expect(currentStep(steps(allDone(), { lang: "th", day: 7 }))).toBeNull();
  });

  it("never counts today against the daily habit before the day ends", () => {
    const daily = (days: number, today_logged: boolean) => counts({}, { daily: { days, need: 7, today_logged } });
    expect(dailyDue(daily(1, false), 2)).toBe(1);
    expect(steps(daily(1, false), { lang: "th", day: 2 })[7]).toMatchObject({ state: "done", trailing: "1/1 วัน" });
    expect(steps(daily(2, true), { lang: "th", day: 2 })[7]).toMatchObject({ state: "done", trailing: "2/2 วัน" });
    expect(steps(daily(1, false), { lang: "th", day: 3 })[7]).toMatchObject({ state: "todo", trailing: "1/2 วัน" });
    expect(steps(daily(0, false), { lang: "th", day: 1 })[7]).toMatchObject({ state: "todo", trailing: "0/1 วัน" });
    expect(steps(daily(5, false), { lang: "en", day: 9 })[7]).toMatchObject({ state: "todo", trailing: "5/7 days" });
    expect(steps(daily(0, false), { lang: "th", day: 0 })[7]).toMatchObject({ state: "todo", trailing: "ยังไม่ถึง" });
  });

  it("counts sessions as attended over held (make-ups count on the server)", () => {
    const s = (attended: number, held: number) => counts({}, { sessions: { attended, held, total: 5 } });
    expect(steps(s(0, 0), { lang: "th", day: 1 })[8]).toMatchObject({ state: "todo", trailing: "ยังไม่ถึง" });
    expect(steps(s(1, 2), { lang: "th", day: 3 })[8]).toMatchObject({ state: "todo", trailing: "1/2 ครั้ง" });
    expect(steps(s(2, 2), { lang: "en", day: 3 })[8]).toMatchObject({ state: "done", trailing: "2/2 times" });
  });

  it("tolerates servers without habits", () => {
    const old = { ...counts(), daily: null, sessions: null };
    const list = steps(old, { lang: "th", day: 2 });
    expect(list[7]).toMatchObject({ state: "todo", trailing: "ยังไม่ถึง" });
    expect(list[8]).toMatchObject({ state: "todo", trailing: "ยังไม่ถึง" });
  });

  it("follows a custom config: n missions then the two habits, titles from the config", () => {
    const custom: MissionCounts = {
      missions: [
        { key: "interviews", n: 1, complete: false, title_th: null, title_en: null, parts: [{ type: "interview", have: 1, need: 5 }] },
        { key: "pitch_deck", n: 2, complete: false, title_th: "ทำสไลด์ขาย", title_en: "Pitch deck", parts: [{ type: "demo_post", have: 0, need: 1 }] },
      ],
      missions_complete: 0,
      missions_total: 2,
      people_talked_to: 1,
      eligible: false,
      daily: { days: 1, need: 14, today_logged: true },
      sessions: { attended: 0, held: 0, total: 3 },
    };
    const list = steps(custom, { lang: "en", day: 1 });
    expect(list.map((s) => [s.n, s.kind, s.title, s.trailing])).toEqual([
      [1, "mission", "Talk to people who have the problem", "1/5"],
      [2, "mission", "Pitch deck", "Not yet"],
      [3, "daily", "Post progress every day", "1/1 days"],
      [4, "sessions", "Join every session", "Not yet"],
    ]);
  });
});

describe("day chips (plan.days[d].steps on the steps model)", () => {
  const list = steps(mockupC(), { lang: "th", day: 2 });
  it("maps step numbers with live progress, habits included", () => {
    expect(dayChips({ steps: [2, 3, 8, 9] }, list)).toEqual([
      { n: 2, label: "คุยกับคนที่เจอปัญหาจริง 2/3", state: "progress" },
      { n: 3, label: "1 ปัญหา 1 กลุ่มคนใช้", state: "done" },
      { n: 8, label: "โพสต์ความคืบหน้าทุกวัน", state: "done" },
      { n: 9, label: "เข้าเซสชันทุกครั้ง", state: "done" },
    ]);
  });
  it("keeps missions only for the Home hero, skips unknown and repeated numbers", () => {
    expect(dayChips({ steps: [2, 3, 8, 9] }, list, { missionsOnly: true }).map((c) => c.n)).toEqual([2, 3]);
    expect(dayChips({ steps: [12, 4, 4] }, list)).toEqual([{ n: 4, label: "สร้างต้นแบบที่คนอื่นลองได้", state: "todo" }]);
    expect(dayChips({ steps: [5] }, list)).toEqual([{ n: 5, label: "ให้คนนอกลองใช้ 0/3", state: "todo" }]);
    expect(dayChips(null, list)).toEqual([]);
  });
});
