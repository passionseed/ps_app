import { describe, expect, it } from "vitest";
import { resolveAppLanguage } from "../lib/app-language";

describe("resolveAppLanguage", () => {
  it("uses the guest language when there is no session", () => {
    expect(
      resolveAppLanguage({
        guestLanguage: "en",
        profileLanguage: "th",
        hasSession: false,
        isGuest: false,
      }),
    ).toBe("en");
  });

  it("uses the guest language in guest mode even if a profile language exists", () => {
    expect(
      resolveAppLanguage({
        guestLanguage: "en",
        profileLanguage: "th",
        hasSession: true,
        isGuest: true,
      }),
    ).toBe("en");
  });

  it("uses the stored profile language for authenticated users", () => {
    expect(
      resolveAppLanguage({
        guestLanguage: "th",
        profileLanguage: "en",
        hasSession: true,
        isGuest: false,
      }),
    ).toBe("en");
  });

  it("falls back to the guest language when profile language has not loaded yet", () => {
    expect(
      resolveAppLanguage({
        guestLanguage: "th",
        profileLanguage: null,
        hasSession: true,
        isGuest: false,
      }),
    ).toBe("th");
  });
});
