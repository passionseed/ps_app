import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import { getExpoProjectId } from "./runtime-config";
import type { MobileSettings } from "../types/onboarding";
export {
  getPathNotificationEventsForEnrollment,
  getPathNotificationEventsForReflection,
  sendPathNotificationEvent,
} from "./pathNotifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  push_enabled: true,
  reminder_time: "09:00",
  theme: "light",
};

export const REMINDER_TIME_OPTIONS = [
  { value: "07:00", label: "7 AM" },
  { value: "09:00", label: "9 AM" },
  { value: "12:00", label: "12 PM" },
  { value: "18:00", label: "6 PM" },
  { value: "21:00", label: "9 PM" },
] as const;

function normalizeMobileSettings(
  settings: Partial<MobileSettings> | MobileSettings | null | undefined,
): MobileSettings {
  return {
    ...DEFAULT_MOBILE_SETTINGS,
    ...(settings ?? {}),
  };
}

async function updateNotificationProfile(
  userId: string,
  payload: {
    mobile_settings: MobileSettings;
    expo_push_token: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

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
    projectId: getExpoProjectId(),
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
  const { error } = await supabase
    .from("profiles")
    .update({
      expo_push_token: token,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removePushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      expo_push_token: null,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
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

export async function enablePushNotifications(
  userId: string,
  settings: MobileSettings,
): Promise<{
  granted: boolean;
  expoPushToken: string | null;
  settings: MobileSettings;
}> {
  const normalizedSettings = normalizeMobileSettings({
    ...settings,
    push_enabled: true,
  });
  const expoPushToken = await requestPushPermissions();

  if (!expoPushToken) {
    const disabledSettings = {
      ...normalizedSettings,
      push_enabled: false,
    };
    await cancelAllReminders();
    await updateNotificationProfile(userId, {
      mobile_settings: disabledSettings,
      expo_push_token: null,
    });
    return {
      granted: false,
      expoPushToken: null,
      settings: disabledSettings,
    };
  }

  const [hour, minute] = normalizedSettings.reminder_time.split(":").map(Number);
  await scheduleDailyReminder(hour, minute);
  await updateNotificationProfile(userId, {
    mobile_settings: normalizedSettings,
    expo_push_token: expoPushToken,
  });

  return {
    granted: true,
    expoPushToken,
    settings: normalizedSettings,
  };
}

export async function disablePushNotifications(
  userId: string,
  settings: MobileSettings,
): Promise<MobileSettings> {
  const disabledSettings = {
    ...normalizeMobileSettings(settings),
    push_enabled: false,
  };
  await cancelAllReminders();
  await updateNotificationProfile(userId, {
    mobile_settings: disabledSettings,
    expo_push_token: null,
  });
  return disabledSettings;
}

export async function saveNotificationSettings(
  userId: string,
  settings: MobileSettings,
  expoPushToken: string | null = null,
): Promise<MobileSettings> {
  const normalizedSettings = normalizeMobileSettings(settings);
  if (normalizedSettings.push_enabled) {
    const [hour, minute] = normalizedSettings.reminder_time.split(":").map(Number);
    await scheduleDailyReminder(hour, minute);
  } else {
    await cancelAllReminders();
  }

  await updateNotificationProfile(userId, {
    mobile_settings: normalizedSettings,
    expo_push_token: expoPushToken,
  });
  return normalizedSettings;
}
