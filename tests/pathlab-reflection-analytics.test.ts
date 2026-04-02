import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => {
  let insertCalls: Array<{ table: string; payload: Record<string, unknown> }> =
    [];
  let updateCalls: Array<{ table: string; payload: Record<string, unknown> }> =
    [];
  let selectHeadCalls: Array<{ table: string; options?: Record<string, unknown> }> =
    [];

  const pathReflectionSingle = vi.fn(async () => ({
    data: { id: "reflection-1" },
    error: null,
  }));

  const pathEnrollmentSelect = vi.fn(async () => ({
    data: {
      id: "enrollment-1",
      user_id: "user-1",
      path_id: "path-1",
    },
    error: null,
  }));

  const pathLookupSingle = vi.fn(async () => ({
    data: {
      seed: {
        id: "seed-1",
        title: "UX Designer Discovery",
        category_id: "category-tech",
        tags: ["ux", "design"],
      },
    },
    error: null,
  }));

  const countEq = vi.fn(async () => ({
    count: 3,
    error: null,
  }));

  const buildEqChain = (table: string, payload?: Record<string, unknown>) => ({
    eq: vi.fn((column: string, value: unknown) => {
      if (table === "path_enrollments" && payload) {
        if (column === "id") {
          return {
            select: vi.fn(() => ({
              single: pathEnrollmentSelect,
            })),
          };
        }

        if (column === "user_id") {
          return {
            eq: countEq,
          };
        }
      }

      if (table === "paths" && column === "id") {
        return {
          single: pathLookupSingle,
        };
      }

      return Promise.resolve({ data: null, error: null, count: 0 });
    }),
  });

  const from = vi.fn((table: string) => ({
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      return {
        select: vi.fn(() => ({
          single: pathReflectionSingle,
        })),
      };
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      updateCalls.push({ table, payload });
      return buildEqChain(table, payload);
    }),
    select: vi.fn((columns?: string, options?: Record<string, unknown>) => {
      selectHeadCalls.push({ table, options });

      if (table === "paths") {
        return {
          eq: vi.fn(() => ({
            single: pathLookupSingle,
          })),
        };
      }

      if (table === "path_enrollments" && options?.head === true) {
        return {
          eq: vi.fn((column: string) => {
            if (column === "user_id") {
              return {
                eq: countEq,
              };
            }
            return Promise.resolve({ count: 0, error: null });
          }),
        };
      }

      return {
        eq: vi.fn(() => ({
          single: pathEnrollmentSelect,
        })),
      };
    }),
  }));

  return {
    from,
    reset() {
      insertCalls = [];
      updateCalls = [];
      selectHeadCalls = [];
      pathReflectionSingle.mockClear();
      pathEnrollmentSelect.mockClear();
      pathLookupSingle.mockClear();
      countEq.mockClear();
      from.mockClear();
    },
    get insertCalls() {
      return insertCalls;
    },
    get updateCalls() {
      return updateCalls;
    },
    get selectHeadCalls() {
      return selectHeadCalls;
    },
  };
});

const logSeedCompleted = vi.fn(async () => {});

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

vi.mock("../lib/eventLogger", () => ({
  logSeedCompleted,
}));

describe("submitDailyReflection analytics", () => {
  beforeEach(() => {
    supabaseState.reset();
    logSeedCompleted.mockClear();
  });

  it("logs seed_completed with milestone context on final reflection", async () => {
    const { submitDailyReflection } = await import("../lib/pathlab");

    await submitDailyReflection({
      enrollmentId: "enrollment-1",
      dayNumber: 5,
      energyLevel: 4,
      confusionLevel: 2,
      interestLevel: 5,
      decision: "final_reflection",
    });

    expect(logSeedCompleted).toHaveBeenCalledWith({
      enrollmentId: "enrollment-1",
      seedId: "seed-1",
      pathId: "path-1",
      seedTitle: "UX Designer Discovery",
      categoryId: "category-tech",
      tags: ["ux", "design"],
      completedSeedCount: 3,
      milestoneSeedCount: 3,
    });
  });
});
