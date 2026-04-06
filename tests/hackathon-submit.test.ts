import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const memberRows = vi.fn();
  const orderedSubmissions = vi.fn();
  const participantRows = vi.fn();

  const from = vi.fn((table: string) => {
    if (table === "hackathon_team_members") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: string) => {
            if (column === "participant_id") {
              return { maybeSingle };
            }

            if (column === "team_id") {
              return memberRows();
            }

            throw new Error(`Unexpected eq on hackathon_team_members: ${column}=${value}`);
          }),
        })),
      };
    }

    if (table === "hackathon_phase_activity_submissions") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: orderedSubmissions,
            })),
          })),
        })),
      };
    }

    if (table === "hackathon_participants") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => participantRows()),
        })),
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    from,
    maybeSingle,
    memberRows,
    orderedSubmissions,
    participantRows,
    reset() {
      from.mockClear();
      maybeSingle.mockReset();
      memberRows.mockReset();
      orderedSubmissions.mockReset();
      participantRows.mockReset();
    },
  };
});

const readHackathonParticipant = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

vi.mock("../lib/hackathon-mode", () => ({
  readHackathonParticipant,
}));

describe("fetchTeammateActivitySubmissions", () => {
  beforeEach(() => {
    supabaseState.reset();
    readHackathonParticipant.mockReset();
  });

  it("loads teammate submissions for the same activity and enriches them with names", async () => {
    readHackathonParticipant.mockResolvedValue({
      id: "participant-self",
      name: "Self",
    });
    supabaseState.maybeSingle.mockResolvedValue({
      data: { team_id: "team-1" },
      error: null,
    });
    supabaseState.memberRows.mockResolvedValue({
      data: [
        { participant_id: "participant-self" },
        { participant_id: "participant-a" },
        { participant_id: "participant-b" },
      ],
      error: null,
    });
    supabaseState.orderedSubmissions.mockResolvedValue({
      data: [
        {
          id: "submission-b",
          participant_id: "participant-b",
          text_answer: "Drafted slides",
          image_url: null,
          file_urls: null,
          submitted_at: "2026-04-06T10:00:00.000Z",
        },
        {
          id: "submission-a",
          participant_id: "participant-a",
          text_answer: "Interview synthesis",
          image_url: null,
          file_urls: null,
          submitted_at: "2026-04-06T09:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.participantRows.mockResolvedValue({
      data: [
        { id: "participant-a", name: "Mint" },
        { id: "participant-b", name: "Beam" },
      ],
      error: null,
    });

    const { fetchTeammateActivitySubmissions } = await import("../lib/hackathon-submit");

    await expect(
      fetchTeammateActivitySubmissions("activity-1"),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "submission-b",
        participant_id: "participant-b",
        participant_name: "Beam",
        text_answer: "Drafted slides",
      }),
      expect.objectContaining({
        id: "submission-a",
        participant_id: "participant-a",
        participant_name: "Mint",
        text_answer: "Interview synthesis",
      }),
    ]);
  });
});
