import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { readHackathonParticipant } from "../hackathon-mode";
import { registerPushToken } from "../hackathonPushTokens";
import { markInboxItemRead } from "../hackathonInbox";

export function useHackathonPushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const registerToken = useCallback(async () => {
    try {
      const participant = await readHackathonParticipant();
      if (participant?.id) {
        await registerPushToken(participant.id);
      }
    } catch (error) {
      console.error("[useHackathonPushNotifications] Failed to register token:", error);
    }
  }, []);

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      if (data?.type === "inbox_item") {
        try {
          if (typeof data.inboxItemId === "string") {
            await markInboxItemRead(data.inboxItemId);
          }
        } catch {
          // Ignore errors, we'll navigate anyway
        }

        if (typeof data.actionUrl === "string") {
          router.push(data.actionUrl as any);
        } else {
          router.push("/hackathon-program/inbox" as any);
        }
      }

      if (data?.type === "comment_reply" && typeof data.activityId === "string") {
        router.push(`/hackathon-program/activity/${data.activityId}` as any);
      }
    },
    []
  );

  useEffect(() => {
    registerToken();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[useHackathonPushNotifications] Notification received:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [registerToken, handleNotificationResponse]);
}
