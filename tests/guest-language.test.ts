import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/asyncStorage", () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

import {
  GUEST_LANGUAGE_STORAGE_KEY,
  normalizeGuestLanguage,
  readGuestLanguage,
  saveGuestLanguage,
} from "../lib/guest-language";
import * as asyncStorage from "../lib/asyncStorage";

const getItem = vi.mocked(asyncStorage.getItem);
const setItem = vi.mocked(asyncStorage.setItem);

describe("guest language storage", () => {
  beforeEach(() => {
    getItem.mockReset();
    setItem.mockReset();
  });

  it("normalizes unknown values to thai", () => {
    expect(normalizeGuestLanguage("en")).toBe("en");
    expect(normalizeGuestLanguage("th")).toBe("th");
    expect(normalizeGuestLanguage("jp")).toBe("th");
    expect(normalizeGuestLanguage(null)).toBe("th");
  });

  it("reads the persisted guest language", async () => {
    getItem.mockResolvedValue("en");

    await expect(readGuestLanguage()).resolves.toBe("en");
    expect(getItem).toHaveBeenCalledWith(GUEST_LANGUAGE_STORAGE_KEY);
  });

  it("falls back to thai when storage is empty", async () => {
    getItem.mockResolvedValue(null);

    await expect(readGuestLanguage()).resolves.toBe("th");
  });

  it("persists the selected guest language", async () => {
    await saveGuestLanguage("en");

    expect(setItem).toHaveBeenCalledWith(GUEST_LANGUAGE_STORAGE_KEY, "en");
  });
});
