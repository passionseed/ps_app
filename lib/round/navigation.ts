/**
 * Root routing decision (spec 5.2, E14; scale spec D1: the app is SHIFT). Pure and unit-tested;
 * `app/_layout.tsx` performs the side effects it returns.
 *
 * Every signed-in non-hackathon user goes to Home (`/(tabs)/shift`): no PathLab onboarding, no
 * Discover. Guests land on Home too. Hidden tabs (PathLab, Build, the old camp tabs) and retired
 * companion screens redirect to Home; their files stay.
 */

export type NavInput = {
  loading: boolean;
  isHackathon: boolean;
  isGuest: boolean;
  signedIn: boolean;
  /** Auth emitted SIGNED_OUT (not an explicit sign-out) while this device still has drafts. */
  sessionExpired: boolean;
  segments: readonly string[];
  /** Current path including query, e.g. "/round/evidence/abc". */
  currentPath: string;
  pendingLink: string | null;
};

export type NavDecision =
  | { kind: "splash" }
  | { kind: "stay" }
  | { kind: "redirect"; to: string; storePendingLink?: string; clearPendingLink?: boolean };

export const HOME_ROUTE = "/(tabs)/shift";

const HACKATHON_ROOTS = ["(hackathon)", "admin", "hackathon", "hackathon-program"];
const SIGNED_OUT_ROOTS = ["index", "sign-in", "hackathon-login", "google-auth"];
/** Retired companion screens (dead after the cutover); camp screens under /shift stay reachable. */
const COMPANION_ROUTES = ["account", "history", "link", "sign-in", "today", "update"];
/** Tabs hidden by D1: PathLab (discover, explore, my-paths), Build and the old camp tabs. */
export const HIDDEN_TABS = ["discover", "explore", "my-paths", "build", "today", "projects", "group"] as const;
/** Root routes that only ever forward somewhere (landing, legacy onboarding, sign-in). */
const ENTRY_ROOTS = ["index", "welcome", "onboarding", "sign-in"];

export function isCompanionRoute(segments: readonly string[]): boolean {
  return segments[0] === "shift" && COMPANION_ROUTES.includes(segments[1] ?? "");
}

export function isHiddenTab(segments: readonly string[]): boolean {
  return segments[0] === "(tabs)" && (HIDDEN_TABS as readonly string[]).includes(segments[1] ?? "");
}

export function signInHref(next: string | null, reason?: "expired"): string {
  const params: string[] = [];
  if (reason) params.push(`reason=${reason}`);
  if (next) params.push(`next=${encodeURIComponent(next)}`);
  return params.length ? `/sign-in?${params.join("&")}` : "/sign-in";
}

/** Only in-app round links may be stored and replayed (no open redirects). */
export function isSafeNext(next: string | null | undefined): next is string {
  return !!next && /^\/round(\/[A-Za-z0-9\-_/]*)?(\?[A-Za-z0-9=&%\-_.]*)?$/.test(next);
}

export function decideRoute(input: NavInput): NavDecision {
  if (input.loading) return { kind: "splash" };
  const root = input.segments[0] ?? "";

  if (input.isHackathon) {
    return HACKATHON_ROOTS.includes(root) ? { kind: "stay" } : { kind: "redirect", to: "/(hackathon)/home" };
  }

  if (input.isGuest) {
    return root === "(tabs)" && !isHiddenTab(input.segments) ? { kind: "stay" } : { kind: "redirect", to: HOME_ROUTE };
  }

  if (!input.signedIn) {
    if (root === "sign-in" || root === "google-auth") return { kind: "stay" };
    if (input.sessionExpired) {
      const next = isSafeNext(input.currentPath) ? input.currentPath : null;
      return { kind: "redirect", to: signInHref(next, "expired"), storePendingLink: next ?? undefined };
    }
    if (root === "round") {
      const next = isSafeNext(input.currentPath) ? input.currentPath : "/round";
      return { kind: "redirect", to: signInHref(next), storePendingLink: next };
    }
    if (!root || SIGNED_OUT_ROOTS.includes(root)) return { kind: "stay" };
    return { kind: "redirect", to: "/" };
  }

  // Signed in: the app is SHIFT (D1). No waiting on flags or the home bundle: Home itself
  // handles flag-off and missing RPCs with the built-in landing (D10).
  if (isSafeNext(input.pendingLink)) {
    return { kind: "redirect", to: input.pendingLink, clearPendingLink: true };
  }
  const toHome =
    !root || ENTRY_ROOTS.includes(root) || isCompanionRoute(input.segments) || isHiddenTab(input.segments);
  return toHome ? { kind: "redirect", to: HOME_ROUTE } : { kind: "stay" };
}

/** Deep links (5.2) and push `data.url` (4.4) to an in-app path. */
export function linkToPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/^[a-z][a-z0-9+.-]*:\/\/(.*)$/i);
  const rest = (match ? match[1] : url).replace(/^\/+/, "");
  if (!rest.startsWith("round")) return null;
  const [pathPart, query] = rest.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  if (parts.length === 1) return HOME_ROUTE;
  const [, screen, id] = parts;
  if (screen === "squad") return "/(tabs)/squad";
  if (screen === "evidence" && id) return `/round/evidence/${id}`;
  if (screen === "day" && id && /^\d{1,2}$/.test(id)) return `/round/day/${id}`;
  if (screen === "join") return query ? `/round/join?${query}` : "/round/join";
  if (["certificate", "summary", "log", "checkin", "steps", "guide"].includes(screen ?? "")) return `/round/${screen}`;
  return HOME_ROUTE;
}

/**
 * `usePathname()` drops the query string, so deep links like `/round/join?r=<id>` would lose
 * the round. Rebuilds the current path from the pathname plus `useGlobalSearchParams()`,
 * skipping params that are dynamic route segments (already part of the pathname).
 */
export function currentPathWithQuery(
  pathname: string,
  segments: readonly string[],
  params: Record<string, string | string[] | undefined>,
): string {
  const dynamic = new Set(
    segments
      .map((s) => s.match(/^\[(?:\.\.\.)?([^\]]+)\]$/)?.[1])
      .filter((s): s is string => !!s),
  );
  const query: string[] = [];
  for (const key of Object.keys(params)) {
    if (dynamic.has(key)) continue;
    const value = params[key];
    const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
    for (const v of values) query.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return query.length ? `${pathname}?${query.join("&")}` : pathname;
}
