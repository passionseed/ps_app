import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = {
  maybeSingle: vi.fn(),
  teamSubmissions: vi.fn(),
  participantRows: vi.fn(),
  from: vi.fn((table: string) => {
    if (table === "hackathon_team_members") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: string) => {
            if (column === "participant_id") {
              return { maybeSingle: supabaseState.maybeSingle };
            }

            throw new Error(`Unexpected eq on hackathon_team_members: ${column}=${value}`);
          }),
        })),
      };
    }

    if (table === "hackathon_phase_activity_team_submissions") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: supabaseState.teamSubmissions,
            })),
          })),
        })),
      };
    }

    if (table === "hackathon_participants") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => supabaseState.participantRows()),
        })),
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  }),
  reset() {
    supabaseState.from.mockClear();
    supabaseState.maybeSingle.mockReset();
    supabaseState.teamSubmissions.mockReset();
    supabaseState.participantRows.mockReset();
  },
};

const readHackathonParticipant = vi.fn();

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

describe("fetchTeammateActivitySubmissions", () => {
  beforeEach(() => {
    supabaseState.reset();
    readHackathonParticipant.mockReset();
  });

  it("loads teammate submissions for the same activity and enriches them with names", async () => {
    readHackathonParticipant.mockReturnValue({
      id: "participant-self",
      name: "Self",
    });
    supabaseState.maybeSingle.mockResolvedValue({
      data: { team_id: "team-1" },
      error: null,
    });
    supabaseState.teamSubmissions.mockResolvedValue({
      data: [
        {
          id: "submission-b",
          submitted_by: "participant-b",
          text_answer: "Drafted slides",
          image_url: null,
          file_urls: null,
          submitted_at: "2026-04-06T10:00:00.000Z",
        },
        {
          id: "submission-a",
          submitted_by: "participant-a",
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
