/** React hooks for SHIFT rounds (spec 5.3). */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { onlineManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { t as translate, type CopyKey, type CopyParams } from "./copy";
import { roundDrafts } from "./drafts";
import { DEFAULT_FLAGS, fetchFlags, readCachedFlags } from "./flags";
import { isShiftMode } from "./navigation";
import { applyLegacyReminderGuard, readShiftLanguage } from "./push";
import { LOCAL_QUERY_OPTIONS, loadHome, loadSquad, readCachedHasEntry, ROUND_QUERY_OPTIONS, roundKeys } from "./queryCore";
import { hasActiveEntry } from "./next";
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
  const active = hasActiveEntry(home.data?.bundle);
  useEffect(() => {
    if (userId && home.data) void applyLegacyReminderGuard(userId, active);
  }, [active, userId, home.data]);

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

/**
 * Whether the SHIFT entry decision must still wait (spec 5.2, X5). Flags alone do not settle
 * it: without a cached "has entry" bit we wait for home, or a SHIFT entrant whose flag is off
 * would be routed away from the SHIFT tabs.
 */
export function shiftModePending(input: {
  userId: string;
  homePending: boolean;
  cachePending: boolean;
  cachedHasEntry: boolean | null;
  flagsPending: boolean;
}): boolean {
  if (!input.userId || !input.homePending) return false;
  if (input.cachePending || input.cachedHasEntry === null) return true;
  return input.flagsPending;
}

/** Memoized round title in the current language. */
export function useRoundTitle(round: { title_th: string; title_en: string } | null | undefined) {
  const { lang } = useRoundLang();
  return useMemo(() => (round ? (lang === "en" ? round.title_en : round.title_th) : ""), [lang, round]);
}

/**
 * Whether SHIFT tabs are the entry (5.2): `tab_enabled` or an existing entry. Uses cached values
 * when the server is unreachable; an existing entry always keeps SHIFT tabs (X18).
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
  const pending = shiftModePending({
    userId,
    homePending: home.isPending,
    cachePending: cached.isPending,
    cachedHasEntry: cached.data?.hasEntry ?? null,
    flagsPending: flags.isPending,
  });
  return {
    hasEntry,
    tabEnabled,
    pending,
    shiftMode: !isGuest && !!userId && isShiftMode({ hasEntry, tabEnabled }),
  };
}
