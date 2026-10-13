import { describe, expect, it } from "vitest";
import { currentPathWithQuery, decideRoute, isSafeNext, isShiftMode, linkToPath, type NavInput } from "../lib/round/navigation";

const base: NavInput = {
  loading: false,
  isHackathon: false,
  isGuest: false,
  signedIn: true,
  sessionExpired: false,
  segments: [],
  currentPath: "/",
  pendingLink: null,
  tabEnabled: false,
  hasEntry: false,
  shiftPending: false,
  onboarded: true,
};
const nav = (over: Partial<NavInput>) => decideRoute({ ...base, ...over });

describe("decideRoute matrix (5.2)", () => {
  it("shows the splash while loading", () => {
    expect(nav({ loading: true })).toEqual({ kind: "splash" });
  });

  it("keeps hackathon mode in its area", () => {
    expect(nav({ isHackathon: true, segments: ["(tabs)", "shift"] })).toEqual({ kind: "redirect", to: "/(hackathon)/home" });
    expect(nav({ isHackathon: true, segments: ["(hackathon)", "home"] })).toEqual({ kind: "stay" });
  });

  it("sends guests to the Shift teaser", () => {
    expect(nav({ isGuest: true, signedIn: false, segments: ["index"] })).toEqual({ kind: "redirect", to: "/(tabs)/shift" });
    expect(nav({ isGuest: true, signedIn: false, segments: ["(tabs)", "discover"] })).toEqual({ kind: "stay" });
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

  it("uses SHIFT tabs when the flag is on or the user has an entry", () => {
    expect(nav({ segments: ["index"], tabEnabled: true })).toEqual({ kind: "redirect", to: "/(tabs)/shift" });
    expect(nav({ segments: ["index"], tabEnabled: false, hasEntry: true })).toEqual({ kind: "redirect", to: "/(tabs)/shift" });
    expect(nav({ segments: ["onboarding"], tabEnabled: true, onboarded: false })).toEqual({ kind: "redirect", to: "/(tabs)/shift" });
    expect(nav({ segments: ["(tabs)", "profile"], tabEnabled: true })).toEqual({ kind: "stay" });
  });

  it("keeps legacy routing when the flag is off and there is no entry", () => {
    expect(nav({ segments: ["index"] })).toEqual({ kind: "redirect", to: "/(tabs)/discover" });
    expect(nav({ segments: ["index"], onboarded: false })).toEqual({ kind: "redirect", to: "/onboarding" });
    expect(nav({ segments: ["onboarding"], onboarded: false })).toEqual({ kind: "stay" });
  });

  it("uses cached flags when app_config is unreadable; an entry always keeps SHIFT tabs (X18)", () => {
    expect(isShiftMode({ tabEnabled: null, hasEntry: true })).toBe(true);
    expect(isShiftMode({ tabEnabled: true, hasEntry: null })).toBe(true);
    expect(isShiftMode({ tabEnabled: null, hasEntry: null })).toBe(false);
    expect(nav({ segments: ["index"], tabEnabled: null, hasEntry: null, shiftPending: true })).toEqual({ kind: "splash" });
    expect(nav({ segments: ["index"], tabEnabled: null, hasEntry: null, shiftPending: false })).toEqual({ kind: "redirect", to: "/(tabs)/discover" });
  });

  it("retires companion screens", () => {
    expect(nav({ segments: ["shift", "today"], hasEntry: true })).toEqual({ kind: "redirect", to: "/(tabs)/shift" });
    expect(nav({ segments: ["shift", "project"], hasEntry: true })).toEqual({ kind: "stay" });
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
