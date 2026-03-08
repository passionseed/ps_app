import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushPermissions(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#BFFF00",
    });
  }

  return token.data;
}

export async function savePushToken(
  userId: string,
  token: string,
): Promise<void> {
  await supabase
    .from("profiles")
    .update({
      expo_push_token: token,
    })
    .eq("id", userId);
}

export async function removePushToken(userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({
      expo_push_token: null,
    })
    .eq("id", userId);
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string = "Time to grow! 🌱",
  body: string = "Continue your daily learning path.",
): Promise<string> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: "daily",
      hour,
      minute,
    } as Notifications.DailyTriggerInput,
  });

  return identifier;
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
