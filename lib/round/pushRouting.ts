/** Push taps route via `data.url` (5.8, 4.4). */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { linkToPath } from "./navigation";

export function useRoundPushRouting(onPath: (path: string) => void) {
  const handler = useRef(onPath);
  handler.current = onPath;
  useEffect(() => {
    if (Platform.OS === "web") return;
    let Notifications: typeof import("expo-notifications") | null = null;
    try {
      Notifications = require("expo-notifications");
    } catch {
      return;
    }
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { url?: unknown } | undefined;
      const path = linkToPath(typeof data?.url === "string" ? data.url : null);
      if (path) handler.current(path);
    });
    return () => sub.remove();
  }, []);
}
