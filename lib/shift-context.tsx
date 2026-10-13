import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { campAction, listCampCohorts } from "./shift";
import { queryKeys, staleTimes } from "./queryClient";
import { shiftStorage } from "./shiftStorage";
import type { ShiftAction, ShiftCohort, ShiftSnapshot } from "../types/shift";

type CampContext = {
  cohorts: ShiftCohort[];
  snapshot: ShiftSnapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  select: (id: string) => Promise<void>;
  act: (
    action: ShiftAction,
    payload?: Record<string, unknown>,
  ) => Promise<ShiftSnapshot>;
};
const Context = createContext<CampContext | null>(null);
export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest, isHackathon } = useAuth();
  const queryClient = useQueryClient();
  const userId = !isGuest && !isHackathon ? user?.id ?? "" : "";
  const activeUser = useRef(userId);
  activeUser.current = userId;
  const cohortsQuery = useQuery({
    queryKey: queryKeys.shift.cohorts(userId),
    queryFn: listCampCohorts,
    enabled: !!userId,
    staleTime: staleTimes.userContent,
  });
  const selectionQuery = useQuery({
    queryKey: queryKeys.shift.selection(userId),
    queryFn: () => shiftStorage.getItem(`shift-cohort:${userId}`).catch(() => null),
    enabled: !!userId,
    staleTime: Infinity,
  });
  const cohorts = userId ? cohortsQuery.data ?? [] : [];
  const cohortId =
    cohorts.find((c) => c.id === selectionQuery.data)?.id ?? cohorts[0]?.id ?? "";
  const snapshotQuery = useQuery({
    queryKey: queryKeys.shift.snapshot(userId, cohortId),
    queryFn: () => campAction("snapshot", cohortId),
    enabled: !!userId && !!cohortId && !selectionQuery.isPending,
    staleTime: staleTimes.userContent,
  });
  const snapshot = userId && cohortId ? snapshotQuery.data ?? null : null;
  const loading = !!userId && (
    cohortsQuery.isPending || selectionQuery.isPending ||
    (!!cohortId && snapshotQuery.isPending)
  );
  const queryError = cohortsQuery.error ?? snapshotQuery.error;
  const error = userId && queryError ? queryError.message : null;

  const reload = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.shift.user(userId) });
  }, [queryClient, userId]);
  useEffect(() => {
    return () => {
      if (userId) queryClient.removeQueries({ queryKey: queryKeys.shift.user(userId) });
    };
  }, [queryClient, userId]);
  const select = async (id: string) => {
    if (!userId || !cohorts.some((c) => c.id === id)) return;
    queryClient.setQueryData(queryKeys.shift.selection(userId), id);
    await shiftStorage.setItem(`shift-cohort:${userId}`, id).catch(() => {});
  };
  // E15/A51: the interactive camp is legacy and read-only. No write action of
  // `shift_camp_action` is called from the app any more; only `list` and `snapshot` remain.
  const act = async (
    _action: ShiftAction,
    _payload: Record<string, unknown> = {},
  ): Promise<ShiftSnapshot> => {
    throw new Error(
      snapshot?.introduction?.language === "th"
        ? "แคมป์นี้ปิดแล้ว ดูได้อย่างเดียว"
        : "This camp has ended and is read-only.",
    );
  };
  return (
    <Context.Provider
      value={{ cohorts, snapshot, loading, error, reload, select, act }}
    >
      {children}
    </Context.Provider>
  );
}
export function useShift() {
  const value = useContext(Context);
  if (!value) throw new Error("ShiftProvider required");
  return value;
}
