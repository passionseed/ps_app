import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStringMock, setMock } = vi.hoisted(() => ({
  getStringMock: vi.fn(),
  setMock: vi.fn(),
}));

vi.mock("../lib/storage", () => ({
  storage: {
    getString: getStringMock,
    set: setMock,
    delete: vi.fn(),
    getBoolean: vi.fn(),
  },
  hasMigratedFromAsyncStorage: true,
  migrateFromAsyncStorage: vi.fn(),
}));

import {
  GUEST_LANGUAGE_STORAGE_KEY,
  normalizeGuestLanguage,
  readGuestLanguage,
  saveGuestLanguage,
} from "../lib/guest-language";

describe("guest language storage", () => {
  beforeEach(() => {
    getStringMock.mockReset();
    setMock.mockReset();
  });

  it("normalizes unknown values to thai", () => {
    expect(normalizeGuestLanguage("en")).toBe("en");
    expect(normalizeGuestLanguage("th")).toBe("th");
    expect(normalizeGuestLanguage("jp")).toBe("th");
    expect(normalizeGuestLanguage(null)).toBe("th");
  });

  it("reads the persisted guest language", () => {
    getStringMock.mockReturnValue("en");

    expect(readGuestLanguage()).toBe("en");
    expect(getStringMock).toHaveBeenCalledWith(GUEST_LANGUAGE_STORAGE_KEY);
  });

  it("falls back to thai when storage is empty", () => {
    getStringMock.mockReturnValue(undefined);

    expect(readGuestLanguage()).toBe("th");
  });

  it("persists the selected guest language", () => {
    saveGuestLanguage("en");

    expect(setMock).toHaveBeenCalledWith(GUEST_LANGUAGE_STORAGE_KEY, "en");
  });
});
