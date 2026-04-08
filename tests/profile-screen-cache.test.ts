import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PROFILE_SCREEN_CACHE_KEY_PREFIX,
  PROFILE_SCREEN_CACHE_TTL_MS,
  clearCachedProfileScreenSnapshot,
  getProfileScreenCacheStatus,
  readCachedProfileScreenSnapshot,
  writeCachedProfileScreenSnapshot,
  type ProfileScreenSnapshot,
} from "../lib/profileScreenCache";

const getItem = vi.mocked(AsyncStorage.getItem);
const setItem = vi.mocked(AsyncStorage.setItem);
const removeItem = vi.mocked(AsyncStorage.removeItem);

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
  beforeEach(async () => {
    getItem.mockReset();
    setItem.mockReset();
    removeItem.mockReset();
    await clearCachedProfileScreenSnapshot("user-1");
    await clearCachedProfileScreenSnapshot("user-2");
    removeItem.mockReset();
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

  it("reads a persisted snapshot for the matching user", async () => {
    const snapshot = buildSnapshot();
    getItem.mockResolvedValue(JSON.stringify(snapshot));

    await expect(readCachedProfileScreenSnapshot("user-1")).resolves.toEqual(
      snapshot,
    );
    expect(getItem).toHaveBeenCalledWith(
      `${PROFILE_SCREEN_CACHE_KEY_PREFIX}/user-1`,
    );
  });

  it("ignores persisted snapshots for a different user", async () => {
    getItem.mockResolvedValue(JSON.stringify(buildSnapshot({ userId: "user-2" })));

    await expect(readCachedProfileScreenSnapshot("user-1")).resolves.toBeNull();
  });

  it("persists snapshots under the user-specific cache key", async () => {
    const snapshot = buildSnapshot();

    await writeCachedProfileScreenSnapshot(snapshot);

    expect(setItem).toHaveBeenCalledWith(
      `${PROFILE_SCREEN_CACHE_KEY_PREFIX}/user-1`,
      JSON.stringify(snapshot),
    );
  });

  it("clears the cached snapshot for a user", async () => {
    await clearCachedProfileScreenSnapshot("user-1");

    expect(removeItem).toHaveBeenCalledWith(
      `${PROFILE_SCREEN_CACHE_KEY_PREFIX}/user-1`,
    );
  });
});
