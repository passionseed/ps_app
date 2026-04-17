import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => {
  const membershipMaybeSingle = vi.fn();
  const programLimit = vi.fn();
  const phasesOrder = vi.fn();

  const from = vi.fn((table: string) => {
    if (table === "hackathon_team_members") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: membershipMaybeSingle,
          })),
        })),
      };
    }

    if (table === "hackathon_programs") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: programLimit,
            })),
          })),
        })),
      };
    }

    if (table === "hackathon_program_phases") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: phasesOrder,
          })),
        })),
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    from,
    membershipMaybeSingle,
    programLimit,
    phasesOrder,
    reset() {
      from.mockClear();
      membershipMaybeSingle.mockReset();
      programLimit.mockReset();
      phasesOrder.mockReset();
    },
  };
});

const createClient = vi.fn(() => ({
  from: supabaseState.from,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("../lib/runtime-config", () => ({
  getSupabaseConfigErrorMessage: vi.fn(() => null),
  getSupabaseRuntimeConfig: vi.fn(() => ({
    url: "https://example.supabase.co",
    publishableKey: "sb_publishable_test",
    anonKey: "anon-test",
  })),
}));

vi.mock("../lib/supabase", () => {
  throw new Error("API routes must not import the React Native Supabase client");
});

describe("GET /api/hackathon/home-bundle", () => {
  beforeEach(() => {
    supabaseState.reset();
    createClient.mockClear();
  });

  it("creates a per-request server-safe Supabase client and returns the bundle", async () => {
    supabaseState.membershipMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    supabaseState.programLimit.mockResolvedValue({
      data: [
        {
          id: "program-1",
          slug: "super-seed-hackathon",
          title: "Super Seed Hackathon",
          description: "Live program",
          status: "active",
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.phasesOrder.mockResolvedValue({
      data: [
        {
          id: "phase-1",
          program_id: "program-1",
          slug: "phase-1",
          title: "Phase 1",
          description: null,
          phase_number: 1,
          status: "released",
          starts_at: null,
          ends_at: null,
          due_at: null,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const { GET } = await import("../app/api/hackathon/home-bundle+api");

    const response = await GET(
      new Request(
        "https://example.test/api/hackathon/home-bundle?participant_id=participant-1",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, stale-while-revalidate=600",
    );
    await expect(response.json()).resolves.toMatchObject({
      team: null,
      enrollment: null,
      program: {
        id: "program-1",
        slug: "super-seed-hackathon",
      },
      phases: [
        expect.objectContaining({
          id: "phase-1",
          program_id: "program-1",
        }),
      ],
    });

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
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
  });
});
