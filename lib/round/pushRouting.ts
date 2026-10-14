/** Push taps route via `data.url` (5.8, 4.4). */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { linkToPath } from "./navigation";

type NotificationsModule = typeof import("expo-notifications");
type ResponseLike = {
  actionIdentifier?: string;
  notification: { request: { identifier: string; content: { data?: unknown } } };
};

/** In-app path for a notification response, or null when it carries no round link. */
export function pathForResponse(response: ResponseLike | null | undefined): string | null {
  const data = response?.notification.request.content.data as { url?: unknown } | undefined;
  return linkToPath(typeof data?.url === "string" ? data.url : null);
}

/** Stable id of a response so a tap is routed once (live listener and cold-start lookup overlap). */
export function responseId(response: ResponseLike): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier ?? ""}`;
}

/**
 * Routes a cold-start tap (the app was launched by the notification) once the Stack is mounted.
 * `handled` holds response ids already routed in this process.
 */
export async function routeLastResponse(
  getLast: () => Promise<ResponseLike | null>,
  handled: Set<string>,
  onPath: (path: string) => void,
): Promise<void> {
  let response: ResponseLike | null = null;
  try {
    response = await getLast();
  } catch {
    return;
  }
  if (!response) return;
  const id = responseId(response);
  if (handled.has(id)) return;
  handled.add(id);
  const path = pathForResponse(response);
  if (path) onPath(path);
}

const handledResponses = new Set<string>();

function loadNotifications(): NotificationsModule | null {
  if (Platform.OS === "web") return null;
  try {
    return require("expo-notifications") as NotificationsModule;
  } catch {
    return null;
  }
}

/**
 * Routes push taps. `ready` must be true only once the root Stack is mounted: taps that arrive
 * earlier (including the one that cold-started the app) are routed when it turns true.
 */
export function useRoundPushRouting(onPath: (path: string) => void, ready = true) {
  const handler = useRef(onPath);
  handler.current = onPath;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const queued = useRef<string | null>(null);

  useEffect(() => {
    const Notifications = loadNotifications();
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = responseId(response);
      if (handledResponses.has(id)) return;
      handledResponses.add(id);
      const path = pathForResponse(response);
      if (!path) return;
      if (readyRef.current) handler.current(path);
      else queued.current = path;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (queued.current) {
      const path = queued.current;
      queued.current = null;
      handler.current(path);
    }
    const Notifications = loadNotifications();
    if (!Notifications?.getLastNotificationResponseAsync) return;
    void routeLastResponse(() => Notifications.getLastNotificationResponseAsync(), handledResponses, (path) => handler.current(path));
  }, [ready]);
}
