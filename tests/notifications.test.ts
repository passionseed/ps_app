import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MobileSettings } from "../types/onboarding";

const {
  mockGetPermissionsAsync,
  mockRequestPermissionsAsync,
  mockGetExpoPushTokenAsync,
  mockSetNotificationChannelAsync,
  mockCancelAllScheduledNotificationsAsync,
  mockScheduleNotificationAsync,
  mockSetNotificationHandler,
  mockNotifications,
  updateEqMock,
  updateMock,
  functionsInvokeMock,
} = vi.hoisted(() => {
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

  const mockNotifications = {
    AndroidImportance: { MAX: "max" },
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
  };

  return {
    mockGetPermissionsAsync,
    mockRequestPermissionsAsync,
    mockGetExpoPushTokenAsync,
    mockSetNotificationChannelAsync,
    mockCancelAllScheduledNotificationsAsync,
    mockScheduleNotificationAsync,
    mockSetNotificationHandler,
    mockNotifications,
    updateEqMock,
    updateMock,
    functionsInvokeMock,
  };
});

vi.mock("expo-notifications", () => mockNotifications);

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

import * as mod from "../lib/notifications";

describe("notification helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEqMock.mockResolvedValue({ error: null });
    functionsInvokeMock.mockResolvedValue({ data: { success: true }, error: null });
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[test]" });
    mockScheduleNotificationAsync.mockResolvedValue("schedule-1");
    mod._resetForTesting(mockNotifications as any);
  });

  it("enables notifications by persisting the token and scheduling the daily reminder", async () => {
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

  it("returns the expected path push events for enrollment and reflection milestones", () => {
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
    await mod.sendPathNotificationEvent({ type: "day_ready", dayNumber: 5 });

    expect(functionsInvokeMock).toHaveBeenCalledWith("push-notifications", {
      body: { type: "day_ready", dayNumber: 5 },
    });
  });

  it("retries on transient 503 and succeeds on second attempt", async () => {
    vi.useFakeTimers();
    mockGetExpoPushTokenAsync
      .mockRejectedValueOnce(new Error("HTTP Client Error with status code: 503"))
      .mockResolvedValueOnce({ data: "ExponentPushToken[retry]" });

    const promise = mod.enablePushNotifications("user-1", {
      push_enabled: true,
      reminder_time: "09:00",
      theme: "light",
    });
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result.granted).toBe(true);
    expect(result.expoPushToken).toBe("ExponentPushToken[retry]");
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(2);
    expect(mod.isNotificationsAvailable()).toBe(true);
    vi.useRealTimers();
  });

  it("returns null but keeps notifications available when all retries fail with transient error", async () => {
    vi.useFakeTimers();
    mockGetExpoPushTokenAsync.mockRejectedValue(
      new Error("HTTP Client Error with status code: 503"),
    );

    const promise = mod.enablePushNotifications("user-1", {
      push_enabled: true,
      reminder_time: "09:00",
      theme: "light",
    });
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result.granted).toBe(false);
    expect(result.expoPushToken).toBeNull();
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(3); // 1 + 2 retries
    expect(mod.isNotificationsAvailable()).toBe(true);
    vi.useRealTimers();
  });

  it("gracefully degrades when getExpoPushTokenAsync throws Firebase init error", async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(
      new Error("Default FirebaseApp is not initialized in this process com.passionseed.app"),
    );

    const result = await mod.enablePushNotifications("user-1", {
      push_enabled: true,
      reminder_time: "09:00",
      theme: "light",
    });

    expect(result.granted).toBe(false);
    expect(result.expoPushToken).toBeNull();
    expect(result.settings.push_enabled).toBe(false);
    expect(updateMock).toHaveBeenCalledWith({
      mobile_settings: expect.objectContaining({ push_enabled: false }),
      expo_push_token: null,
    });
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    // Non-transient error should disable notifications
    expect(mod.isNotificationsAvailable()).toBe(false);
  });

  it("returns null from scheduleDailyReminder when notifications are unavailable", async () => {
    mod._resetForTesting(null);

    const result = await mod.scheduleDailyReminder(9, 0);
    expect(result).toBeNull();
  });
});
