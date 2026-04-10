import { storage } from "./storage";
import type { EnrollmentWithPath } from "./pathlab";
import type { StudentJourney } from "../types/journey";
import type { CareerPath, PathStep } from "../types/journey";

export const MY_PATHS_CACHE_SCHEMA_VERSION = 1;
export const MY_PATHS_CACHE_KEY_PREFIX = "my-paths-cache";
export const MY_PATHS_CACHE_TTL_MS = 5 * 60 * 1000;

export type MyPathsSnapshot = {
  version: number;
  userId: string;
  cachedAt: string;
  journeys: StudentJourney[];
  enrollments: EnrollmentWithPath[];
};

function getMyPathsCacheKey(userId: string): string {
  return `${MY_PATHS_CACHE_KEY_PREFIX}/${userId}`;
}

function isMyPathsSnapshot(value: unknown): value is MyPathsSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<MyPathsSnapshot>;
  return (
    snapshot.version === MY_PATHS_CACHE_SCHEMA_VERSION &&
    typeof snapshot.userId === "string" &&
    typeof snapshot.cachedAt === "string" &&
    Array.isArray(snapshot.journeys) &&
    Array.isArray(snapshot.enrollments)
  );
}

// In-memory layer for instant same-session reads
const memoryCache = new Map<string, MyPathsSnapshot>();

export function getMyPathsCacheStatus(
  snapshot: MyPathsSnapshot | null,
  now = Date.now(),
  ttlMs = MY_PATHS_CACHE_TTL_MS,
) {
  const cachedAt = snapshot ? new Date(snapshot.cachedAt).getTime() : Number.NaN;
  const isFresh = Number.isFinite(cachedAt) && now - cachedAt <= ttlMs;
  return { isFresh, isUsableWhileRevalidating: Boolean(snapshot) };
}

export function readCachedMyPathsSnapshot(
  userId: string,
): MyPathsSnapshot | null {
  const memory = memoryCache.get(userId);
  if (memory) return memory;

  const raw = storage.getString(getMyPathsCacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isMyPathsSnapshot(parsed) || parsed.userId !== userId) return null;
    memoryCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedMyPathsSnapshot(
  snapshot: MyPathsSnapshot,
): void {
  memoryCache.set(snapshot.userId, snapshot);
  storage.set(
    getMyPathsCacheKey(snapshot.userId),
    JSON.stringify(snapshot),
  );
}

export function clearCachedMyPathsSnapshot(userId: string): void {
  memoryCache.delete(userId);
  storage.delete(getMyPathsCacheKey(userId));
}
