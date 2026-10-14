import { Platform } from "react-native";
import { supabase } from "./supabase";
import { getExpoProjectId } from "./runtime-config";
import type { MobileSettings } from "../types/onboarding";
export {
  getPathNotificationEventsForEnrollment,
  getPathNotificationEventsForReflection,
  sendPathNotificationEvent,
} from "./pathNotifications";

let Notifications: typeof import("expo-notifications") | null = null;
if (Platform.OS !== "web") {
  try {
    Notifications = require("expo-notifications");
  } catch {
    Notifications = null;
  }
}

let _notificationsAvailable = !!Notifications;

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    _notificationsAvailable = false;
  }
}

// E16: while the user has an upcoming/active SHIFT round entry, the server sends the
// evening nudge, so the legacy local daily reminder must not be scheduled.
let _legacyReminderSuppressed = false;
export function setLegacyReminderSuppressed(suppressed: boolean): void {
  _legacyReminderSuppressed = suppressed;
}
export function isLegacyReminderSuppressed(): boolean {
  return _legacyReminderSuppressed;
}

/** Check if push notifications are available on this device. */
export function isNotificationsAvailable(): boolean {
  return _notificationsAvailable;
}

/** @internal Reset module state for testing. */
export function _resetForTesting(
  notifModule: typeof import("expo-notifications") | null = null,
): void {
  Notifications = notifModule;
  _notificationsAvailable = !!notifModule;
}

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  push_enabled: true,
  reminder_time: "09:00",
  theme: "light",
};

const LEGACY_REMINDER_TITLE = "Time to grow! 🌱";
const LEGACY_REMINDER_BODY = "Continue your daily learning path.";

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

function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    return /status code: 5\d{2}/.test(msg) || /network/i.test(msg);
  }
  return false;
}

async function getExpoPushTokenWithRetry(
  maxRetries = 2,
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const token = await Notifications!.getExpoPushTokenAsync({
        projectId: getExpoProjectId(),
      });
      return token.data;
    } catch (error) {
      if (attempt < maxRetries && isTransientError(error)) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      throw error;
    }
  }
  return null;
}

/** Get push token only if permission is already granted. Does not prompt. */
export async function getExistingPushToken(): Promise<string | null> {
  if (!_notificationsAvailable || !Notifications) {
    return null;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return null;
    return await getExpoPushTokenWithRetry();
  } catch (error) {
    console.warn("[notifications] getExistingPushToken failed:", error);
    if (!isTransientError(error)) {
      _notificationsAvailable = false;
    }
    return null;
  }
}

export async function requestPushPermissions(): Promise<string | null> {
  if (!_notificationsAvailable || !Notifications) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const tokenData = await getExpoPushTokenWithRetry();
    if (!tokenData) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#BFFF00",
      });
    }

    return tokenData;
  } catch (error) {
    console.warn("[notifications] Push permissions request failed:", error);
    if (!isTransientError(error)) {
      _notificationsAvailable = false;
    }
    return null;
  }
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
  title: string = LEGACY_REMINDER_TITLE,
  body: string = LEGACY_REMINDER_BODY,
): Promise<string | null> {
  if (!_notificationsAvailable || !Notifications) {
    return null;
  }
  if (_legacyReminderSuppressed) {
    return null;
  }

  try {
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
      } as import("expo-notifications").DailyTriggerInput,
    });

    return identifier;
  } catch (error) {
    console.warn("[notifications] Schedule daily reminder failed:", error);
    _notificationsAvailable = false;
    return null;
  }
}

/**
 * Cancels only the legacy daily learning reminder (E16), leaving any other scheduled
 * notification alone. Returns how many were cancelled.
 */
export async function cancelLegacyReminder(): Promise<number> {
  if (!_notificationsAvailable || !Notifications) return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const legacy = scheduled.filter(
      (n) => n.content?.title === LEGACY_REMINDER_TITLE && n.content?.body === LEGACY_REMINDER_BODY,
    );
    await Promise.all(legacy.map((n) => Notifications!.cancelScheduledNotificationAsync(n.identifier)));
    return legacy.length;
  } catch (error) {
    console.warn("[notifications] Cancel legacy reminder failed:", error);
    return 0;
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!_notificationsAvailable || !Notifications) {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("[notifications] Cancel reminders failed:", error);
    _notificationsAvailable = false;
  }
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
