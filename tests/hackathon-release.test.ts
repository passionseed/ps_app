import { describe, expect, it } from "vitest";

import {
  getCurrentReleasedPhase,
  isHackathonActivityAccessible,
  type HackathonReleaseStatus,
} from "../lib/hackathonRelease";
import type { HackathonProgramPhase } from "../types/hackathon-program";

function buildPhase(
  overrides: Partial<HackathonProgramPhase>,
): HackathonProgramPhase {
  return {
    id: "phase-1",
    program_id: "program-1",
    slug: "phase-1",
    title: "Phase 1",
    description: null,
    phase_number: 1,
    status: "locked",
    starts_at: null,
    ends_at: null,
    due_at: null,
    created_at: "2026-04-08T00:00:00.000Z",
    updated_at: "2026-04-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("hackathon release gating", () => {
  it("picks the current phase from released phases only", () => {
    const phases = [
      buildPhase({
        id: "phase-1",
        title: "Phase 1",
        phase_number: 1,
        status: "released",
        due_at: "2026-04-10T00:00:00.000Z",
      }),
      buildPhase({
        id: "phase-2",
        title: "Phase 2",
        phase_number: 2,
        status: "locked",
        due_at: "2026-04-20T00:00:00.000Z",
      }),
    ];

    expect(
      getCurrentReleasedPhase(phases, Date.parse("2026-04-08T12:00:00.000Z")),
    ).toMatchObject({
      id: "phase-1",
      title: "Phase 1",
    });
  });

  it("returns null when no phases are released yet", () => {
    const phases = [
      buildPhase({ id: "phase-1", status: "locked" }),
      buildPhase({ id: "phase-2", phase_number: 2, status: "locked" }),
    ];

    expect(getCurrentReleasedPhase(phases)).toBeNull();
  });

  it("blocks activities when either the phase or activity is not released", () => {
    expect(
      isHackathonActivityAccessible({
        phaseStatus: "locked",
        activityStatus: "released",
        previousActivitySubmissionStatus: null,
      }),
    ).toBe(false);

    expect(
      isHackathonActivityAccessible({
        phaseStatus: "released",
        activityStatus: "locked",
        previousActivitySubmissionStatus: null,
      }),
    ).toBe(false);
  });

  it("blocks later released activities until the prior activity is submitted or passed", () => {
    const released: HackathonReleaseStatus = "released";

    expect(
      isHackathonActivityAccessible({
        phaseStatus: released,
        activityStatus: released,
        previousActivitySubmissionStatus: "not_started",
      }),
    ).toBe(false);

    expect(
      isHackathonActivityAccessible({
        phaseStatus: released,
        activityStatus: released,
        previousActivitySubmissionStatus: "draft",
      }),
    ).toBe(false);

    expect(
      isHackathonActivityAccessible({
        phaseStatus: released,
        activityStatus: released,
        previousActivitySubmissionStatus: "submitted",
      }),
    ).toBe(true);

    expect(
      isHackathonActivityAccessible({
        phaseStatus: released,
        activityStatus: released,
        previousActivitySubmissionStatus: "passed",
      }),
    ).toBe(true);
  });

  it("allows the first activity when both the phase and activity are released", () => {
    expect(
      isHackathonActivityAccessible({
        phaseStatus: "released",
        activityStatus: "released",
        previousActivitySubmissionStatus: null,
      }),
    ).toBe(true);
  });
});
