import { storage } from "./storage";
import type { Seed } from "../types/seeds";
import type { Path, PathEnrollment, PathDay, PathReflection } from "../types/pathlab";
import type { ExpertInfo } from "./pathlab";

export const SEED_DETAIL_CACHE_SCHEMA_VERSION = 1;
export const SEED_DETAIL_CACHE_KEY_PREFIX = "seed-detail-cache";
export const SEED_DETAIL_CACHE_TTL_MS = 30 * 60 * 1000;

export type SeedDetailSnapshot = {
  version: number;
  seedId: string;
  cachedAt: string;
  seed: Seed | null;
  expert: ExpertInfo | null;
  path: Path | null;
  enrollment: PathEnrollment | null;
  pathDays: Pick<PathDay, "id" | "day_number" | "title">[];
  dayActivities: Record<string, { id: string; title: string; content_type: string }[]>;
  reflections: Record<number, PathReflection>;
};

function getSeedDetailCacheKey(seedId: string): string {
  return `${SEED_DETAIL_CACHE_KEY_PREFIX}/${seedId}`;
}

function isSeedDetailSnapshot(value: unknown): value is SeedDetailSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<SeedDetailSnapshot>;
  return (
    snapshot.version === SEED_DETAIL_CACHE_SCHEMA_VERSION &&
    typeof snapshot.seedId === "string" &&
    typeof snapshot.cachedAt === "string"
  );
}

const memoryCache = new Map<string, SeedDetailSnapshot>();

export function getSeedDetailCacheStatus(
  snapshot: SeedDetailSnapshot | null,
  now = Date.now(),
  ttlMs = SEED_DETAIL_CACHE_TTL_MS,
) {
  const cachedAt = snapshot ? new Date(snapshot.cachedAt).getTime() : Number.NaN;
  const isFresh = Number.isFinite(cachedAt) && now - cachedAt <= ttlMs;
  return { isFresh, isUsableWhileRevalidating: Boolean(snapshot) };
}

export function readCachedSeedDetailSnapshot(
  seedId: string,
): SeedDetailSnapshot | null {
  const memory = memoryCache.get(seedId);
  if (memory) return memory;

  const raw = storage.getString(getSeedDetailCacheKey(seedId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isSeedDetailSnapshot(parsed) || parsed.seedId !== seedId) return null;
    memoryCache.set(seedId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedSeedDetailSnapshot(
  snapshot: SeedDetailSnapshot,
): void {
  memoryCache.set(snapshot.seedId, snapshot);
  storage.set(
    getSeedDetailCacheKey(snapshot.seedId),
    JSON.stringify(snapshot),
  );
}

export function clearCachedSeedDetailSnapshot(seedId: string): void {
  memoryCache.delete(seedId);
  storage.delete(getSeedDetailCacheKey(seedId));
}
