import AsyncStorage from "@react-native-async-storage/async-storage";

export type GuestLanguage = "th" | "en";

export const GUEST_LANGUAGE_STORAGE_KEY = "guest-language";

export function normalizeGuestLanguage(
  value: string | null | undefined,
): GuestLanguage {
  return value === "en" ? "en" : "th";
}

export async function readGuestLanguage(): Promise<GuestLanguage> {
  const value = await AsyncStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY);
  return normalizeGuestLanguage(value);
}

export async function saveGuestLanguage(
  language: GuestLanguage,
): Promise<void> {
  await AsyncStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, language);
}
