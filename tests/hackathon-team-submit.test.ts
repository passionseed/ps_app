import { beforeEach, describe, expect, it, vi } from "vitest";

const readHackathonParticipant = vi.fn();

type TeamMembershipRow = { participant_id: string; team_id?: string };
type SubmissionRow = { participant_id: string; activity_id: string; status: string };

let memberRows: TeamMembershipRow[] = [];
let teamSubmissionRows: SubmissionRow[] = [];

const supabaseState = {
  deleteEq: vi.fn(),
  insertSingle: vi.fn(),
  activityMaybeSingle: vi.fn(),
  assessmentMaybeSingle: vi.fn(),
  membershipMaybeSingle: vi.fn(),
  memberCountSelectEq: vi.fn(),
  scoreEventInsert: vi.fn(),
  existingScoreEventMaybeSingle: vi.fn(),
  existingTeamScoreMaybeSingle: vi.fn(),
  updateEq: vi.fn(),
  teamScoreInsert: vi.fn(),
  from: vi.fn((table: string) => {
    if (table === "hackathon_phase_activity_submissions") {
      return {
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: supabaseState.deleteEq,
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: supabaseState.insertSingle,
          })),
        })),
        select: vi.fn(() => ({
          in: vi.fn((column: string, participantIds: string[]) => {
            if (column === "participant_id") {
              return {
                in: vi.fn((activityColumn: string, activityIds: string[]) => {
                  if (activityColumn !== "activity_id") {
                    throw new Error(`Unexpected second in column ${activityColumn}`);
                  }
                  return Promise.resolve({
                    data: teamSubmissionRows.filter(
                      (row) =>
                        participantIds.includes(row.participant_id) &&
                        activityIds.includes(row.activity_id),
                    ),
                    error: null,
                  });
                }),
              };
            }

            throw new Error(`Unexpected in on hackathon_phase_activity_submissions: ${column}`);
          }),
        })),
      };
    }

    if (table === "hackathon_phase_activities") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: supabaseState.activityMaybeSingle,
          })),
        })),
      };
    }

    if (table === "hackathon_phase_activity_assessments") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: supabaseState.assessmentMaybeSingle,
          })),
        })),
      };
    }

    if (table === "hackathon_team_members") {
      return {
        select: vi.fn((columns?: string, options?: { count?: string; head?: boolean }) => {
          if (options?.head) {
            return {
              eq: supabaseState.memberCountSelectEq,
            };
          }

          return {
            eq: vi.fn((column: string, value: string) => {
              if (column === "participant_id") {
                return { maybeSingle: supabaseState.membershipMaybeSingle };
              }

              if (column === "team_id") {
                return Promise.resolve({
                  data: memberRows.filter((row) => row.team_id === value),
                  error: null,
                });
              }

              throw new Error(`Unexpected eq on hackathon_team_members: ${column}=${value}`);
            }),
          };
        }),
      };
    }

    if (table === "hackathon_team_score_events") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: supabaseState.existingScoreEventMaybeSingle,
              })),
            })),
          })),
        })),
        insert: supabaseState.scoreEventInsert,
      };
    }

    if (table === "hackathon_team_scores") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: supabaseState.existingTeamScoreMaybeSingle,
          })),
        })),
        update: vi.fn(() => ({
          eq: supabaseState.updateEq,
        })),
        insert: supabaseState.teamScoreInsert,
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  }),
  setMemberRows(rows: TeamMembershipRow[]) {
    memberRows = rows;
  },
  setTeamSubmissionRows(rows: SubmissionRow[]) {
    teamSubmissionRows = rows;
  },
  reset() {
    memberRows = [];
    teamSubmissionRows = [];
    supabaseState.from.mockClear();
    supabaseState.deleteEq.mockReset();
    supabaseState.insertSingle.mockReset();
    supabaseState.activityMaybeSingle.mockReset();
    supabaseState.assessmentMaybeSingle.mockReset();
    supabaseState.membershipMaybeSingle.mockReset();
    supabaseState.memberCountSelectEq.mockReset();
    supabaseState.scoreEventInsert.mockReset();
    supabaseState.existingScoreEventMaybeSingle.mockReset();
    supabaseState.existingTeamScoreMaybeSingle.mockReset();
    supabaseState.updateEq.mockReset();
    supabaseState.teamScoreInsert.mockReset();
  },
};

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

vi.mock("../lib/hackathon-mode", () => ({
  readHackathonParticipant,
}));

vi.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: vi.fn(),
}));

describe("hackathon team submission behavior", () => {
  beforeEach(() => {
    supabaseState.reset();
    readHackathonParticipant.mockReset();
  });

  it("treats any teammate submission as passed for the whole team", async () => {
    readHackathonParticipant.mockReturnValue({
      id: "participant-self",
      name: "Self",
    });
    supabaseState.membershipMaybeSingle.mockResolvedValue({
      data: { team_id: "team-1" },
      error: null,
    });
    supabaseState.setMemberRows([
      { participant_id: "participant-self", team_id: "team-1" },
      { participant_id: "participant-a", team_id: "team-1" },
    ]);
    supabaseState.setTeamSubmissionRows([
      { participant_id: "participant-a", activity_id: "activity-4", status: "submitted" },
    ]);

    const { fetchTeamActivitySubmissionStatuses } = await import("../lib/hackathon-submit");

    await expect(
      fetchTeamActivitySubmissionStatuses(["activity-4"]),
    ).resolves.toEqual({
      "activity-4": "passed",
    });
  });

  it("awards team activity points only once even if another teammate submits later", async () => {
    readHackathonParticipant.mockReturnValue({
      id: "participant-self",
      name: "Self",
    });
    supabaseState.deleteEq.mockResolvedValue({ error: null });
    supabaseState.insertSingle.mockResolvedValue({
      data: { id: "submission-2" },
      error: null,
    });
    supabaseState.activityMaybeSingle.mockResolvedValue({
      data: { submission_scope: "team" },
      error: null,
    });
    supabaseState.assessmentMaybeSingle.mockResolvedValue({
      data: { points_possible: 10, metadata: { is_group_submission: true } },
      error: null,
    });
    supabaseState.membershipMaybeSingle.mockResolvedValue({
      data: { team_id: "team-1" },
      error: null,
    });
    supabaseState.scoreEventInsert.mockResolvedValue({
      error: null,
    });
    supabaseState.existingScoreEventMaybeSingle.mockResolvedValue({
      data: { id: "existing-team-event" },
      error: null,
    });
    supabaseState.existingTeamScoreMaybeSingle.mockResolvedValue({
      data: { id: "score-1", total_score: 10 },
      error: null,
    });

    const { submitTextAnswer } = await import("../lib/hackathon-submit");

    await expect(
      submitTextAnswer("activity-4", "assessment-4", "Second teammate submission"),
    ).resolves.toEqual({
      submissionId: "submission-2",
      url: null,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(supabaseState.existingScoreEventMaybeSingle).toHaveBeenCalledTimes(1);
    expect(supabaseState.scoreEventInsert).not.toHaveBeenCalled();
    expect(supabaseState.updateEq).not.toHaveBeenCalled();
    expect(supabaseState.teamScoreInsert).not.toHaveBeenCalled();
  });
});
