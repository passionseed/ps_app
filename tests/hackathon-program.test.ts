import { describe, expect, it } from "vitest";

import {
  deriveModuleStatus,
  summarizePhaseModules,
  type HackathonModuleProgress,
} from "../lib/hackathonProgram";

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
