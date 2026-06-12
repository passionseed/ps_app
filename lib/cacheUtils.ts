/**
 * Generic, type-safe in-memory cache utilities.
 *
 * Extracted from the loadCached/readFresh/writeCache pattern
 * originally in lib/hackathonScreenData.ts.
 *
 * Features:
 * - TTL-based freshness checks
 * - Inflight request deduplication
 * - Optional max-size eviction (LRU-simple: evict oldest by insertion order)
 * - Prefix-based invalidation
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFresh<T>(entry: CacheEntry<T> | undefined, ttlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp <= ttlMs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read from a cache store if the entry exists and is still fresh.
 * Returns `null` when the entry is missing or stale.
 */
export function readFresh<T>(
  store: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
): T | null {
  const entry = store.get(key);
  if (!entry || !isFresh(entry, ttlMs)) return null;
  return entry.data;
}

/**
 * Write a value into the cache store.
 *
 * @param maxSize  When > 0, the oldest entry (by Map insertion order)
 *                 is evicted if the store exceeds this size after insertion.
 */
export function writeCache<T>(
  store: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  maxSize?: number,
): T {
  store.set(key, { data, timestamp: Date.now() });

  if (maxSize !== undefined && maxSize > 0 && store.size > maxSize) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  return data;
}

/**
 * Load a value from cache, or fetch it via `loader` (with inflight
 * deduplication so concurrent callers share a single running promise).
 *
 * @param forceRefresh  When true, skips the cache read and always calls
 *                      `loader`. The fresh result is still written back
 *                      to the cache.
 */
export async function loadCached<T>(
  store: Map<string, CacheEntry<T>>,
  inflight: Map<string, Promise<T>>,
  key: string,
  loader: () => Promise<T>,
  ttlMs: number,
  forceRefresh?: boolean,
): Promise<T> {
  if (!forceRefresh) {
    const cached = readFresh(store, key, ttlMs);
    if (cached) return cached;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = loader()
    .then((data) => writeCache(store, key, data))
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Remove every entry whose key starts with `prefix`.
 * Useful for scoped cache invalidation after a mutation.
 */
export function invalidateByPrefix<T>(
  store: Map<string, CacheEntry<T>>,
  prefix: string,
): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * Clear the entire cache store (and optionally the inflight map).
 */
export function clearStore<T>(
  store: Map<string, CacheEntry<T>>,
  inflight?: Map<string, Promise<T>>,
): void {
  store.clear();
  if (inflight) inflight.clear();
}
