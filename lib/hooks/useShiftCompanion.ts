import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { companionStatus, loadToday } from "../shiftCompanion";
import { queryKeys, staleTimes } from "../queryClient";
import { loadCompanionAccess } from "../shiftCompanionRecovery";
import { shiftStorage } from "../shiftStorage";

export function useShiftCompanion(withToday = false) {
  const { user, isGuest, isHackathon } = useAuth();
  const client = useQueryClient();
  const userId = !isGuest && !isHackathon ? user?.id ?? "" : "";
  const statusQuery = useQuery({ queryKey: queryKeys.shift.companion(userId), queryFn: () => loadCompanionAccess(userId, companionStatus),
    enabled: !!userId, staleTime: staleTimes.userContent });
  const selection = useQuery({ queryKey: queryKeys.shift.selection(userId),
    queryFn: () => shiftStorage.getItem(`shift-cohort:${userId}`).catch(() => null),
    enabled: !!userId, staleTime: Infinity });
  const cohorts = userId ? statusQuery.data?.cohorts ?? [] : [];
  const cohort = cohorts.find((item) => item.id === selection.data) ?? cohorts[0];
  const todayQuery = useQuery({ queryKey: queryKeys.shift.daily(userId, cohort?.id ?? ""),
    queryFn: async () => {
      const result = await loadToday(cohort!.id);
      if (!result.ok) throw new Error(result.error);
      return result;
    }, enabled: withToday && !!userId && !!cohort, staleTime: staleTimes.userContent,
    refetchInterval: withToday ? 60_000 : false, refetchOnMount: "always" });
  const select = async (id: string) => {
    if (!cohorts.some((item) => item.id === id)) return;
    client.setQueryData(queryKeys.shift.selection(userId), id);
    await shiftStorage.setItem(`shift-cohort:${userId}`, id).catch(() => {});
  };
  const offline = !!(statusQuery.data && "fromDevice" in statusQuery.data);
  return { offline, userId, cohort, cohorts, statusQuery, todayQuery, select,
    today: userId ? todayQuery.data ?? null : null,
    loading: !!userId && (statusQuery.isPending || (withToday && !!cohort && todayQuery.isPending)),
    error: statusQuery.error ?? (withToday ? todayQuery.error : null),
    reload: () => client.invalidateQueries({ queryKey: queryKeys.shift.user(userId) }) };
}
