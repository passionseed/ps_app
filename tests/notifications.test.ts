import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MobileSettings } from "../types/onboarding";
import type { PathReflectionDecision } from "../types/pathlab";

const mockGetPermissionsAsync = vi.fn();
const mockRequestPermissionsAsync = vi.fn();
const mockGetExpoPushTokenAsync = vi.fn();
const mockSetNotificationChannelAsync = vi.fn();
const mockCancelAllScheduledNotificationsAsync = vi.fn();
const mockScheduleNotificationAsync = vi.fn();
const mockSetNotificationHandler = vi.fn();

const updateEqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const functionsInvokeMock = vi.fn();

vi.mock("expo-notifications", () => ({
  AndroidImportance: {
    MAX: "max",
  },
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  setNotificationHandler: mockSetNotificationHandler,
  addNotificationReceivedListener: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(),
  removeNotificationSubscription: vi.fn(),
  dismissNotificationAsync: vi.fn(),
  getPresentedNotificationsAsync: vi.fn(),
  setNotificationCategoryAsync: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

vi.mock("../lib/runtime-config", () => ({
  getExpoProjectId: () => "project-id",
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: updateMock,
    })),
    functions: {
      invoke: functionsInvokeMock,
    },
  },
}));

async function loadNotificationsModule() {
  vi.resetModules();
  return import("../lib/notifications");
}

describe("notification helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEqMock.mockResolvedValue({ error: null });
    functionsInvokeMock.mockResolvedValue({ data: { success: true }, error: null });
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[test]" });
    mockScheduleNotificationAsync.mockResolvedValue("schedule-1");
  });

  it("enables notifications by persisting the token and scheduling the daily reminder", async () => {
    const mod = await loadNotificationsModule();
    const settings: MobileSettings = {
      push_enabled: true,
      reminder_time: "18:30",
      theme: "light",
    };

    const result = await mod.enablePushNotifications("user-1", settings);

    expect(result).toEqual({
      granted: true,
      expoPushToken: "ExponentPushToken[test]",
      settings,
    });
    expect(updateMock).toHaveBeenCalledWith({
      mobile_settings: settings,
      expo_push_token: "ExponentPushToken[test]",
    });
    expect(updateEqMock).toHaveBeenCalledWith("id", "user-1");
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Time to grow! 🌱",
        body: "Continue your daily learning path.",
        sound: true,
      },
      trigger: {
        type: "daily",
        hour: 18,
        minute: 30,
      },
    });
  });

  it("falls back to push disabled when permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "denied" });
    const mod = await loadNotificationsModule();

    const result = await mod.enablePushNotifications("user-1", {
      push_enabled: true,
      reminder_time: "09:00",
      theme: "dark",
    });

    expect(result).toEqual({
      granted: false,
      expoPushToken: null,
      settings: {
        push_enabled: false,
        reminder_time: "09:00",
        theme: "dark",
      },
    });
    expect(updateMock).toHaveBeenCalledWith({
      mobile_settings: {
        push_enabled: false,
        reminder_time: "09:00",
        theme: "dark",
      },
      expo_push_token: null,
    });
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("disables notifications by clearing the token and canceling reminders", async () => {
    const mod = await loadNotificationsModule();

    const result = await mod.disablePushNotifications("user-1", {
      push_enabled: true,
      reminder_time: "07:00",
      theme: "light",
    });

    expect(result).toEqual({
      push_enabled: false,
      reminder_time: "07:00",
      theme: "light",
    });
    expect(updateMock).toHaveBeenCalledWith({
      mobile_settings: {
        push_enabled: false,
        reminder_time: "07:00",
        theme: "light",
      },
      expo_push_token: null,
    });
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it("returns the expected path push events for enrollment and reflection milestones", async () => {
    const mod = await loadNotificationsModule();

    expect(mod.getPathNotificationEventsForEnrollment()).toEqual([
      { type: "day_ready", dayNumber: 1 },
    ]);

    expect(
      mod.getPathNotificationEventsForReflection({
        completedDayNumber: 2,
        decision: "continue_tomorrow",
      }),
    ).toEqual([{ type: "day_ready", dayNumber: 3 }]);

    expect(
      mod.getPathNotificationEventsForReflection({
        completedDayNumber: 3,
        decision: "pause",
      }),
    ).toEqual([
      { type: "day_ready", dayNumber: 4 },
      { type: "streak_milestone", streakDays: 3 },
    ]);

    expect(
      mod.getPathNotificationEventsForReflection({
        completedDayNumber: 7,
        decision: "continue_now",
      }),
    ).toEqual([{ type: "streak_milestone", streakDays: 7 }]);
  });

  it("invokes the push-notifications edge function for a path event", async () => {
    const mod = await loadNotificationsModule();

    await mod.sendPathNotificationEvent({ type: "day_ready", dayNumber: 5 });

    expect(functionsInvokeMock).toHaveBeenCalledWith("push-notifications", {
      body: { type: "day_ready", dayNumber: 5 },
    });
  });

  it("gracefully degrades when getExpoPushTokenAsync throws Firebase init error", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetExpoPushTokenAsync.mockRejectedValue(
      new Error("Default FirebaseApp is not initialized in this process com.passionseed.app")
    );
    const mod = await loadNotificationsModule();

    const result = await mod.enablePushNotifications("user-1", {
      push_enabled: true,
      reminder_time: "09:00",
      theme: "light",
    });

    // Should degrade gracefully — no crash, push disabled
    expect(result.granted).toBe(false);
    expect(result.expoPushToken).toBeNull();
    expect(result.settings.push_enabled).toBe(false);
    expect(updateMock).toHaveBeenCalledWith({
      mobile_settings: expect.objectContaining({ push_enabled: false }),
      expo_push_token: null,
    });
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("returns null from scheduleDailyReminder when notifications are unavailable", async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(
      new Error("Default FirebaseApp is not initialized in this process com.passionseed.app")
    );
    const mod = await loadNotificationsModule();

    // First call triggers the Firebase error, marking notifications unavailable
    await mod.requestPushPermissions();

    // Now scheduleDailyReminder should return null without throwing
    const result = await mod.scheduleDailyReminder(9, 0);
    expect(result).toBeNull();
  });
});
