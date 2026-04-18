// Web stub for expo-notifications - no-op on web
export type NotificationTriggerInput = {
  type: "daily" | "timeInterval" | "date";
  hour?: number;
  minute?: number;
  seconds?: number;
  date?: Date;
};

export enum AndroidImportance {
  MIN = 1,
  LOW = 2,
  DEFAULT = 3,
  HIGH = 4,
  MAX = 5,
}

// No-op functions for web
export async function getPermissionsAsync(): Promise<{ status: string }> {
  return { status: "denied" };
}

export async function requestPermissionsAsync(): Promise<{ status: string }> {
  return { status: "denied" };
}

export async function getExpoPushTokenAsync(): Promise<{ data: string }> {
  throw new Error("Push notifications not available on web");
}

export async function setNotificationChannelAsync(): Promise<void> {
  // No-op on web
}

export async function scheduleNotificationAsync(): Promise<string> {
  throw new Error("Scheduled notifications not available on web");
}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  // No-op on web
}

export function setNotificationHandler(): void {
  // No-op on web
}
