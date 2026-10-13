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
  const single = vi.fn(async () => ({ data: { mobile_settings: { reminder_time: "09:00" } }, error: null }));
  return { update, single };
});
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({ update: db.update, select: () => ({ eq: () => ({ single: db.single }) }) }),
  },
}));
const notif = vi.hoisted(() => ({
  cancelAllReminders: vi.fn(async () => {}),
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

import { acceptPushPrompt, applyLegacyReminderGuard, declinePushPrompt, shouldOfferPushPrompt } from "../lib/round/push";

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
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

describe("legacy local reminder (E16)", () => {
  it("is cancelled and suppressed while the user has an upcoming/active entry", async () => {
    await applyLegacyReminderGuard(true);
    expect(notif.setLegacyReminderSuppressed).toHaveBeenCalledWith(true);
    expect(notif.cancelAllReminders).toHaveBeenCalledTimes(1);
    await applyLegacyReminderGuard(false);
    expect(notif.setLegacyReminderSuppressed).toHaveBeenLastCalledWith(false);
    expect(notif.cancelAllReminders).toHaveBeenCalledTimes(1);
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
});
