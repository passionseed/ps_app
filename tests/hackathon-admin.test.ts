import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  HackathonProgram,
  HackathonProgramPhase,
  HackathonTeam,
  HackathonTeamProgramEnrollment,
} from "../types/hackathon-program";

const supabaseState = vi.hoisted(() => {
  const programRow = vi.fn();
  const phaseRows = vi.fn();
  const activityRows = vi.fn();
  const enrollmentRows = vi.fn();
  const teamRows = vi.fn();
  const memberRows = vi.fn();
  const participantRows = vi.fn();
  const participantIn = vi.fn();
  const submissionRows = vi.fn();
  const teamSubmissionRows = vi.fn();
  const scoreRows = vi.fn();

  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};

    const finalize = (resolver: () => Promise<any>) => resolver();

    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.in = vi.fn((column: string, values: string[]) => {
      if (table === "hackathon_participants") {
        participantIn(column, values);
      }
      return chain;
    });
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => {
      if (table === "hackathon_programs") return programRow();
      if (table === "hackathon_team_program_enrollments") return enrollmentRows();
      throw new Error(`Unexpected maybeSingle on ${table}`);
    });
    chain.single = vi.fn(() => {
      throw new Error(`Unexpected single on ${table}`);
    });

    if (table === "hackathon_program_phases") {
      chain.order = vi.fn(() => finalize(phaseRows));
    } else if (table === "hackathon_phase_activities") {
      chain.order = vi.fn(() => finalize(activityRows));
    } else if (table === "hackathon_team_program_enrollments") {
      chain.order = vi.fn(() => finalize(enrollmentRows));
    } else if (table === "hackathon_teams") {
      chain.order = vi.fn(() => finalize(teamRows));
    } else if (table === "hackathon_team_members") {
      chain.order = vi.fn(() => finalize(memberRows));
    } else if (table === "hackathon_participants") {
      chain.order = vi.fn(() => finalize(participantRows));
    } else if (table === "hackathon_phase_activity_submissions") {
      chain.order = vi.fn(() => finalize(submissionRows));
    } else if (table === "hackathon_phase_activity_team_submissions") {
      chain.order = vi.fn(() => finalize(teamSubmissionRows));
    } else if (table === "hackathon_team_scores") {
      chain.order = vi.fn(() => finalize(scoreRows));
    }

    return chain;
  });

  return {
    from,
    programRow,
    phaseRows,
    activityRows,
    enrollmentRows,
    teamRows,
    memberRows,
    participantRows,
    participantIn,
    submissionRows,
    teamSubmissionRows,
    scoreRows,
    reset() {
      from.mockClear();
      programRow.mockReset();
      phaseRows.mockReset();
      activityRows.mockReset();
      enrollmentRows.mockReset();
      teamRows.mockReset();
      memberRows.mockReset();
      participantRows.mockReset();
      participantIn.mockReset();
      submissionRows.mockReset();
      teamSubmissionRows.mockReset();
      scoreRows.mockReset();
    },
  };
});

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

describe("hackathon admin dashboard helpers", () => {
  beforeEach(() => {
    supabaseState.reset();
  });

  it("summarizes required activity progress and team freshness from rows", async () => {
    const { buildHackathonAdminDashboardFromRows } = await import("../lib/hackathonAdmin");

    const program = {
      id: "program-1",
      slug: "super-seed-hackathon",
      title: "Super Seed",
      description: null,
      status: "active",
      created_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-01T00:00:00.000Z",
    } satisfies HackathonProgram;

    const phases = [
      {
        id: "phase-1",
        program_id: program.id,
        slug: "discover",
        title: "Discover",
        description: null,
        phase_number: 1,
        status: "released",
        starts_at: "2026-04-01T00:00:00.000Z",
        ends_at: null,
        due_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "phase-2",
        program_id: program.id,
        slug: "build",
        title: "Build",
        description: null,
        phase_number: 2,
        status: "locked",
        starts_at: null,
        ends_at: null,
        due_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
    ] satisfies HackathonProgramPhase[];

    const teams = [
      {
        id: "team-1",
        name: "Mint",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "team-2",
        name: "Beam",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
    ] satisfies HackathonTeam[];

    const enrollments = [
      {
        id: "enrollment-1",
        team_id: "team-1",
        program_id: program.id,
        current_phase_id: "phase-1",
        status: "active",
        started_at: "2026-04-01T00:00:00.000Z",
        completed_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "enrollment-2",
        team_id: "team-2",
        program_id: program.id,
        current_phase_id: "phase-1",
        status: "active",
        started_at: "2026-04-01T00:00:00.000Z",
        completed_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
    ] satisfies HackathonTeamProgramEnrollment[];

    const dashboard = buildHackathonAdminDashboardFromRows({
      program,
      phases,
      activities: [
        {
          id: "activity-1",
          phase_id: "phase-1",
          title: "Interview Synthesis",
          display_order: 1,
          is_required: true,
          is_draft: false,
          status: "released",
          submission_scope: "individual",
        },
        {
          id: "activity-2",
          phase_id: "phase-1",
          title: "Team Check-in",
          display_order: 2,
          is_required: true,
          is_draft: false,
          status: "released",
          submission_scope: "team",
        },
        {
          id: "activity-3",
          phase_id: "phase-1",
          title: "Draft Only",
          display_order: 3,
          is_required: true,
          is_draft: true,
          status: "locked",
          submission_scope: "individual",
        },
      ],
      enrollments,
      teams,
      members: [
        { team_id: "team-1", participant_id: "participant-a" },
        { team_id: "team-1", participant_id: "participant-b" },
        { team_id: "team-2", participant_id: "participant-c" },
      ],
      participants: [
        { id: "participant-a", display_name: "Mint" },
        { id: "participant-b", display_name: "Beam" },
        { id: "participant-c", display_name: "Glow" },
      ],
      submissions: [
        {
          id: "submission-1",
          activity_id: "activity-1",
          participant_id: "participant-a",
          submitted_at: "2026-04-09T10:00:00.000Z",
        },
        {
          id: "submission-2",
          activity_id: "activity-1",
          participant_id: "participant-b",
          submitted_at: "2026-04-09T11:00:00.000Z",
        },
      ],
      teamSubmissions: [
        {
          id: "team-submission-1",
          activity_id: "activity-2",
          team_id: "team-1",
          submitted_by: "participant-a",
          submitted_at: "2026-04-09T12:00:00.000Z",
        },
      ],
      scores: [
        { team_id: "team-1", total_score: 42 },
        { team_id: "team-2", total_score: 12 },
      ],
      referenceTime: "2026-04-09T12:30:00.000Z",
    });

    expect(dashboard.overview).toEqual({
      participantCount: 3,
      teamCount: 2,
      assignedParticipantCount: 3,
      unassignedParticipantCount: 0,
      submissionsLast24h: 3,
      currentPhaseSubmissionRate: 50,
      stuckTeamCount: 1,
      teamsOnTrackCount: 1,
      currentPhaseId: "phase-1",
    });

    expect(dashboard.activities).toEqual([
      expect.objectContaining({
        id: "activity-1",
        submittedCount: 2,
        representedTeamCount: 1,
        missingCount: 1,
        latestSubmittedAt: "2026-04-09T11:00:00.000Z",
      }),
      expect.objectContaining({
        id: "activity-2",
        submittedCount: 1,
        representedTeamCount: 1,
        missingCount: 1,
        latestSubmittedAt: "2026-04-09T12:00:00.000Z",
      }),
    ]);

    expect(dashboard.teams).toEqual([
      expect.objectContaining({
        id: "team-1",
        completedRequiredActivities: 2,
        totalRequiredActivities: 2,
        missingRequiredActivities: 0,
        latestSubmittedAt: "2026-04-09T12:00:00.000Z",
        score: 42,
        rank: 1,
        onTrack: true,
        offTrackReason: null,
      }),
      expect.objectContaining({
        id: "team-2",
        completedRequiredActivities: 0,
        totalRequiredActivities: 2,
        missingRequiredActivities: 2,
        latestSubmittedAt: null,
        score: 12,
        rank: 2,
        onTrack: false,
        offTrackReason: "missing_required_activities",
      }),
    ]);
  });

  it("loads dashboard rows through the Supabase client", async () => {
    supabaseState.programRow.mockResolvedValue({
      data: {
        id: "program-1",
        slug: "super-seed-hackathon",
        title: "Super Seed",
        description: null,
        status: "active",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      } satisfies HackathonProgram,
      error: null,
    });
    supabaseState.phaseRows.mockResolvedValue({
      data: [
        {
          id: "phase-1",
          program_id: "program-1",
          slug: "discover",
          title: "Discover",
          description: null,
          phase_number: 1,
          status: "released",
          starts_at: "2026-04-01T00:00:00.000Z",
          ends_at: null,
          due_at: null,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.activityRows.mockResolvedValue({
      data: [
        {
          id: "activity-1",
          phase_id: "phase-1",
          title: "Interview Synthesis",
          display_order: 1,
          is_required: true,
          is_draft: false,
          status: "released",
          submission_scope: "individual",
        },
      ],
      error: null,
    });
    supabaseState.enrollmentRows.mockResolvedValue({
      data: [
        {
          id: "enrollment-1",
          team_id: "team-1",
          program_id: "program-1",
          current_phase_id: "phase-1",
          status: "active",
          started_at: "2026-04-01T00:00:00.000Z",
          completed_at: null,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.teamRows.mockResolvedValue({
      data: [
        {
          id: "team-1",
          name: "Mint",
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.memberRows.mockResolvedValue({
      data: [{ team_id: "team-1", participant_id: "participant-a" }],
      error: null,
    });
    supabaseState.participantRows.mockResolvedValue({
      data: [{ id: "participant-a", display_name: "Mint" }],
      error: null,
    });
    supabaseState.submissionRows.mockResolvedValue({
      data: [
        {
          id: "submission-1",
          activity_id: "activity-1",
          participant_id: "participant-a",
          submitted_at: "2026-04-09T12:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.teamSubmissionRows.mockResolvedValue({
      data: [],
      error: null,
    });
    supabaseState.scoreRows.mockResolvedValue({
      data: [{ team_id: "team-1", total_score: 42 }],
      error: null,
    });

    const { getHackathonAdminDashboard } = await import("../lib/hackathonAdmin");

    await expect(getHackathonAdminDashboard("super-seed-hackathon")).resolves.toMatchObject({
      overview: expect.objectContaining({
        participantCount: 1,
        teamCount: 1,
      }),
      phases: [expect.objectContaining({ id: "phase-1" })],
      activities: [expect.objectContaining({ id: "activity-1" })],
      teams: [expect.objectContaining({ id: "team-1" })],
    });

    expect(supabaseState.participantIn).not.toHaveBeenCalled();
  });

  it("throws when an admin dashboard query fails instead of returning fake zeroes", async () => {
    supabaseState.programRow.mockResolvedValue({
      data: {
        id: "program-1",
        slug: "super-seed-hackathon",
        title: "Super Seed",
        description: null,
        status: "active",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      } satisfies HackathonProgram,
      error: null,
    });
    supabaseState.phaseRows.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table hackathon_program_phases" },
    });

    const { getHackathonAdminDashboard } = await import("../lib/hackathonAdmin");

    await expect(getHackathonAdminDashboard("super-seed-hackathon")).rejects.toThrow(
      "permission denied for table hackathon_program_phases",
    );
  });
});
