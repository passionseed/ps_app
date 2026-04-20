import { supabase } from "./supabase";
import type {
  InboxItem,
  InboxItemWithUnread,
  InboxPreview,
  GetInboxItemsOptions,
  InboxItemsResponse,
} from "../types/hackathon-inbox";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { readHackathonParticipant } from "./hackathon-mode";


const RETRYABLE_MESSAGES = [
  "network request failed",
  "failed to fetch",
  "ssl handshake failed",
  "cloudflare",
];

function stringifyError(error: unknown): string {
  if (error == null) return "Unknown error";
  if (error instanceof Error) return error.message || "Error";
  if (typeof error === "string") return error;
  if (typeof error !== "object") return String(error);
  try {
    const str = JSON.stringify(error);
    if (str !== undefined && str !== "undefined") return str;
  } catch {}
  try {
    const str = String(error);
    if (str !== undefined && str !== "undefined" && str !== "[object Object]") return str;
  } catch {}
  return "Unknown error";
}

function isRetryable(error: unknown): boolean {
  const message = stringifyError(error).toLowerCase();
  return RETRYABLE_MESSAGES.some((snippet) => message.includes(snippet));
}

async function withRetry<T>(
  task: () => Promise<T>,
  fallback: string,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === attempts) {
        const errorMessage = stringifyError(error);
        throw new Error(errorMessage || fallback || "Operation failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  const lastErrorMessage = stringifyError(lastError);
  throw new Error(lastErrorMessage || fallback || "Operation failed after retries");
}

function mapInboxItemWithUnread(item: InboxItem): InboxItemWithUnread {
  return {
    ...item,
    isUnread: item.read_at === null,
  };
}

export async function getInboxItems(
  options: GetInboxItemsOptions = {}
): Promise<InboxItemsResponse> {
  return withRetry(async () => {
    const participant = await readHackathonParticipant();

    if (!participant?.id) {
      return { items: [], totalCount: 0, unreadCount: 0, hasMore: false };
    }

    const { unreadOnly = false, limit = 50, offset = 0 } = options;

    let query = supabase
      .from("hackathon_participant_inbox_items")
      .select("*", { count: "exact" })
      .eq("participant_id", participant.id)
      .order("created_at", { ascending: false });

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    if (limit > 0) {
      query = query.limit(limit).range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch inbox items: ${error.message}`);
    }

    const items = (data as InboxItem[] | null) ?? [];

    const unreadCountQuery = await supabase
      .from("hackathon_participant_inbox_items")
      .select("*", { count: "exact", head: true })
      .eq("participant_id", participant.id)
      .is("read_at", null);

    const unreadCount = unreadCountQuery.count ?? 0;
    const totalCount = count ?? 0;

    return {
      items: items.map(mapInboxItemWithUnread),
      totalCount,
      unreadCount,
      hasMore: offset + items.length < totalCount,
    };
  }, "Unable to load inbox items");
}

export async function getUnreadInboxCount(): Promise<number> {
  return withRetry(async () => {
    const participant = await readHackathonParticipant();

    if (!participant?.id) {
      return 0;
    }

    const { count, error } = await supabase
      .from("hackathon_participant_inbox_items")
      .select("*", { count: "exact", head: true })
      .eq("participant_id", participant.id)
      .is("read_at", null);

    if (error) {
      throw new Error(`Failed to fetch unread count: ${error.message}`);
    }

    return count ?? 0;
  }, "Unable to load unread count");
}

export async function getInboxPreview(): Promise<InboxPreview | null> {
  return withRetry(async () => {
    const participant = await readHackathonParticipant();

    if (!participant?.id) {
      return null;
    }

    const [{ count: totalCount }, { count: unreadCount }, { data: recentItems }] =
      await Promise.all([
        supabase
          .from("hackathon_participant_inbox_items")
          .select("*", { count: "exact", head: true })
          .eq("participant_id", participant.id),
        supabase
          .from("hackathon_participant_inbox_items")
          .select("*", { count: "exact", head: true })
          .eq("participant_id", participant.id)
          .is("read_at", null),
        supabase
          .from("hackathon_participant_inbox_items")
          .select("*")
          .eq("participant_id", participant.id)
          .order("created_at", { ascending: false })
          .limit(2),
      ]);

    return {
      unreadCount: unreadCount ?? 0,
      totalCount: totalCount ?? 0,
      recentItems:
        (recentItems as InboxItem[] | null)?.map(mapInboxItemWithUnread) ?? [],
    };
  }, "Unable to load inbox preview");
}

export async function markInboxItemRead(itemId: string): Promise<void> {
  return withRetry(async () => {
    const participant = await readHackathonParticipant();

    if (!participant?.id) {
      throw new Error("No participant session found");
    }

    const { error } = await supabase
      .from("hackathon_participant_inbox_items")
      .update({ read_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("participant_id", participant.id);

    if (error) {
      throw new Error(`Failed to mark item as read: ${error.message}`);
    }
  }, "Unable to mark item as read");
}

export async function markAllInboxItemsRead(): Promise<void> {
  return withRetry(async () => {
    const participant = await readHackathonParticipant();

    if (!participant?.id) {
      throw new Error("No participant session found");
    }

    const { error } = await supabase
      .from("hackathon_participant_inbox_items")
      .update({ read_at: new Date().toISOString() })
      .eq("participant_id", participant.id)
      .is("read_at", null);

    if (error) {
      throw new Error(`Failed to mark all items as read: ${error.message}`);
    }
  }, "Unable to mark all items as read");
}

export async function subscribeToInbox(
  callback: (unreadCount: number) => void
): Promise<RealtimeChannel | null> {
  const participant = await readHackathonParticipant();

  if (!participant?.id) {
    return null;
  }

  const channelName = `inbox-${participant.id}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hackathon_participant_inbox_items",
        filter: `participant_id=eq.${participant.id}`,
      },
      async () => {
        const count = await getUnreadInboxCount();
        callback(count);
      }
    )
    .subscribe();

  return channel;
}

export async function unsubscribeFromInbox(
  channel: RealtimeChannel
): Promise<void> {
  await supabase.removeChannel(channel);
}
