import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => {
  const limitedPrograms = vi.fn();
  const orderedPhases = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "hackathon_programs") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: limitedPrograms,
            })),
          })),
        })),
      };
    }

    if (table === "hackathon_program_phases") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: orderedPhases,
          })),
        })),
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  });

  return {
    from,
    limitedPrograms,
    orderedPhases,
    reset() {
      from.mockClear();
      limitedPrograms.mockReset();
      orderedPhases.mockReset();
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

describe("getCurrentHackathonProgramHome", () => {
  beforeEach(() => {
    supabaseState.reset();
    readHackathonParticipant.mockReset();
  });

  it("returns the live program and phases even when no participant session is stored", async () => {
    readHackathonParticipant.mockReturnValue(null);
    supabaseState.limitedPrograms.mockResolvedValue({
      data: [
        {
          id: "preview-program",
          slug: "epic-sprint",
          title: "Epic Sprint",
          description: "Old preview program",
          status: "active",
          created_at: "2026-04-02T00:00:00.000Z",
          updated_at: "2026-04-02T00:00:00.000Z",
        },
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
    supabaseState.orderedPhases.mockResolvedValue({
      data: [
        {
          id: "phase-1",
          program_id: "program-1",
          slug: "phase-1",
          title: "Phase 1: Customer Discovery",
          description: "Real data",
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

    const { getCurrentHackathonProgramHome } = await import(
      "../lib/hackathonProgram"
    );

    await expect(getCurrentHackathonProgramHome()).resolves.toMatchObject({
      team: null,
      enrollment: null,
      program: {
        id: "program-1",
        title: "Super Seed Hackathon",
      },
      phases: [
        {
          id: "phase-1",
          title: "Phase 1: Customer Discovery",
        },
      ],
    });
  });
});
