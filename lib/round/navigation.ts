/**
 * Root routing decision (spec 5.2, DS2, A13, A54, E14, X18). Pure and unit-tested;
 * `app/_layout.tsx` performs the side effects it returns.
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
  /** Remote flag, or last cached value; null when never readable. */
  tabEnabled: boolean | null;
  /** Server says (or cache says) the user holds an entry; null while unknown. */
  hasEntry: boolean | null;
  /** True while the SHIFT home/flags are still loading and nothing is cached. */
  shiftPending: boolean;
  /** Legacy onboarding; null while unknown. */
  onboarded: boolean | null;
};

export type NavDecision =
  | { kind: "splash" }
  | { kind: "stay" }
  | { kind: "redirect"; to: string; storePendingLink?: string; clearPendingLink?: boolean };

const HACKATHON_ROOTS = ["(hackathon)", "admin", "hackathon", "hackathon-program"];
const SIGNED_OUT_ROOTS = ["index", "sign-in", "hackathon-login", "google-auth"];
/** Retired companion screens (dead after the cutover); camp screens under /shift stay reachable. */
const COMPANION_ROUTES = ["account", "history", "link", "sign-in", "today", "update"];

export function isCompanionRoute(segments: readonly string[]): boolean {
  return segments[0] === "shift" && COMPANION_ROUTES.includes(segments[1] ?? "");
}

/** Shift tabs are shown when the flag is on or the user has an entry (A54, X18). */
export function isShiftMode(input: Pick<NavInput, "tabEnabled" | "hasEntry">): boolean {
  return input.hasEntry === true || input.tabEnabled === true;
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
    return root === "(tabs)" ? { kind: "stay" } : { kind: "redirect", to: "/(tabs)/shift" };
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

  // Signed in.
  if (isSafeNext(input.pendingLink)) {
    return { kind: "redirect", to: input.pendingLink, clearPendingLink: true };
  }
  const needsEntry =
    !root || ["index", "welcome", "onboarding", "sign-in"].includes(root) || isCompanionRoute(input.segments);
  if (!needsEntry) return { kind: "stay" };

  const shift = isShiftMode(input);
  if (shift) return { kind: "redirect", to: "/(tabs)/shift" };
  // Flags and entry unknown and still loading: wait instead of guessing (X5: unknown != not enrolled).
  if (input.shiftPending) return { kind: "splash" };
  if (input.onboarded === null) return { kind: "splash" };
  if (input.onboarded) return { kind: "redirect", to: "/(tabs)/discover" };
  return root === "onboarding" ? { kind: "stay" } : { kind: "redirect", to: "/onboarding" };
}

/** Deep links (5.2) and push `data.url` (4.4) to an in-app path. */
export function linkToPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/^[a-z][a-z0-9+.-]*:\/\/(.*)$/i);
  const rest = (match ? match[1] : url).replace(/^\/+/, "");
  if (!rest.startsWith("round")) return null;
  const [pathPart, query] = rest.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  if (parts.length === 1) return "/(tabs)/shift";
  const [, screen, id] = parts;
  if (screen === "squad") return "/(tabs)/squad";
  if (screen === "evidence" && id) return `/round/evidence/${id}`;
  if (screen === "join") return query ? `/round/join?${query}` : "/round/join";
  if (["certificate", "summary", "log", "checkin"].includes(screen ?? "")) return `/round/${screen}`;
  return "/(tabs)/shift";
}
