/** Pending deep link kept across sign-in (5.2: `shiftStorage` key `round:pending-link`). */
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { shiftStorage } from "../shiftStorage";
import { isSafeNext } from "./navigation";
import { LOCAL_QUERY_OPTIONS, PENDING_LINK_KEY } from "./queryCore";

const KEY = ["round", "pending-link"] as const;

export const pendingLinkQuery = {
  queryKey: KEY,
  queryFn: async () => {
    const value = await shiftStorage.getItem(PENDING_LINK_KEY).catch(() => null);
    return isSafeNext(value) ? value : null;
  },
  staleTime: Infinity,
  ...LOCAL_QUERY_OPTIONS,
};

export function usePendingLink() {
  return useQuery(pendingLinkQuery);
}

export async function setPendingLink(queryClient: QueryClient, link: string | null | undefined): Promise<void> {
  if (!isSafeNext(link)) return;
  queryClient.setQueryData(KEY, link);
  await shiftStorage.setItem(PENDING_LINK_KEY, link).catch(() => {});
}

export async function clearPendingLink(queryClient: QueryClient): Promise<void> {
  queryClient.setQueryData(KEY, null);
  await shiftStorage.removeItem(PENDING_LINK_KEY).catch(() => {});
}
