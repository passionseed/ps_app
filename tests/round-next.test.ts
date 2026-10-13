import { describe, expect, it } from "vitest";
import { missionDisplay, orderedMissions } from "../lib/round/missions";
import { changeSources, hasActiveEntry, homeState, lastHours, needsAttention, nextAction, recentLabels } from "../lib/round/next";
import { bundle, counts, evidence } from "./fixtures/round";

describe("next action (DS3)", () => {
  it("starts with the first contact", () => {
    const next = nextAction(counts());
    expect(next).toMatchObject({ kind: "log", mission: "first_contact", type: "contact", copyKey: "home.next.contact", missionNumber: 1 });
  });

  it("asks for interview n of 3 with slots, then the problem statement", () => {
    const next = nextAction(counts({ first_contact: { contact: 1 }, interviews_problem: { interview: 1 } }));
    expect(next).toMatchObject({ type: "interview", copyKey: "home.next.interview", params: { n: 2 } });
    expect(next.kind === "log" && next.slots).toEqual([
      { filled: true, label: 1 },
      { filled: false, label: 2 },
      { filled: false, label: 3 },
    ]);
    const problem = nextAction(counts({ first_contact: { contact: 1 }, interviews_problem: { interview: 3 } }));
    expect(problem).toMatchObject({ type: "problem_statement", slots: null });
  });

  it("follows SHIFT order even when a later mission is done first (testers-first student)", () => {
    const testersFirst = counts({ testers: { tester: 3 } });
    expect(nextAction(testersFirst)).toMatchObject({ mission: "first_contact" });
    const almost = counts({
      first_contact: { contact: 1 },
      interviews_problem: { interview: 3, problem_statement: 1 },
      mvp: { mvp: 1 },
      testers: { tester: 3 },
      demo_post: { demo_post: 1 },
    });
    expect(nextAction(almost)).toMatchObject({ mission: "change", copyKey: "home.next.change" });
  });

  it("offers voice only for interviews/testers and only when transcription is on", () => {
    const c = counts({ first_contact: { contact: 1 } });
    expect(nextAction(c, { voiceEnabled: true })).toMatchObject({ voice: true });
    expect(nextAction(c, { voiceEnabled: false })).toMatchObject({ voice: false });
    expect(nextAction(counts(), { voiceEnabled: true })).toMatchObject({ voice: false });
  });

  it("reports all done", () => {
    const all = counts({
      first_contact: { contact: 1 },
      interviews_problem: { interview: 3, problem_statement: 1 },
      mvp: { mvp: 1 },
      testers: { tester: 3 },
      change: { change: 1 },
      demo_post: { demo_post: 1 },
    });
    expect(nextAction(all)).toEqual({ kind: "all_done", copyKey: "home.next.all_done" });
  });
});

describe("needs attention (DS1, DS5)", () => {
  const rejected = evidence({ id: "r1", status: "rejected", status_reason_code: "duplicate", counted: false, submitted_at: "2026-11-14T05:00:00Z" });
  it("prefers the newest rejected item without a replacement", () => {
    const older = evidence({ id: "r0", status: "rejected", submitted_at: "2026-11-13T05:00:00Z", counted: false });
    const b = bundle({ evidence: [older, rejected], checkins_due: ["join"] });
    expect(needsAttention(b, b.now)).toEqual({ kind: "rejected", evidence: rejected });
  });
  it("skips replaced or old rejections, then shows the first due check-in", () => {
    const replaced = { ...rejected, replaced_by: "new" };
    const old = evidence({ id: "r2", status: "rejected", submitted_at: "2026-11-01T05:00:00Z" });
    const b = bundle({ evidence: [replaced, old], checkins_due: ["join", "midpoint"] });
    expect(needsAttention(b, b.now)).toEqual({ kind: "checkin", checkpoint: "join" });
    expect(needsAttention(bundle(), "2026-11-15T05:00:00Z")).toBeNull();
  });
});

describe("home state (5.4)", () => {
  it("covers entry states", () => {
    expect(homeState(bundle()).kind).toBe("active");
    expect(homeState(bundle({ round: { ...bundle().round!, phase: "upcoming" } })).kind).toBe("pre_start");
    expect(homeState(bundle({ round: { ...bundle().round!, phase: "review" }, now: "2026-11-24T05:00:00Z" })).kind).toBe("review");
    expect(homeState(bundle({ round: { ...bundle().round!, phase: "finished" }, now: "2026-11-25T20:00:00Z" })).kind).toBe("review_overdue");
    expect(homeState(bundle({ entry: { ...bundle().entry!, outcome: "not_eligible" } })).kind).toBe("not_eligible");
    const cert = { id: "c", public_id: "7K2M9QX4T8HBN3PD", status: "issued" as const, issued_at: "", revoked_at: null, tombstone: false, render_version: 1, verify_url: "" };
    expect(homeState(bundle({ certificate: cert })).kind).toBe("cert_issued");
    expect(homeState(bundle({ certificate: { ...cert, status: "revoked" } })).kind).toBe("cert_revoked");
  });
  it("covers not-joined states", () => {
    const j = { round_id: "r", number: 5, title_th: "", title_en: "", starts_at: "", closes_at: "", join_by: "", join_mode: "invite" as const, can_join: true, reason: null };
    expect(homeState(bundle({ entry: null, joinable: [j] })).kind).toBe("open");
    expect(homeState(bundle({ entry: null, joinable: [{ ...j, can_join: false, reason: "invite_only" }] })).kind).toBe("invite_only");
    expect(homeState(bundle({ entry: null, joinable: [{ ...j, can_join: false, reason: "join_closed" }] })).kind).toBe("join_closed");
    expect(homeState(bundle({ entry: null, round: null })).kind).toBe("no_round");
    expect(homeState(null).kind).toBe("guest");
  });
  it("knows when an entry is active and when the close is near", () => {
    expect(hasActiveEntry(bundle())).toBe(true);
    expect(hasActiveEntry(bundle({ round: { ...bundle().round!, phase: "review" } }))).toBe(false);
    expect(lastHours(bundle({ now: "2026-11-23T15:00:00Z" }), 2)).toEqual({ h: 2, m: 0 });
    expect(lastHours(bundle(), 24)).toBeNull();
  });
});

describe("mission display and pickers", () => {
  it("shows credit removed calmly after a rejection (DS8)", () => {
    const c = counts({ testers: { tester: 2 } });
    const testers = orderedMissions(c).find((m) => m.key === "testers")!;
    expect(missionDisplay(testers, [])).toEqual({ state: "needs_more", n: 1 });
    expect(missionDisplay(testers, [evidence({ type: "tester", mission: "testers", status: "rejected" })])).toEqual({ state: "credit_removed", n: 1 });
    expect(missionDisplay(orderedMissions(counts()).find((m) => m.key === "mvp")!, [])).toEqual({ state: "not_yet", need: 1 });
  });
  it("lists recent labels and counted change sources", () => {
    const items = [
      evidence({ id: "a", type: "interview", mission: "interviews_problem", payload: { who_label: "ครู" }, submitted_at: "2026-11-12T01:00:00Z" }),
      evidence({ id: "b", type: "interview", mission: "interviews_problem", payload: { who_label: "ครู " }, submitted_at: "2026-11-13T01:00:00Z" }),
      evidence({ id: "c", type: "tester", mission: "testers", payload: { who_label: "รุ่นน้อง" }, counted: false }),
    ];
    expect(recentLabels(items, ["interview"])).toEqual(["ครู "]);
    expect(changeSources(items).map((e) => e.id)).toEqual(["b", "a"]);
  });
});
