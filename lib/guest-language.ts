import { storage } from "./storage";

export type GuestLanguage = "th" | "en";

export const GUEST_LANGUAGE_STORAGE_KEY = "guest-language";

export function normalizeGuestLanguage(
  value: string | null | undefined,
): GuestLanguage {
  return value === "en" ? "en" : "th";
}

export function readGuestLanguage(): GuestLanguage {
  const value = storage.getString(GUEST_LANGUAGE_STORAGE_KEY) ?? null;
  return normalizeGuestLanguage(value);
}

export function saveGuestLanguage(language: GuestLanguage): void {
  storage.set(GUEST_LANGUAGE_STORAGE_KEY, language);
}
