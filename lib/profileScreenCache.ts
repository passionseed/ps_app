import { getItem, setItem, removeItem } from "./asyncStorage";
import type { UserEvent } from "../types/events";
import type { CareerGoal, InterestCategory, Profile } from "../types/onboarding";
import type { IkigaiScores, ScoreTimelineItem } from "./scoreEngine";

export const PROFILE_SCREEN_CACHE_SCHEMA_VERSION = 1;
export const PROFILE_SCREEN_CACHE_KEY_PREFIX = "profile-screen-cache";
export const PROFILE_SCREEN_CACHE_TTL_MS = 10 * 60 * 1000;

export type ProfileScreenSnapshot = {
  version: number;
  userId: string;
  cachedAt: string;
  profile: Profile | null;
  interests: InterestCategory[];
  careers: CareerGoal[];
  ikigaiScores: IkigaiScores | null;
  scoreTimeline: ScoreTimelineItem[];
  hasScores: boolean;
  activityEvents: UserEvent[];
  portfolioCount: number;
  savedProgramsCount: number;
  isAdmin: boolean;
};

const profileScreenSnapshotMemoryCache = new Map<string, ProfileScreenSnapshot>();

function getProfileScreenCacheKey(userId: string): string {
  return `${PROFILE_SCREEN_CACHE_KEY_PREFIX}/${userId}`;
}

function isProfileScreenSnapshot(value: unknown): value is ProfileScreenSnapshot {
  if (!value || typeof value !== "object") return false;

  const snapshot = value as Partial<ProfileScreenSnapshot>;

  return (
    snapshot.version === PROFILE_SCREEN_CACHE_SCHEMA_VERSION &&
    typeof snapshot.userId === "string" &&
    typeof snapshot.cachedAt === "string" &&
    Array.isArray(snapshot.interests) &&
    Array.isArray(snapshot.careers) &&
    Array.isArray(snapshot.scoreTimeline) &&
    Array.isArray(snapshot.activityEvents) &&
    typeof snapshot.hasScores === "boolean" &&
    typeof snapshot.portfolioCount === "number" &&
    typeof snapshot.savedProgramsCount === "number" &&
    typeof snapshot.isAdmin === "boolean"
  );
}

export function getProfileScreenCacheStatus(
  snapshot: ProfileScreenSnapshot | null,
  now = Date.now(),
  ttlMs = PROFILE_SCREEN_CACHE_TTL_MS,
) {
  const cachedAt = snapshot ? new Date(snapshot.cachedAt).getTime() : Number.NaN;
  const isFresh = Number.isFinite(cachedAt) && now - cachedAt <= ttlMs;

  return {
    isFresh,
    isUsableWhileRevalidating: Boolean(snapshot),
    ttlMs,
  };
}

export async function readCachedProfileScreenSnapshot(
  userId: string,
): Promise<ProfileScreenSnapshot | null> {
  const memorySnapshot = profileScreenSnapshotMemoryCache.get(userId);
  if (memorySnapshot) {
    return memorySnapshot;
  }

  const raw = await getItem(getProfileScreenCacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isProfileScreenSnapshot(parsed) || parsed.userId !== userId) {
      return null;
    }
    profileScreenSnapshotMemoryCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedProfileScreenSnapshot(
  snapshot: ProfileScreenSnapshot,
): Promise<void> {
  profileScreenSnapshotMemoryCache.set(snapshot.userId, snapshot);
  await setItem(
    getProfileScreenCacheKey(snapshot.userId),
    JSON.stringify(snapshot),
  );
}

export async function clearCachedProfileScreenSnapshot(
  userId: string,
): Promise<void> {
  profileScreenSnapshotMemoryCache.delete(userId);
  await removeItem(getProfileScreenCacheKey(userId));
}
