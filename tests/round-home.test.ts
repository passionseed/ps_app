import { describe, expect, it } from "vitest";
import { activeModel, applyUrl, homeKeyAction, homeView, landingFrom, preStartModel, showGuideCard, type HomeInput } from "../lib/round/home";
import type { ErrorCategory, HomeBundle, RoundError } from "../lib/round/types";
import { allDone, bundle, counts, joinable, plan } from "./fixtures/round";

const makeError = (code: string, category: ErrorCategory): RoundError => ({ code, category, field: null, retry_after: null, details: {}, request_id: null });
const signedIn = (b: HomeBundle | null, over: Partial<HomeInput> = {}): HomeInput => ({ signedIn: true, bundle: b, error: null, pending: false, ...over });
const view = (b: HomeBundle | null, over: Partial<HomeInput> = {}) => homeView(signedIn(b, over));
const noEntry = (over: Partial<HomeBundle> = {}) => bundle({ entry: null, round: null, missions: null, ...over });

// Day 2 of SHIFT[2] (Thu 15 Oct 2026, ICT). Session 19:00-21:00 ICT = 12:00-14:00 UTC.
const DAY2_NOON = "2026-10-15T05:00:00Z";
const DAY2_1930 = "2026-10-15T12:30:00Z";
const DAY2_2130 = "2026-10-15T14:30:00Z";
const DAY3_NOON = "2026-10-16T05:00:00Z";
const DAY5_NOON = "2026-10-18T05:00:00Z";
const DAY7_NOON = "2026-10-20T05:00:00Z";

describe("home state machine (scale spec 4.1)", () => {
  it("1. guest: signed out or session expired shows the landing with sign in", () => {
    expect(homeView({ signedIn: false, bundle: null, error: null, pending: false })).toEqual({
      kind: "guest",
      landing: { source: "builtin", round: null, cta: { kind: "sign_in" }, inviteLink: false, notice: null, nextRound: null, onWaitlist: false },
    });
    expect(view(null, { error: makeError("unauthenticated", "unauthenticated") }).kind).toBe("guest");
  });

  it("loads only while nothing is cached", () => {
    expect(view(null, { pending: true })).toEqual({ kind: "loading" });
  });

  it("D10: missing RPCs, flag off or a failed load show the built-in landing, never an error", () => {
    const missing = view(null, { error: makeError("unavailable", "unavailable") });
    expect(missing).toMatchObject({ kind: "landing", landing: { source: "builtin", cta: { kind: "apply", number: null }, notice: null } });
    expect(view(null, { error: makeError("offline", "offline") })).toMatchObject({ kind: "landing", landing: { notice: "offline" } });
    expect(view(null, { error: makeError("retryable", "retryable") })).toMatchObject({ kind: "landing", landing: { notice: "retry" } });
    const flagOff = bundle({ flags: { ...bundle().flags, tab_enabled: false } });
    expect(view(flagOff)).toMatchObject({ kind: "landing", landing: { source: "builtin", cta: { kind: "apply", number: null } } });
  });

  it("2. signed in, no entry: join when allowed, apply on the web when invite-only, else waitlist", () => {
    expect(view(noEntry({ joinable: [joinable({ can_join: true, reason: null })] }))).toMatchObject({
      kind: "landing",
      landing: { source: "server", cta: { kind: "join", number: 3 }, inviteLink: false, round: { number: 3 } },
    });
    expect(view(noEntry({ joinable: [joinable()] }))).toMatchObject({
      kind: "landing",
      landing: { cta: { kind: "apply", number: 3 }, inviteLink: true, notice: null },
    });
    expect(view(noEntry())).toMatchObject({ kind: "landing", landing: { round: null, cta: { kind: "waitlist" }, onWaitlist: false } });
    expect(view(noEntry({ on_waitlist: true }))).toMatchObject({ kind: "landing", landing: { cta: null, onWaitlist: true } });
  });

  it("2. landing notices: closed join, paused enrollment, already in a round", () => {
    expect(landingFrom(noEntry({ joinable: [joinable({ reason: "join_closed" })] }))).toMatchObject({
      cta: { kind: "apply", number: null },
      notice: "join_closed",
    });
    const paused = noEntry({ joinable: [joinable({ can_join: true, reason: null })], flags: { ...bundle().flags, enrollment_enabled: false } });
    expect(landingFrom(paused)).toMatchObject({ cta: null, notice: "enrollment_paused" });
    expect(landingFrom(noEntry({ joinable: [joinable({ reason: "already_in_active_round" })] }))).toMatchObject({ cta: null, notice: "already_in_round" });
    // A joinable round the student can join wins over an earlier invite-only one.
    const both = noEntry({ joinable: [joinable(), joinable({ round_id: "r5", number: 5, can_join: true, reason: null })] });
    expect(landingFrom(both).cta).toEqual({ kind: "join", roundId: "r5", number: 5 });
  });

  it("3-4. entry before day 1 and during the round", () => {
    expect(view(bundle({ round: { ...bundle().round!, phase: "upcoming" } })).kind).toBe("pre_start");
    expect(view(bundle()).kind).toBe("active");
  });

  it("5. review, overdue review, not eligible and certificates", () => {
    const round = bundle().round!;
    expect(view(bundle({ round: { ...round, phase: "review" }, now: "2026-10-21T05:00:00Z" })).kind).toBe("review");
    expect(view(bundle({ round: { ...round, phase: "finished" }, now: "2026-10-22T20:00:00Z" })).kind).toBe("review_overdue");
    expect(view(bundle({ entry: { ...bundle().entry!, outcome: "not_eligible" } }))).toMatchObject({ kind: "not_eligible", next: { cta: { kind: "waitlist" } } });
    const cert = { id: "c", public_id: "7K2M9QX4T8HBN3PD", status: "issued" as const, issued_at: "", revoked_at: null, tombstone: false, render_version: 1, verify_url: "" };
    expect(view(bundle({ certificate: cert }))).toEqual({ kind: "cert_issued", next: null });
    expect(view(bundle({ certificate: { ...cert, status: "revoked" } }))).toEqual({ kind: "cert_revoked", next: null });
    expect(view(bundle({ certificate: { ...cert, tombstone: true } })).kind).toBe("active");
    // Alumni see the next shift under their certificate.
    expect(view(bundle({ certificate: cert, joinable: [joinable()] }))).toMatchObject({ kind: "cert_issued", next: { cta: { kind: "apply", number: 3 } } });
  });

  it("an entry without its round falls back to the landing", () => {
    expect(view(bundle({ round: null })).kind).toBe("landing");
  });
});

describe("active home model (state 4, mockup B)", () => {
  const day2 = (over: Partial<HomeBundle> = {}) =>
    bundle({ plan: plan(), missions: counts({ ideas: { ideas: 1 }, interviews: { interview: 2 }, problem: { problem_statement: 1 } }, { daily: { days: 2, need: 7, today_logged: true }, sessions: { attended: 1, held: 1, total: 5 } }), ...over });

  it("titles the day from the plan with tag, Thai date and the day strip", () => {
    const m = activeModel(day2(), DAY2_NOON, "th")!;
    expect(m.day).toBe(2);
    expect(m.tag).toBe("SHIFT[2] · DAY 2");
    expect(m.dateLabel).toBe("พฤ. 15 ต.ค.");
    expect(m.title).toBe("ปัญหาจริงไหม + เริ่มหาคนลอง");
    expect(m.strip.map((c) => [c.day, c.state, c.label, c.session])).toEqual([
      [1, "done", "พ.", true],
      [2, "today", "วันนี้", true],
      [3, "future", "ศ.", false],
      [4, "future", "ส.", true],
      [5, "future", "อา.", false],
      [6, "future", "จ.", true],
      [7, "future", "เดโม", true],
    ]);
  });

  it("shows the mission before tomorrow with live step chips (missions only) and 4/9 steps", () => {
    const m = activeModel(day2(), DAY2_NOON, "th")!;
    expect(m.hero.tag).toBe("ภารกิจก่อน Day 3");
    expect(m.hero.text).toBe("ทักคนตรง + โพสต์กลุ่ม Facebook อย่างน้อย 10 กลุ่ม");
    expect(m.hero.chips).toEqual([
      { n: 2, label: "คุยกับคนที่เจอปัญหาจริง 2/3", state: "progress" },
      { n: 3, label: "1 ปัญหา 1 กลุ่มคนใช้", state: "done" },
    ]);
    expect(m.steps.length).toBe(9);
    expect(m.stepsDone).toBe(4);
    expect(m.nextText).toBe("คุยกับคนจริงอีก 1 คน");
    expect(m.showGuide).toBe(true);
    expect(m.keyAction).toMatchObject({ type: "interview", labelKey: "home.cta.interview", icon: "pencil" });
  });

  it("session card: upcoming, live, ended, and no session today", () => {
    expect(activeModel(day2(), DAY2_NOON, "th")!.session).toMatchObject({ kind: "upcoming", window: { day: 2, start: Date.parse("2026-10-15T12:00:00Z") } });
    expect(activeModel(day2(), DAY2_1930, "th")!.session.kind).toBe("live");
    expect(activeModel(day2(), DAY2_2130, "th")!.session).toMatchObject({ kind: "ended", next: { day: 4 } });
    expect(activeModel(day2(), DAY3_NOON, "th")!.session).toMatchObject({ kind: "none", next: { day: 4 } });
  });

  it("the last day says after SHIFT; without a plan the title is the round title and the text the next step", () => {
    expect(activeModel(day2(), DAY7_NOON, "th")!.hero.tag).toBe("หลัง SHIFT");
    const noPlan = activeModel(day2({ plan: null }), DAY2_NOON, "en")!;
    expect(noPlan.title).toBe("Fix a problem at school");
    expect(noPlan.hero.text).toBe("Talk to real people (1 to go)");
    expect(noPlan.hero.chips).toEqual([]);
  });

  it("guide card on days 1-4 or while interviews/testers are open", () => {
    expect(showGuideCard(5, counts({ interviews: { interview: 3 } }))).toBe(true);
    expect(showGuideCard(5, allDone())).toBe(false);
    expect(showGuideCard(2, allDone())).toBe(true);
    expect(activeModel(day2({ missions: allDone() }), DAY5_NOON, "th")!.showGuide).toBe(false);
  });
});

describe("next action (the Shift key)", () => {
  const round = { session_end: "21:00" };
  it("is the next mission's type, with voice for interviews when transcription is on", () => {
    expect(homeKeyAction(counts(), { round, now: DAY2_NOON, voiceEnabled: false })).toMatchObject({ type: "ideas", labelKey: "home.cta.ideas" });
    expect(homeKeyAction(counts({ ideas: { ideas: 1 } }), { round, now: DAY2_NOON, voiceEnabled: true })).toMatchObject({ type: "interview", icon: "mic" });
  });
  it("switches to today's update after the session when today is not logged, or when all missions are done", () => {
    const notLogged = counts({}, { daily: { days: 1, need: 7, today_logged: false } });
    expect(homeKeyAction(notLogged, { round, now: DAY2_NOON, voiceEnabled: false }).type).toBe("ideas");
    expect(homeKeyAction(notLogged, { round, now: DAY2_2130, voiceEnabled: false })).toMatchObject({ type: "daily", labelKey: "home.cta.daily" });
    const logged = counts({}, { daily: { days: 2, need: 7, today_logged: true } });
    expect(homeKeyAction(logged, { round, now: DAY2_2130, voiceEnabled: false }).type).toBe("ideas");
    expect(homeKeyAction(allDone(), { round, now: DAY2_NOON, voiceEnabled: false }).type).toBe("daily");
  });
});

describe("pre-start and apply", () => {
  it("counts down to the first session (day 1 at 19:00 Bangkok)", () => {
    const m = preStartModel(bundle({ round: { ...bundle().round!, phase: "upcoming" } }), "th")!;
    expect(m.first).toMatchObject({ day: 1, start: Date.parse("2026-10-14T12:00:00Z") });
    expect(m.startsAt).toBe(Date.parse("2026-10-14T12:00:00Z"));
    expect(m.tag).toBe("SHIFT[2]");
    const noSessions = preStartModel(bundle({ round: { ...bundle().round!, session_days: [] } }), "th")!;
    expect(noSessions.first).toBeNull();
    expect(noSessions.startsAt).toBe(Date.parse("2026-10-13T17:00:00Z"));
  });

  it("opens the web apply page for round N (D8)", () => {
    expect(applyUrl("https://www.passionseed.org", 3)).toBe("https://www.passionseed.org/shift/apply?round=3");
    expect(applyUrl("https://www.passionseed.org/", null)).toBe("https://www.passionseed.org/shift/apply");
  });
});
