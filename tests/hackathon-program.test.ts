import { describe, expect, it } from "vitest";

import {
  deriveModuleStatus,
  getChallengeSummary,
  summarizePhaseModules,
  type HackathonModuleProgress,
} from "../lib/hackathonProgram";
import type {
  HackathonChallenge,
  HackathonTeamProgramEnrollment,
  HackathonTrack,
} from "../types/hackathon-program";

function makeModule(
  overrides: Partial<HackathonModuleProgress> = {},
): HackathonModuleProgress {
  return {
    id: "module-1",
    phaseId: "phase-1",
    title: "Pain Point Definition",
    description: "Turn interview evidence into a sharp problem statement.",
    orderIndex: 1,
    isLocked: false,
    requiredIndividualCount: 4,
    completedIndividualCount: 0,
    requiresTeamSubmission: true,
    teamSubmissionStatus: "missing",
    ...overrides,
  };
}

describe("deriveModuleStatus", () => {
  it("marks locked modules as blocked", () => {
    expect(
      deriveModuleStatus(
        makeModule({
          isLocked: true,
        }),
      ),
    ).toBe("blocked");
  });

  it("marks untouched modules as not_started", () => {
    expect(deriveModuleStatus(makeModule())).toBe("not_started");
  });

  it("marks submitted team work as ready_for_review", () => {
    expect(
      deriveModuleStatus(
        makeModule({
          completedIndividualCount: 4,
          teamSubmissionStatus: "submitted",
        }),
      ),
    ).toBe("ready_for_review");
  });

  it("marks fully passed team work as completed", () => {
    expect(
      deriveModuleStatus(
        makeModule({
          completedIndividualCount: 4,
          teamSubmissionStatus: "passed",
        }),
      ),
    ).toBe("completed");
  });
});

describe("summarizePhaseModules", () => {
  it("counts each module status for the phase overview", () => {
    const summary = summarizePhaseModules([
      makeModule({ id: "blocked", isLocked: true }),
      makeModule({ id: "not-started" }),
      makeModule({
        id: "in-progress",
        completedIndividualCount: 2,
      }),
      makeModule({
        id: "review",
        completedIndividualCount: 4,
        teamSubmissionStatus: "submitted",
      }),
      makeModule({
        id: "done",
        completedIndividualCount: 4,
        teamSubmissionStatus: "passed",
      }),
    ]);

    expect(summary.total).toBe(5);
    expect(summary.blocked).toBe(1);
    expect(summary.notStarted).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.readyForReview).toBe(1);
    expect(summary.completed).toBe(1);
  });
});

describe("getChallengeSummary", () => {
  const track: HackathonTrack = {
    id: "track-1",
    title: "Mental Health",
    subtitle: "สุขภาพจิตและความเป็นอยู่ที่ดี",
    icon: "brain",
    color: "#A594BA",
    display_order: 2,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  };

  const challenge: HackathonChallenge = {
    id: "challenge-1",
    track_id: track.id,
    num: "P4",
    title_en: "The Stigma Wall",
    title_th: "กำแพงแห่งอคติ",
    hook_en: "Burnout is common, but students do not seek help.",
    hook_th: "นักศึกษาหลายคนหมดไฟแต่ไม่ขอความช่วยเหลือ",
    challenge_en: "Build stigma-free mental health support.",
    challenge_th: "สร้างการสนับสนุนสุขภาพจิตที่ไร้อคติ",
    tangible_equivalent_en: "Like hiding a broken leg.",
    tangible_equivalent_th: "เหมือนซ่อนขาหักไว้",
    tags: ["Youth", "Early Detection"],
    severity: 9,
    difficulty: 8,
    impact: 9,
    urgency: 9,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    track,
  };

  it("returns the selected challenge title and track label when available", () => {
    const enrollment = {
      id: "enrollment-1",
      team_id: "team-1",
      program_id: "program-1",
      current_phase_id: null,
      status: "active",
      started_at: null,
      completed_at: null,
      created_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-01T00:00:00.000Z",
      selected_challenge_id: challenge.id,
      selected_challenge: challenge,
    } satisfies HackathonTeamProgramEnrollment;

    expect(getChallengeSummary(enrollment)).toEqual({
      title: "The Stigma Wall",
      trackTitle: "Mental Health",
      promptLabel: "P4",
    });
  });

  it("returns null when no selected challenge is attached", () => {
    const enrollment = {
      id: "enrollment-2",
      team_id: "team-1",
      program_id: "program-1",
      current_phase_id: null,
      status: "active",
      started_at: null,
      completed_at: null,
      created_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-01T00:00:00.000Z",
      selected_challenge_id: null,
    } satisfies HackathonTeamProgramEnrollment;

    expect(getChallengeSummary(enrollment)).toBeNull();
  });
});
