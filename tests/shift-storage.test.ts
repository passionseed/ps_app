import { afterEach, describe, expect, it, vi } from "vitest";
import { shiftStorage } from "../lib/shiftStorage";

afterEach(() => vi.unstubAllGlobals());

describe("SHIFT local storage", () => {
  it("uses the app's existing localStorage for cohort selection and drafts", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    expect(await shiftStorage.getItem("cohort")).toBeNull();
    await shiftStorage.setItem("cohort", "camp-a");
    expect(await shiftStorage.getItem("cohort")).toBe("camp-a");
    await shiftStorage.removeItem("cohort");
    expect(await shiftStorage.getItem("cohort")).toBeNull();
  });

  it("rejects storage failures so draft recovery can show a useful error", async () => {
    vi.stubGlobal("localStorage", {
      setItem: () => { throw new Error("Storage unavailable"); },
    });
    await expect(shiftStorage.setItem("draft", "{}")).rejects.toThrow("Storage unavailable");
  });
});
