import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStringMock, setMock, deleteMock } = vi.hoisted(() => ({
  getStringMock: vi.fn(),
  setMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("../lib/storage", () => ({
  storage: {
    getString: getStringMock,
    set: setMock,
    delete: deleteMock,
    getBoolean: vi.fn(),
  },
  hasMigratedFromAsyncStorage: true,
  migrateFromAsyncStorage: vi.fn(),
}));

import {
  PROFILE_SCREEN_CACHE_KEY_PREFIX,
  PROFILE_SCREEN_CACHE_TTL_MS,
  clearCachedProfileScreenSnapshot,
  getProfileScreenCacheStatus,
  readCachedProfileScreenSnapshot,
  writeCachedProfileScreenSnapshot,
  type ProfileScreenSnapshot,
} from "../lib/profileScreenCache";

function buildSnapshot(
  overrides: Partial<ProfileScreenSnapshot> = {},
): ProfileScreenSnapshot {
  return {
    version: 1,
    userId: "user-1",
    cachedAt: "2026-04-08T10:00:00.000Z",
    profile: null,
    interests: [],
    careers: [],
    ikigaiScores: null,
    scoreTimeline: [],
    hasScores: false,
    activityEvents: [],
    portfolioCount: 0,
    savedProgramsCount: 0,
    isAdmin: false,
    ...overrides,
  };
}

describe("profile screen cache", () => {
  beforeEach(() => {
    getStringMock.mockReset();
    setMock.mockReset();
    deleteMock.mockReset();
    clearCachedProfileScreenSnapshot("user-1");
    clearCachedProfileScreenSnapshot("user-2");
  });

  it("reports fresh cache entries as usable without a blocking reload", () => {
    const snapshot = buildSnapshot({
      cachedAt: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(getProfileScreenCacheStatus(snapshot)).toEqual({
      isFresh: true,
      isUsableWhileRevalidating: true,
      ttlMs: PROFILE_SCREEN_CACHE_TTL_MS,
    });
  });

  it("reports stale cache entries as usable while background revalidating", () => {
    const snapshot = buildSnapshot({
      cachedAt: new Date(Date.now() - PROFILE_SCREEN_CACHE_TTL_MS - 1).toISOString(),
    });

    expect(getProfileScreenCacheStatus(snapshot)).toEqual({
      isFresh: false,
      isUsableWhileRevalidating: true,
      ttlMs: PROFILE_SCREEN_CACHE_TTL_MS,
    });
  });

  it("reads a persisted snapshot for the matching user", () => {
    const snapshot = buildSnapshot();
    getStringMock.mockReturnValue(JSON.stringify(snapshot));

    expect(readCachedProfileScreenSnapshot("user-1")).toEqual(snapshot);
    expect(getStringMock).toHaveBeenCalledWith(
      `${PROFILE_SCREEN_CACHE_KEY_PREFIX}/user-1`,
    );
  });

  it("ignores persisted snapshots for a different user", () => {
    getStringMock.mockReturnValue(JSON.stringify(buildSnapshot({ userId: "user-2" })));

    expect(readCachedProfileScreenSnapshot("user-1")).toBeNull();
  });

  it("persists snapshots under the user-specific cache key", () => {
    const snapshot = buildSnapshot();

    writeCachedProfileScreenSnapshot(snapshot);

    expect(setMock).toHaveBeenCalledWith(
      `${PROFILE_SCREEN_CACHE_KEY_PREFIX}/user-1`,
      JSON.stringify(snapshot),
    );
  });

  it("clears the cached snapshot for a user", () => {
    clearCachedProfileScreenSnapshot("user-1");

    expect(deleteMock).toHaveBeenCalledWith(
      `${PROFILE_SCREEN_CACHE_KEY_PREFIX}/user-1`,
    );
  });
});
