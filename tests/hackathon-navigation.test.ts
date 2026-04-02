import { describe, expect, it } from "vitest";

import {
  HACKATHON_LOGIN_ROUTE,
  PROFILE_HACKATHON_HERO_ROUTE,
  isAllowedOnboardedAppSegment,
} from "../lib/hackathonNavigation";

describe("hackathon navigation", () => {
  it("sends the profile hackathon hero to the hackathon login route", () => {
    expect(PROFILE_HACKATHON_HERO_ROUTE).toBe(HACKATHON_LOGIN_ROUTE);
  });

  it("lets onboarded app users stay on the hackathon login screen", () => {
    expect(isAllowedOnboardedAppSegment("hackathon-login")).toBe(true);
  });

  it("keeps the allowed onboarded app segments narrow", () => {
    expect(isAllowedOnboardedAppSegment("(tabs)")).toBe(true);
    expect(isAllowedOnboardedAppSegment("pathlab-activity")).toBe(true);
    expect(isAllowedOnboardedAppSegment("hackathon-program")).toBe(false);
    expect(isAllowedOnboardedAppSegment(undefined)).toBe(false);
  });
});
