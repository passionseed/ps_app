import { beforeEach, describe, expect, it, vi } from "vitest";

const authGetUserMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getItemMock = vi.fn();
const setItemMock = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: authGetUserMock,
    },
    from: fromMock,
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: getItemMock,
    setItem: setItemMock,
  },
}));

async function loadEventLogger() {
  vi.resetModules();
  return import("../lib/eventLogger");
}

describe("event logger analytics wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insertMock.mockResolvedValue({ error: null });
    getItemMock.mockImplementation(async (key: string) => {
      if (key === "ps_session_id") return "session-1";
      if (key === "ps_session_timestamp") return Date.now().toString();
      return null;
    });
    setItemMock.mockResolvedValue(undefined);
  });

  it("logs seed_started with the seed context payload", async () => {
    const { logSeedStarted } = await loadEventLogger();

    await logSeedStarted({
      seed: {
        id: "seed-1",
        category_id: "category-tech",
        tags: ["ux", "design"],
      },
      pathId: "path-1",
      enrollmentId: "enrollment-1",
    });

    expect(fromMock).toHaveBeenCalledWith("user_events");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      event_type: "seed_started",
      event_data: {
        seed_id: "seed-1",
        seed_category_id: "category-tech",
        seed_tags: ["ux", "design"],
        path_id: "path-1",
        enrollment_id: "enrollment-1",
        source: "seed_detail",
      },
      session_id: "session-1",
    });
  });

  it("logs seed_completed with the completion payload", async () => {
    const { logSeedCompleted } = await loadEventLogger();

    await logSeedCompleted({
      enrollmentId: "enrollment-1",
      seedId: "seed-1",
      pathId: "path-1",
      seedTitle: "UX Designer Discovery",
      categoryId: "category-tech",
      tags: ["ux", "design"],
      completedSeedCount: 3,
      milestoneSeedCount: 3,
    });

    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      event_type: "seed_completed",
      event_data: {
        enrollment_id: "enrollment-1",
        seed_id: "seed-1",
        path_id: "path-1",
        seed_title: "UX Designer Discovery",
        category_id: "category-tech",
        tags: ["ux", "design"],
        completed_seed_count: 3,
        milestone_seed_count: 3,
      },
      session_id: "session-1",
    });
  });

  it("logs direction_finder_viewed with the chosen surface", async () => {
    const { logDirectionFinderViewed } = await loadEventLogger();

    await logDirectionFinderViewed();

    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      event_type: "direction_finder_viewed",
      event_data: {
        source: "profile_ikigai",
      },
      session_id: "session-1",
    });
  });
});
