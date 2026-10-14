import { beforeEach, describe, expect, it, vi } from "vitest";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";

const storage = new Map<string, string>();
vi.mock("../lib/shiftStorage", () => ({
  shiftStorage: {
    getItem: async (k: string) => storage.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: async (k: string) => {
      storage.delete(k);
    },
    keys: async () => [],
  },
}));
const rpc = vi.hoisted(() => vi.fn());
vi.mock("../lib/supabase", () => ({ supabase: { rpc } }));

import { RoundApiError } from "../lib/round/api";
import {
  LOCAL_QUERY_OPTIONS,
  loadHome,
  loadSquad,
  PENDING_LINK_KEY,
  readCachedHasEntry,
  ROUND_QUERY_OPTIONS,
  roundKeys,
  wireQueryManagers,
} from "../lib/round/queryCore";
import { pendingLinkQuery } from "../lib/round/pendingLink";
import { bundle } from "./fixtures/round";

beforeEach(() => {
  storage.clear();
  rpc.mockReset();
});

describe("round queries (E18)", () => {
  it("refetch on focus and reconnect with a 30 s stale time", () => {
    expect(ROUND_QUERY_OPTIONS).toMatchObject({ refetchOnWindowFocus: true, refetchOnReconnect: true, staleTime: 30_000 });
    expect(roundKeys.home("u", null)).toEqual(["round", "u", "home", "current"]);
    expect(roundKeys.squad("u", "e")).toEqual(["round", "u", "squad", "e"]);
  });

  it("wires focus to AppState and online state to expo-network", () => {
    let appListener: (s: string) => void = () => {};
    let netListener: (s: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) => void = () => {};
    const appState = { addEventListener: vi.fn((_t: "change", l: (s: string) => void) => ((appListener = l), { remove: vi.fn() })) };
    const network = { addNetworkStateListener: vi.fn((l: typeof netListener) => ((netListener = l), { remove: vi.fn() })) };
    wireQueryManagers(appState, network);
    appListener("background");
    expect(focusManager.isFocused()).toBe(false);
    appListener("active");
    expect(focusManager.isFocused()).toBe(true);
    netListener({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);
    netListener({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("a round query refetches when the app returns to the foreground", async () => {
    let appListener: (s: string) => void = () => {};
    wireQueryManagers({ addEventListener: (_t, l) => ((appListener = l), { remove: () => {} }) }, null);
    const client = new QueryClient();
    client.mount();
    const fn = vi.fn(async () => 1);
    const { QueryObserver } = await import("@tanstack/react-query");
    const observer = new QueryObserver(client, { queryKey: ["round", "u", "probe"], queryFn: fn, ...ROUND_QUERY_OPTIONS, staleTime: 0 });
    const unsubscribe = observer.subscribe(() => {});
    await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    appListener("background");
    appListener("active");
    await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    unsubscribe();
    client.unmount();
    client.clear();
  });

  it("caches the home bundle and serves it with the error when offline (5.4)", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true, data: bundle(), request_id: "r" }, error: null, status: 200 });
    const fresh = await loadHome("u");
    expect(fresh.fromCache).toBe(false);
    expect(await readCachedHasEntry("u")).toBe(true);
    rpc.mockImplementationOnce(async () => {
      throw new TypeError("Network request failed");
    });
    const cached = await loadHome("u");
    expect(cached).toMatchObject({ fromCache: true, error: { category: "offline" } });
    expect(cached.bundle.entry?.handle).toBe("ต้น");
  });

  it("never serves a cache on unauthenticated, and throws when nothing is cached", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST301", message: "JWT expired" }, status: 401 });
    await expect(loadHome("u")).rejects.toBeInstanceOf(RoundApiError);
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "missing" }, status: 404 });
    await expect(loadHome("other")).rejects.toMatchObject({ error: { category: "unavailable" } });
  });

  it("returns the waiting squad state when the server says squad_not_assigned", async () => {
    rpc.mockResolvedValueOnce({
      data: { ok: false, error: { code: "squad_not_assigned", category: "validation" }, request_id: null },
      error: null,
      status: 200,
    });
    expect((await loadSquad("u", "e")).bundle.state).toBe("waiting");
  });
});

describe("offline does not pause local-only queries (expo-network wiring)", () => {
  async function runOffline(options: Record<string, unknown>, fn: () => Promise<unknown>) {
    onlineManager.setOnline(false);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.mount();
    const { QueryObserver } = await import("@tanstack/react-query");
    const observer = new QueryObserver(client, { queryKey: ["probe", Math.random()], queryFn: fn, ...options });
    const unsubscribe = observer.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 10));
    const result = observer.getCurrentResult();
    unsubscribe();
    client.unmount();
    client.clear();
    onlineManager.setOnline(true);
    return result;
  }

  it("a default-mode query pauses offline (the bug) while local queries still resolve", async () => {
    const paused = await runOffline({}, async () => 1);
    expect(paused.fetchStatus).toBe("paused");
    expect(paused.isPending).toBe(true);
    const local = await runOffline({ ...LOCAL_QUERY_OPTIONS }, async () => 1);
    expect(local).toMatchObject({ isPending: false, data: 1 });
  });

  it("the pending deep link resolves offline so the splash is not held", async () => {
    storage.set(PENDING_LINK_KEY, "/round/join?r=abc");
    const result = await runOffline({ ...pendingLinkQuery, queryKey: ["probe-link"] }, pendingLinkQuery.queryFn);
    expect(result).toMatchObject({ isPending: false, data: "/round/join?r=abc" });
  });

  it("round network queries still run once offline so they can fall back to their cache", async () => {
    const fn = vi.fn(async () => "cached");
    const result = await runOffline({ ...ROUND_QUERY_OPTIONS }, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.data).toBe("cached");
  });
});
