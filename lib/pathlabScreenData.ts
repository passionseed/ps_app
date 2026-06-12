/**
 * PathLab screen-level bundle caches.
 *
 * Uses the generic cache utilities from cacheUtils.ts to provide
 * TTL-based in-memory caching with inflight deduplication for
 * PathLab day bundles and seed bundles.
 *
 * Pattern mirrors lib/hackathonScreenData.ts but is backed by the
 * generic cacheUtils instead of per-store helpers.
 */

import {
  loadCached,
  readFresh,
  invalidateByPrefix,
  clearStore,
  type CacheEntry,
} from "./cacheUtils";
import {
  getEnrollmentDayBundle,
  getSeedById,
  getPathBySeedId,
  getUserEnrollment,
  getPathDays,
  getPathDayActivities,
  clearPathlabCaches,
} from "./pathlab";
import type { PathDay, PathEnrollment } from "../types/pathlab";
import type { Seed } from "../types/seeds";
import type { Path } from "../types/pathlab";
import type {
  PathActivityWithContent,
  PathActivityProgress,
} from "../types/pathlab-content";

// ---------------------------------------------------------------------------
// Bundle types
// ---------------------------------------------------------------------------

export interface DayBundle {
  enrollment: PathEnrollment;
  pathDay: PathDay;
  activities: PathActivityWithContent[];
  progress: Record<string, PathActivityProgress>;
}

export interface SeedBundle {
  seed: Seed;
  path: Path;
  enrollment: PathEnrollment | null;
  days: Pick<PathDay, "id" | "day_number" | "title">[];
  activitiesByDay: Record<string, PathActivityWithContent[]>;
}

// ---------------------------------------------------------------------------
// Cache config
// ---------------------------------------------------------------------------

const BUNDLE_TTL_MS = 45_000; // 45 seconds – matches hackathon bundle cache
const MAX_DAY_BUNDLES = 8;
const MAX_SEED_BUNDLES = 4;

// ---------------------------------------------------------------------------
// Cache stores
// ---------------------------------------------------------------------------

const dayBundleCache = new Map<string, CacheEntry<DayBundle>>();
const seedBundleCache = new Map<string, CacheEntry<SeedBundle>>();

const dayBundleInflight = new Map<string, Promise<DayBundle>>();
const seedBundleInflight = new Map<string, Promise<SeedBundle>>();

// ---------------------------------------------------------------------------
// Cache key helpers
// ---------------------------------------------------------------------------

function dayKey(enrollmentId: string): string {
  return `day:${enrollmentId}`;
}

function seedKey(seedId: string): string {
  return `seed:${seedId}`;
}

// ---------------------------------------------------------------------------
// Bundle loaders (the actual data-fetching logic)
// ---------------------------------------------------------------------------

async function createDayBundle(enrollmentId: string): Promise<DayBundle> {
  const bundle = await getEnrollmentDayBundle(enrollmentId);
  if (!bundle) throw new Error("Enrollment day bundle not found");

  // Build progress map from the activities
  const progress: Record<string, PathActivityProgress> = {};
  for (const activity of bundle.activities) {
    if (activity.progress) {
      progress[activity.id] = activity.progress;
    }
  }

  return {
    enrollment: bundle.enrollment,
    pathDay: bundle.pathDay,
    activities: bundle.activities,
    progress,
  };
}

async function createSeedBundle(seedId: string): Promise<SeedBundle> {
  const seed = await getSeedById(seedId);
  if (!seed) throw new Error("Seed not found");

  const path = await getPathBySeedId(seedId);
  if (!path) throw new Error("Path not found for seed");

  const [enrollment, days] = await Promise.all([
    getUserEnrollment(path.id).catch(() => null),
    getPathDays(path.id),
  ]);

  // Load activities for all days in parallel
  const dayActivityResults = await Promise.allSettled(
    days.map(async (day) => ({
      dayId: day.id,
      activities: await getPathDayActivities(day.id, enrollment?.id),
    })),
  );

  const activitiesByDay: Record<string, PathActivityWithContent[]> = {};
  for (const result of dayActivityResults) {
    if (result.status === "fulfilled") {
      activitiesByDay[result.value.dayId] = result.value.activities;
    }
  }

  return { seed, path, enrollment, days, activitiesByDay };
}

// ---------------------------------------------------------------------------
// Public API – Day Bundle
// ---------------------------------------------------------------------------

/** Synchronously read a cached day bundle (returns null if missing or stale). */
export function getCachedDayBundle(
  enrollmentId: string,
): CacheEntry<DayBundle> | null {
  return dayBundleCache.get(dayKey(enrollmentId)) ?? null;
}

/** Load (or revalidate) a day bundle for the given enrollment. */
export function loadDayBundle(
  enrollmentId: string,
  forceRefresh?: boolean,
): Promise<DayBundle> {
  return loadCached(
    dayBundleCache,
    dayBundleInflight,
    dayKey(enrollmentId),
    () => createDayBundle(enrollmentId),
    BUNDLE_TTL_MS,
    forceRefresh,
  );
}

/** Fire-and-forget preload of a day bundle. */
export function preloadDayBundle(enrollmentId: string): Promise<void> {
  return loadDayBundle(enrollmentId).then(() => undefined);
}

// ---------------------------------------------------------------------------
// Public API – Seed Bundle
// ---------------------------------------------------------------------------

/** Synchronously read a cached seed bundle (returns null if missing or stale). */
export function getCachedSeedBundle(
  seedId: string,
): CacheEntry<SeedBundle> | null {
  return seedBundleCache.get(seedKey(seedId)) ?? null;
}

/** Load (or revalidate) a seed bundle for the given seed id. */
export function loadSeedBundle(
  seedId: string,
  forceRefresh?: boolean,
): Promise<SeedBundle> {
  return loadCached(
    seedBundleCache,
    seedBundleInflight,
    seedKey(seedId),
    () => createSeedBundle(seedId),
    BUNDLE_TTL_MS,
    forceRefresh,
  );
}

/** Fire-and-forget preload of a seed bundle. */
export function preloadSeedBundle(seedId: string): Promise<void> {
  return loadSeedBundle(seedId).then(() => undefined);
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

/**
 * Invalidate pathlab screen caches.
 *
 * When `enrollmentId` is provided, only the matching day bundle is cleared.
 * When omitted, the entire pathlab screen cache (day + seed bundles) is
 * cleared, plus the broader pathlab module-level caches.
 */
export function invalidatePathlabCache(enrollmentId?: string): void {
  if (enrollmentId) {
    dayBundleCache.delete(dayKey(enrollmentId));
  } else {
    clearStore(dayBundleCache, dayBundleInflight);
    clearStore(seedBundleCache, seedBundleInflight);
    clearPathlabCaches();
  }
}

/** Clear all pathlab screen data caches (day + seed bundles + inflight). */
export function clearPathlabScreenData(): void {
  clearStore(dayBundleCache, dayBundleInflight);
  clearStore(seedBundleCache, seedBundleInflight);
  clearPathlabCaches();
}
