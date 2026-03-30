import type { GuestLanguage } from "./guest-language";

type ResolveAppLanguageArgs = {
  guestLanguage: GuestLanguage;
  profileLanguage: GuestLanguage | null;
  hasSession: boolean;
  isGuest: boolean;
};

export function resolveAppLanguage({
  guestLanguage,
  profileLanguage,
  hasSession,
  isGuest,
}: ResolveAppLanguageArgs): GuestLanguage {
  if (isGuest || !hasSession) {
    return guestLanguage;
  }

  return profileLanguage ?? guestLanguage;
}
