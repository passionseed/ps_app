import { describe, expect, it } from "vitest";
import { currentPathWithQuery, decideRoute, HIDDEN_TABS, isHiddenTab, isSafeNext, linkToPath, type NavInput } from "../lib/round/navigation";

const base: NavInput = {
  loading: false,
  isHackathon: false,
  isGuest: false,
  signedIn: true,
  sessionExpired: false,
  segments: [],
  currentPath: "/",
  pendingLink: null,
};
const nav = (over: Partial<NavInput>) => decideRoute({ ...base, ...over });
const HOME = { kind: "redirect", to: "/(tabs)/shift" };

describe("decideRoute matrix (5.2, scale spec D1)", () => {
  it("shows the splash while loading", () => {
    expect(nav({ loading: true })).toEqual({ kind: "splash" });
  });

  it("keeps hackathon mode in its area (hackathon flows untouched)", () => {
    expect(nav({ isHackathon: true, segments: ["(tabs)", "shift"] })).toEqual({ kind: "redirect", to: "/(hackathon)/home" });
    expect(nav({ isHackathon: true, segments: ["(hackathon)", "home"] })).toEqual({ kind: "stay" });
    expect(nav({ isHackathon: true, segments: ["hackathon-program", "index"] })).toEqual({ kind: "stay" });
  });

  it("lands guests on Home and keeps them off hidden tabs", () => {
    expect(nav({ isGuest: true, signedIn: false, segments: ["index"] })).toEqual(HOME);
    expect(nav({ isGuest: true, signedIn: false, segments: ["(tabs)", "shift"] })).toEqual({ kind: "stay" });
    expect(nav({ isGuest: true, signedIn: false, segments: ["(tabs)", "profile"] })).toEqual({ kind: "stay" });
    expect(nav({ isGuest: true, signedIn: false, segments: ["(tabs)", "discover"] })).toEqual(HOME);
    expect(nav({ isGuest: true, signedIn: false, segments: ["seed", "[id]"] })).toEqual(HOME);
  });

  it("stores a round deep link and asks a signed-out user to sign in", () => {
    const d = nav({ signedIn: false, segments: ["round", "evidence", "[id]"], currentPath: "/round/evidence/abc" });
    expect(d).toEqual({ kind: "redirect", to: "/sign-in?next=%2Fround%2Fevidence%2Fabc", storePendingLink: "/round/evidence/abc" });
  });

  it("keeps the landing for signed-out users at the root and sends other routes there", () => {
    expect(nav({ signedIn: false, segments: [] })).toEqual({ kind: "stay" });
    expect(nav({ signedIn: false, segments: ["index"] })).toEqual({ kind: "stay" });
    expect(nav({ signedIn: false, segments: ["(tabs)", "shift"] })).toEqual({ kind: "redirect", to: "/" });
    expect(nav({ signedIn: false, segments: ["sign-in"] })).toEqual({ kind: "stay" });
  });

  it("sends an expired session to sign-in with reason=expired and keeps drafts (E14)", () => {
    const d = nav({ signedIn: false, sessionExpired: true, segments: ["round", "capture"], currentPath: "/round/capture" });
    expect(d).toMatchObject({ kind: "redirect", to: "/sign-in?reason=expired&next=%2Fround%2Fcapture" });
    expect(nav({ signedIn: false, sessionExpired: true, segments: ["(tabs)", "shift"], currentPath: "/shift" })).toMatchObject({
      to: "/sign-in?reason=expired",
    });
  });

  it("opens a pending link after sign-in and clears it", () => {
    expect(nav({ segments: ["sign-in"], pendingLink: "/round/certificate" })).toEqual({
      kind: "redirect",
      to: "/round/certificate",
      clearPendingLink: true,
    });
  });

  it("sends every signed-in user to Home: no onboarding, no Discover, no waiting on flags", () => {
    expect(nav({ segments: [] })).toEqual(HOME);
    expect(nav({ segments: ["index"] })).toEqual(HOME);
    expect(nav({ segments: ["welcome"] })).toEqual(HOME);
    expect(nav({ segments: ["onboarding"] })).toEqual(HOME);
    expect(nav({ segments: ["sign-in"] })).toEqual(HOME);
    expect(nav({ segments: ["(tabs)", "shift"] })).toEqual({ kind: "stay" });
    expect(nav({ segments: ["(tabs)", "squad"] })).toEqual({ kind: "stay" });
    expect(nav({ segments: ["(tabs)", "profile"] })).toEqual({ kind: "stay" });
    expect(nav({ segments: ["round", "steps"] })).toEqual({ kind: "stay" });
  });

  it("redirects old deep links to hidden tabs to Home", () => {
    for (const tab of HIDDEN_TABS) {
      expect(isHiddenTab(["(tabs)", tab]), tab).toBe(true);
      expect(nav({ segments: ["(tabs)", tab] }), tab).toEqual(HOME);
    }
    expect(isHiddenTab(["(tabs)", "shift"])).toBe(false);
    expect(isHiddenTab(["discover"])).toBe(false);
  });

  it("keeps account deletion reachable for signed-in users and behind sign-in otherwise", () => {
    expect(nav({ segments: ["delete-account"] })).toEqual({ kind: "stay" });
    expect(nav({ signedIn: false, segments: ["delete-account"] })).toEqual({ kind: "redirect", to: "/" });
  });

  it("keeps PathLab detail routes reachable by deep link (no entry points, files stay)", () => {
    expect(nav({ segments: ["seed", "[id]"] })).toEqual({ kind: "stay" });
    expect(nav({ segments: ["path", "[enrollmentId]"] })).toEqual({ kind: "stay" });
  });

  it("retires companion screens", () => {
    expect(nav({ segments: ["shift", "today"] })).toEqual(HOME);
    expect(nav({ segments: ["shift", "project"] })).toEqual({ kind: "stay" });
  });
});

describe("links", () => {
  it("accepts only in-app round paths as next", () => {
    expect(isSafeNext("/round/evidence/abc-123")).toBe(true);
    expect(isSafeNext("/round/join?r=11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isSafeNext("https://evil.example")).toBe(false);
    expect(isSafeNext("//evil.example")).toBe(false);
  });

  it("maps deep links and push data.url to screens (Appendix C)", () => {
    expect(linkToPath("passion-seed://round/evidence/abc")).toBe("/round/evidence/abc");
    expect(linkToPath("passion-seed-dev://round/certificate")).toBe("/round/certificate");
    expect(linkToPath("passion-seed://round/summary")).toBe("/round/summary");
    expect(linkToPath("passion-seed://round/squad")).toBe("/(tabs)/squad");
    expect(linkToPath("passion-seed://round")).toBe("/(tabs)/shift");
    expect(linkToPath("passion-seed://round/join?r=abc")).toBe("/round/join?r=abc");
    expect(linkToPath("passion-seed://hackathon/home")).toBeNull();
  });

  it("maps the session reminder and the new screens", () => {
    expect(linkToPath("passionseed://round")).toBe("/(tabs)/shift");
    expect(linkToPath("passion-seed://round/steps")).toBe("/round/steps");
    expect(linkToPath("passion-seed://round/guide")).toBe("/round/guide");
    expect(linkToPath("passion-seed://round/day/3")).toBe("/round/day/3");
    expect(linkToPath("passion-seed://round/day/x")).toBe("/(tabs)/shift");
  });
});

describe("current path keeps the query (deep links)", () => {
  const R = "11111111-1111-4111-8111-111111111111";

  it("adds search params to the pathname", () => {
    expect(currentPathWithQuery("/round/join", ["round", "join"], { r: R })).toBe(`/round/join?r=${R}`);
    expect(currentPathWithQuery("/round/log", ["round", "log"], {})).toBe("/round/log");
    expect(currentPathWithQuery("/round/x", ["round", "x"], { a: ["1", "2"], b: undefined })).toBe("/round/x?a=1&a=2");
  });

  it("skips dynamic route params already in the pathname", () => {
    expect(currentPathWithQuery("/round/evidence/abc", ["round", "evidence", "[id]"], { id: "abc" })).toBe("/round/evidence/abc");
    expect(currentPathWithQuery("/round/evidence/abc", ["round", "evidence", "[id]"], { id: "abc", from: "push" })).toBe(
      "/round/evidence/abc?from=push",
    );
  });

  it("a signed-out join link keeps the round through sign-in", () => {
    const currentPath = currentPathWithQuery("/round/join", ["round", "join"], { r: R });
    expect(isSafeNext(currentPath)).toBe(true);
    const d = nav({ signedIn: false, segments: ["round", "join"], currentPath });
    expect(d).toEqual({
      kind: "redirect",
      to: `/sign-in?next=${encodeURIComponent(`/round/join?r=${R}`)}`,
      storePendingLink: `/round/join?r=${R}`,
    });
    expect(nav({ pendingLink: `/round/join?r=${R}` })).toEqual({ kind: "redirect", to: `/round/join?r=${R}`, clearPendingLink: true });
  });
});
