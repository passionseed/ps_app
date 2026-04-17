import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => {
  const teamMaybeSingle = vi.fn();
  const memberEq = vi.fn();
  const scoresEq = vi.fn();
  const participantIn = vi.fn();

  const from = vi.fn((table: string) => {
    if (table === "hackathon_teams") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: teamMaybeSingle,
          })),
        })),
      };
    }

    if (table === "hackathon_team_members") {
      return {
        select: vi.fn(() => ({
          eq: memberEq,
        })),
      };
    }

    if (table === "hackathon_team_scores") {
      return {
        select: vi.fn(() => ({
          eq: scoresEq,
        })),
      };
    }

    if (table === "hackathon_participants") {
      return {
        select: vi.fn(() => ({
          in: participantIn,
        })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    teamMaybeSingle,
    memberEq,
    scoresEq,
    participantIn,
    reset() {
      from.mockClear();
      teamMaybeSingle.mockReset();
      memberEq.mockReset();
      scoresEq.mockReset();
      participantIn.mockReset();
    },
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: supabaseState.from,
  })),
}));

vi.mock("../lib/runtime-config", () => ({
  getSupabaseConfigErrorMessage: vi.fn(() => null),
  getSupabaseRuntimeConfig: vi.fn(() => ({
    url: "https://example.supabase.co",
    publishableKey: "test-publishable-key",
    anonKey: "test-anon-key",
  })),
}));

describe("GET /api/hackathon/team/[teamId]", () => {
  beforeEach(() => {
    supabaseState.reset();
  });

  it("returns team details, batched members, scores, and cache headers", async () => {
    supabaseState.teamMaybeSingle.mockResolvedValue({
      data: { id: "team-1", name: "Alpha" },
      error: null,
    });
    supabaseState.memberEq.mockResolvedValue({
      data: [
        { participant_id: "participant-2" },
        { participant_id: "participant-1" },
      ],
      error: null,
    });
    supabaseState.scoresEq.mockResolvedValue({
      data: [{ team_id: "team-1", total_score: 42 }],
      error: null,
    });
    supabaseState.participantIn.mockResolvedValue({
      data: [
        {
          id: "participant-1",
          name: "Mint",
          university: "PSU",
          track: "Design",
          team_emoji: "🌱",
        },
        {
          id: "participant-2",
          name: "Beam",
          university: "CMU",
          track: "AI",
          team_emoji: "🚀",
        },
      ],
      error: null,
    });

    const { GET } = await import("../app/api/hackathon/team/[teamId]+api");

    const response = await GET(new Request("https://example.com/api/hackathon/team/team-1"), {
      teamId: "team-1",
    });

    expect(response.status).toBe(200);
    const { createClient } = await import("@supabase/supabase-js");
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-publishable-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
        }),
      }),
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, stale-while-revalidate=600",
    );
    await expect(response.json()).resolves.toEqual({
      team: { id: "team-1", name: "Alpha" },
      members: [
        {
          id: "participant-2",
          name: "Beam",
          university: "CMU",
          track: "AI",
          team_emoji: "🚀",
        },
        {
          id: "participant-1",
          name: "Mint",
          university: "PSU",
          track: "Design",
          team_emoji: "🌱",
        },
      ],
      scores: [{ team_id: "team-1", total_score: 42 }],
    });

    expect(supabaseState.participantIn).toHaveBeenCalledTimes(1);
    expect(supabaseState.participantIn).toHaveBeenCalledWith("id", [
      "participant-2",
      "participant-1",
    ]);
  });
});
