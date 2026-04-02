export const HACKATHON_LOGIN_ROUTE = "/hackathon-login";
export const HACKATHON_PROGRAM_ROUTE = "/hackathon-program";
export const PROFILE_HACKATHON_HERO_ROUTE = HACKATHON_LOGIN_ROUTE;

export function isAllowedOnboardedAppSegment(
  segment: string | undefined,
): boolean {
  return segment === "(tabs)" || segment === "hackathon-login";
}
