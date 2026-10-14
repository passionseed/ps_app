import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.mock("../lib/shiftStorage", () => ({
  shiftStorage: {
    getItem: async (k: string) => storage.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: async (k: string) => {
      storage.delete(k);
    },
    keys: async () => [],
  },
}));
const db = vi.hoisted(() => {
  const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
  const single = vi.fn(
    async (): Promise<{ data: { mobile_settings: Record<string, unknown> } | null; error: unknown }> => ({
      data: { mobile_settings: { reminder_time: "09:00" } },
      error: null,
    }),
  );
  return { update, single };
});
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({ update: db.update, select: () => ({ eq: () => ({ single: db.single }) }) }),
  },
}));
const notif = vi.hoisted(() => ({
  cancelAllReminders: vi.fn(async () => {}),
  cancelLegacyReminder: vi.fn(async () => 0),
  scheduleDailyReminder: vi.fn(async () => "id"),
  requestPushPermissions: vi.fn(async () => "ExponentPushToken[abc]"),
  savePushToken: vi.fn(async () => {}),
  setLegacyReminderSuppressed: vi.fn(),
}));
vi.mock("../lib/notifications", () => notif);
vi.mock("expo-notifications", () => ({ setNotificationHandler: vi.fn() }));
vi.mock("../lib/runtime-config", () => ({ getExpoProjectId: () => null }));
vi.mock("../lib/pathNotifications", () => ({
  getPathNotificationEventsForEnrollment: vi.fn(),
  getPathNotificationEventsForReflection: vi.fn(),
  sendPathNotificationEvent: vi.fn(),
}));

import {
  _resetLegacyGuardForTesting,
  acceptPushPrompt,
  retireLegacyReminder,
  declinePushPrompt,
  shouldOfferPushPrompt,
} from "../lib/round/push";

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  _resetLegacyGuardForTesting();
});

describe("push opt-in (X16)", () => {
  it("offers the prompt only after the first confirmed receipt, once, and asks the OS only on accept", async () => {
    expect(await shouldOfferPushPrompt("u1")).toBe(true);
    expect(notif.requestPushPermissions).not.toHaveBeenCalled();
    await declinePushPrompt("u1");
    expect(await shouldOfferPushPrompt("u1")).toBe(false);
    expect(notif.requestPushPermissions).not.toHaveBeenCalled();
    expect(await shouldOfferPushPrompt("")).toBe(false);
  });

  it("saves the token with savePushToken and enables push without scheduling the legacy reminder", async () => {
    expect(await acceptPushPrompt("u2")).toBe(true);
    expect(notif.requestPushPermissions).toHaveBeenCalledTimes(1);
    expect(notif.savePushToken).toHaveBeenCalledWith("u2", "ExponentPushToken[abc]");
    expect(db.update).toHaveBeenCalledWith({ mobile_settings: { reminder_time: "09:00", push_enabled: true }, shift_round_nudges: true });
    expect(await shouldOfferPushPrompt("u2")).toBe(false);
  });
});

describe("legacy local reminder (SHIFT-only app)", () => {
  it("cancels only the legacy reminder, keeps it suppressed, and runs once per launch", async () => {
    notif.cancelLegacyReminder.mockResolvedValueOnce(1);
    await retireLegacyReminder();
    expect(notif.setLegacyReminderSuppressed).toHaveBeenCalledWith(true);
    expect(notif.cancelLegacyReminder).toHaveBeenCalledTimes(1);
    expect(notif.cancelAllReminders).not.toHaveBeenCalled();
    await retireLegacyReminder();
    await retireLegacyReminder();
    expect(notif.cancelLegacyReminder).toHaveBeenCalledTimes(1);
    expect(notif.setLegacyReminderSuppressed).not.toHaveBeenCalledWith(false);
  });

  it("never reschedules the reminder", async () => {
    notif.cancelLegacyReminder.mockResolvedValueOnce(1);
    await retireLegacyReminder();
    _resetLegacyGuardForTesting(); // new process
    await retireLegacyReminder();
    expect(notif.scheduleDailyReminder).not.toHaveBeenCalled();
    expect(notif.cancelLegacyReminder).toHaveBeenCalledTimes(2);
  });

  it("scheduleDailyReminder does nothing while suppressed", async () => {
    const real = await vi.importActual<typeof import("../lib/notifications")>("../lib/notifications");
    const fake = {
      cancelAllScheduledNotificationsAsync: vi.fn(async () => {}),
      scheduleNotificationAsync: vi.fn(async () => "id-1"),
    };
    real._resetForTesting(fake as never);
    real.setLegacyReminderSuppressed(true);
    expect(await real.scheduleDailyReminder(19, 0)).toBeNull();
    expect(fake.scheduleNotificationAsync).not.toHaveBeenCalled();
    real.setLegacyReminderSuppressed(false);
    expect(await real.scheduleDailyReminder(19, 0)).toBe("id-1");
  });

  it("cancelLegacyReminder leaves other scheduled notifications alone", async () => {
    const real = await vi.importActual<typeof import("../lib/notifications")>("../lib/notifications");
    const fake = {
      getAllScheduledNotificationsAsync: vi.fn(async () => [
        { identifier: "legacy", content: { title: "Time to grow! 🌱", body: "Continue your daily learning path." } },
        { identifier: "other", content: { title: "Something else", body: "x" } },
      ]),
      cancelScheduledNotificationAsync: vi.fn(async () => {}),
      cancelAllScheduledNotificationsAsync: vi.fn(async () => {}),
    };
    real._resetForTesting(fake as never);
    expect(await real.cancelLegacyReminder()).toBe(1);
    expect(fake.cancelScheduledNotificationAsync).toHaveBeenCalledWith("legacy");
    expect(fake.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(fake.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});
