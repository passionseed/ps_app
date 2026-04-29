import { beforeEach, describe, expect, it, vi } from "vitest";

const readHackathonParticipant = vi.fn();

type TeamMembershipRow = { participant_id: string; team_id?: string };

let memberRows: TeamMembershipRow[] = [];
let teamSubmissionRows: { activity_id: string; status: string }[] = [];

const supabaseState = {
  deleteEq: vi.fn(),
  insertSingle: vi.fn(),
  teamUpsertSingle: vi.fn(),
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
          in: vi.fn().mockResolvedValue({ error: null }),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: supabaseState.insertSingle,
          })),
        })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: supabaseState.insertSingle,
          })),
        })),
      };
    }

    if (table === "hackathon_phase_activity_team_submissions") {
      const deepEqChain = {
        eq: vi.fn(() => ({
          not: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        in: vi.fn((_col2: string, activityIds: string[]) =>
          Promise.resolve({
            data: teamSubmissionRows.filter((row) =>
              activityIds.includes(row.activity_id),
            ),
            error: null,
          }),
        ),
      };
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => deepEqChain),
        })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: supabaseState.teamUpsertSingle,
          })),
        })),
        delete: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ error: null }),
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
        select: vi.fn((_cols: string) => ({
          eq: vi.fn((_col: string, _val: string) => {
            // .eq("id", assessmentId).maybeSingle() — single assessment lookup
            // .eq("activity_id", activityId) — array of assessments (thenable)
            return {
              maybeSingle: supabaseState.assessmentMaybeSingle,
              // Make the object itself thenable so Promise.all resolves it as array result
              then: (resolve: any, reject?: any) =>
                Promise.resolve({ data: [{ points_possible: 10 }], error: null }).then(resolve, reject),
            };
          }),
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
  setTeamSubmissionRows(rows: { activity_id: string; status: string }[]) {
    teamSubmissionRows = rows;
  },
  reset() {
    memberRows = [];
    teamSubmissionRows = [];
    supabaseState.from.mockClear();
    supabaseState.deleteEq.mockReset();
    supabaseState.insertSingle.mockReset();
    supabaseState.teamUpsertSingle.mockReset();
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

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

vi.mock("expo-sqlite/localStorage/install", () => ({}));

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
      { activity_id: "activity-4", status: "submitted" },
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
    // resolveSubmissionTarget: activity scope + assessment metadata
    supabaseState.activityMaybeSingle.mockResolvedValue({
      data: { submission_scope: "team" },
      error: null,
    });
    supabaseState.assessmentMaybeSingle.mockResolvedValue({
      data: { points_possible: 10, metadata: { is_group_submission: true } },
      error: null,
    });
    // resolveSubmissionTarget + awardScore: team membership lookup
    supabaseState.membershipMaybeSingle.mockResolvedValue({
      data: { team_id: "team-1" },
      error: null,
    });
    // Team upsert returns the submission
    supabaseState.teamUpsertSingle.mockResolvedValue({
      data: { id: "submission-2" },
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

    const result = await submitTextAnswer("activity-4", "assessment-4", "Second teammate submission");

    // Verify submission went to team table via upsert (not individual table)
    expect(result).toEqual({ submissionId: "submission-2", url: null });
    expect(supabaseState.teamUpsertSingle).toHaveBeenCalledTimes(1);
    expect(supabaseState.insertSingle).not.toHaveBeenCalled();
    expect(supabaseState.deleteEq).not.toHaveBeenCalled();
  });
});
