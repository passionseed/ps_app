/**
 * React Query plumbing for SHIFT rounds (spec 5.3, E18). Kept free of React and auth imports
 * so it is unit-testable; hooks live in `lib/round/hooks.ts`.
 */
import { focusManager, onlineManager, type QueryClient } from "@tanstack/react-query";
import { shiftStorage } from "../shiftStorage";
import { roundApi, RoundApiError } from "./api";
import { cacheFlags } from "./flags";
import { hasActiveEntry } from "./next";
import { normalizeHome } from "./normalize";
import type { HomeBundle, RoundError, SquadBundle } from "./types";

export const roundKeys = {
  all: ["round"] as const,
  user: (userId: string) => ["round", userId] as const,
  home: (userId: string, entryId: string | null = null) => ["round", userId, "home", entryId ?? "current"] as const,
  squad: (userId: string, entryId: string | null) => ["round", userId, "squad", entryId ?? "none"] as const,
  flags: () => ["round", "flags"] as const,
  drafts: (userId: string) => ["round", userId, "drafts"] as const,
};

/**
 * E18: round queries refetch on focus and reconnect, and are fresh for 30 s. `offlineFirst`
 * runs the first fetch even when offline so loaders can fall back to their local cache instead
 * of pausing (a paused query would keep the splash up).
 */
export const ROUND_QUERY_OPTIONS = {
  networkMode: "offlineFirst",
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  staleTime: 30_000,
  retry: (failureCount: number, error: unknown) => {
    const category = error instanceof RoundApiError ? error.error.category : "retryable";
    return category === "retryable" && failureCount < 2;
  },
} as const;

/** Queries that only read local storage (pending link, nav cache, drafts) never wait for the network. */
export const LOCAL_QUERY_OPTIONS = { networkMode: "always" } as const;

export const homeCacheKey = (userId: string) => `round:home:${userId}`;
export const hasEntryKey = (userId: string) => `round:has-entry:${userId}`;
export const PENDING_LINK_KEY = "round:pending-link";

export type HomeResult = { bundle: HomeBundle; fromCache: boolean; error: RoundError | null };

/**
 * Loads the home bundle (normalized, so older servers still render). On offline/retryable/
 * unavailable errors returns the cached bundle with the error so the screen can show "cached +
 * offline" (5.4). Throws when nothing is cached; Home then shows the built-in landing (D10).
 */
export async function loadHome(userId: string, entryId: string | null = null): Promise<HomeResult> {
  const result = await roundApi.home(entryId);
  if (result.ok) {
    const bundle = normalizeHome(result.data);
    await Promise.all([
      shiftStorage.setItem(homeCacheKey(userId), JSON.stringify(bundle)).catch(() => {}),
      shiftStorage.setItem(hasEntryKey(userId), bundle.entry ? "1" : "0").catch(() => {}),
      bundle.flags ? cacheFlags(bundle.flags) : Promise.resolve(),
    ]);
    return { bundle, fromCache: false, error: null };
  }
  if (result.error.category === "unauthenticated" || result.error.code === "entry_not_found") {
    throw new RoundApiError(result.error);
  }
  const cached = await readCachedHome(userId);
  if (cached) return { bundle: cached, fromCache: true, error: result.error };
  throw new RoundApiError(result.error);
}

export async function readCachedHome(userId: string): Promise<HomeBundle | null> {
  const raw = await shiftStorage.getItem(homeCacheKey(userId)).catch(() => null);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    // Caches written by older app versions predate plan/habits/session fields: normalize them too.
    return value && typeof value === "object" && "flags" in value ? normalizeHome(value) : null;
  } catch {
    return null;
  }
}

/** Cached "has an entry" bit used by navigation when the server is unreachable (X18). */
export async function readCachedHasEntry(userId: string): Promise<boolean | null> {
  const raw = await shiftStorage.getItem(hasEntryKey(userId)).catch(() => null);
  return raw === "1" ? true : raw === "0" ? false : null;
}

export const squadCacheKey = (userId: string) => `round:squad:${userId}`;

export type SquadResult = { bundle: SquadBundle; fromCache: boolean; error: RoundError | null };

export async function loadSquad(userId: string, entryId: string): Promise<SquadResult> {
  const result = await roundApi.squad(entryId);
  if (result.ok) {
    await shiftStorage.setItem(squadCacheKey(userId), JSON.stringify(result.data)).catch(() => {});
    return { bundle: result.data, fromCache: false, error: null };
  }
  if (result.error.code === "squad_not_assigned") {
    return { bundle: { state: "waiting", squad: null, members: [], feed: [] }, fromCache: false, error: null };
  }
  if (result.error.category === "unauthenticated") throw new RoundApiError(result.error);
  const raw = await shiftStorage.getItem(squadCacheKey(userId)).catch(() => null);
  if (raw) {
    try {
      return { bundle: JSON.parse(raw) as SquadBundle, fromCache: true, error: result.error };
    } catch {
      // fall through
    }
  }
  throw new RoundApiError(result.error);
}

type AppStateLike = {
  addEventListener: (type: "change", listener: (state: string) => void) => { remove: () => void };
};
type NetworkLike = {
  addNetworkStateListener: (listener: (state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) => void) => {
    remove: () => void;
  };
};

/**
 * Wires `focusManager` to AppState and `onlineManager` to expo-network (E18). Only queries
 * that opt in (round queries) refetch; the global default keeps `refetchOnWindowFocus: false`.
 * While offline, default-mode queries pause: local-only queries must use `LOCAL_QUERY_OPTIONS`.
 */
export function wireQueryManagers(appState: AppStateLike, network: NetworkLike | null): () => void {
  const cleanups: (() => void)[] = [];
  focusManager.setEventListener((handleFocus) => {
    const sub = appState.addEventListener("change", (state) => handleFocus(state === "active"));
    return () => sub.remove();
  });
  if (network) {
    onlineManager.setEventListener((setOnline) => {
      const sub = network.addNetworkStateListener((state) => {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false);
      });
      return () => sub.remove();
    });
  }
  cleanups.push(() => focusManager.setEventListener(() => () => {}));
  return () => cleanups.forEach((c) => c());
}

/** E10: on delete or account switch, drop every round query and cached bundle for the user. */
export async function clearRoundUser(queryClient: QueryClient, userId: string): Promise<void> {
  queryClient.removeQueries({ queryKey: roundKeys.user(userId) });
  await Promise.all([
    shiftStorage.removeItem(homeCacheKey(userId)).catch(() => {}),
    shiftStorage.removeItem(hasEntryKey(userId)).catch(() => {}),
    shiftStorage.removeItem(squadCacheKey(userId)).catch(() => {}),
  ]);
}

export { hasActiveEntry };
