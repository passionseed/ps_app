import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeOnboarding } from "../lib/onboarding";
import type { MobileSettings } from "../types/onboarding";

const mocks = vi.hoisted(() => ({
  profileError: null as Error | null,
  stateError: null as Error | null,
  from: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: { from: mocks.from },
}));

const settings: MobileSettings = {
  push_enabled: false,
  reminder_time: "09:00",
  theme: "light",
};

beforeEach(() => {
  mocks.profileError = null;
  mocks.stateError = null;
  mocks.from.mockReset();
  mocks.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ error: mocks.profileError }),
            }),
          }),
        }),
      };
    }
    return {
      delete: () => ({
        eq: async () => ({ error: mocks.stateError }),
      }),
    };
  });
});

describe("onboarding completion", () => {
  it("updates the profile before removing the saved onboarding state", async () => {
    await completeOnboarding("user-a", settings);
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "profiles",
      "onboarding_state",
    ]);
  });

  it("preserves saved progress when the profile update fails", async () => {
    mocks.profileError = new Error("Profile update failed");
    await expect(completeOnboarding("user-a", settings)).rejects.toThrow("Profile update failed");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("reports failures removing the saved state", async () => {
    mocks.stateError = new Error("State removal failed");
    await expect(completeOnboarding("user-a", settings)).rejects.toThrow("State removal failed");
  });
});
