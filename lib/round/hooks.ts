/** React hooks for SHIFT rounds (spec 5.3). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { onlineManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { t as translate, type CopyKey, type CopyParams } from "./copy";
import { roundDrafts } from "./drafts";
import { DEFAULT_FLAGS, fetchFlags, readCachedFlags } from "./flags";
import { readShiftLanguage, retireLegacyReminder } from "./push";
import { LOCAL_QUERY_OPTIONS, loadHome, loadSquad, readCachedHasEntry, ROUND_QUERY_OPTIONS, roundKeys } from "./queryCore";
import { replayPending } from "./sender";
import type { Lang } from "./types";

export function useRoundUser() {
  const { session, isGuest, isHackathon, loading } = useAuth();
  const userId = !isGuest && !isHackathon ? session?.user.id ?? "" : "";
  return { userId, isGuest, isHackathon, loading, session };
}

export const roundLangKey = (userId: string) => ["round", "lang", userId] as const;

/** SHIFT screens default to Thai; only an explicit in-SHIFT choice switches to English. */
export function useRoundLang() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const { data } = useQuery({
    queryKey: roundLangKey(userId),
    queryFn: () => readShiftLanguage(userId),
    enabled: !!userId,
    staleTime: Infinity,
  });
  const lang: Lang = data === "en" ? "en" : "th";
  const t = useCallback((key: CopyKey, params?: CopyParams) => translate(lang, key, params), [lang]);
  return { lang, t };
}

export function useRoundHome(entryId: string | null = null) {
  const { userId } = useRoundUser();
  return useQuery({
    queryKey: roundKeys.home(userId, entryId),
    queryFn: () => loadHome(userId, entryId),
    enabled: !!userId,
    ...ROUND_QUERY_OPTIONS,
  });
}

export function useRoundSquad(entryId: string | null) {
  const { userId } = useRoundUser();
  return useQuery({
    queryKey: roundKeys.squad(userId, entryId),
    queryFn: () => loadSquad(userId, entryId!),
    enabled: !!userId && !!entryId,
    ...ROUND_QUERY_OPTIONS,
  });
}

export function useRoundFlags() {
  return useQuery({
    queryKey: roundKeys.flags(),
    queryFn: fetchFlags,
    ...ROUND_QUERY_OPTIONS,
  });
}

/** Flags from the freshest source: home bundle, then app_config, then defaults. */
export function useEffectiveFlags() {
  const home = useRoundHome();
  const flags = useRoundFlags();
  return home.data?.bundle.flags ?? flags.data?.flags ?? DEFAULT_FLAGS;
}

export function useRoundDrafts() {
  const { userId } = useRoundUser();
  return useQuery({
    queryKey: roundKeys.drafts(userId),
    queryFn: () => roundDrafts.list(userId),
    enabled: !!userId,
    staleTime: 0,
    ...LOCAL_QUERY_OPTIONS,
  });
}

export function useInvalidateRound() {
  const queryClient = useQueryClient();
  const { userId } = useRoundUser();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) }),
    [queryClient, userId],
  );
}

/**
 * Background replay of frozen attempts on mount, foreground and reconnect (5.7), plus the
 * legacy reminder guard (E16). Mounted once in the root layout.
 */
export function useRoundBackground() {
  const { userId } = useRoundUser();
  const queryClient = useQueryClient();
  const home = useQuery({
    queryKey: roundKeys.home(userId, null),
    queryFn: () => loadHome(userId, null),
    enabled: !!userId,
    ...ROUND_QUERY_OPTIONS,
  });
  useEffect(() => {
    void retireLegacyReminder();
  }, []);

  const running = useRef(false);
  const replay = useCallback(async () => {
    if (!userId || running.current) return;
    running.current = true;
    try {
      const results = await replayPending(userId);
      if (results.length) {
        await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
      }
    } finally {
      running.current = false;
    }
  }, [queryClient, userId]);

  useEffect(() => {
    void replay();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void replay();
    });
    const unsubscribe = onlineManager.subscribe((online) => {
      if (online) void replay();
    });
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, [replay]);
}

/** Memoized round title in the current language. */
export function useRoundTitle(round: { title_th: string; title_en: string } | null | undefined) {
  const { lang } = useRoundLang();
  return useMemo(() => (round ? (lang === "en" ? round.title_en : round.title_th) : ""), [lang, round]);
}

/**
 * The app is SHIFT (scale spec D1): `shiftMode` is true for every signed-in non-hackathon user.
 * `squadTab` is true while the user has an entry in a round and in-round features are on
 * (`tab_enabled`, D10); cached values are used when the server is unreachable (X18).
 */
export function useShiftMode() {
  const { userId, isGuest } = useRoundUser();
  const home = useRoundHome();
  const flags = useRoundFlags();
  const cached = useQuery({
    queryKey: [...roundKeys.user(userId), "nav-cache"],
    queryFn: async () => ({ hasEntry: await readCachedHasEntry(userId), flags: await readCachedFlags() }),
    enabled: !!userId,
    staleTime: Infinity,
    ...LOCAL_QUERY_OPTIONS,
  });
  const hasEntry: boolean | null = home.data ? !!home.data.bundle.entry : cached.data?.hasEntry ?? null;
  const tabEnabled: boolean | null =
    home.data?.bundle.flags?.tab_enabled ?? flags.data?.flags?.tab_enabled ?? cached.data?.flags?.tab_enabled ?? null;
  return {
    hasEntry,
    tabEnabled,
    pending: !!userId && home.isPending && cached.isPending,
    shiftMode: !isGuest && !!userId,
    squadTab: !isGuest && !!userId && hasEntry === true && tabEnabled !== false,
  };
}

/**
 * A clock for countdowns that ticks every `intervalMs` and follows the server's clock: the offset
 * between the bundle's `now` and the time it was fetched is applied to the device clock.
 */
export function useRoundNow(serverNow: string | null | undefined, fetchedAt: number, intervalMs = 30_000, fromCache = false): number {
  const offset = useMemo(() => {
    if (!serverNow || !fetchedAt || fromCache) return 0;
    const server = Date.parse(serverNow);
    return Number.isFinite(server) ? server - fetchedAt : 0;
  }, [serverNow, fetchedAt, fromCache]);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setTick(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return tick + offset;
}
