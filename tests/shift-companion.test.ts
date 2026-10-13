import { describe, expect, it } from "vitest";
import {
  companionEntryTarget,
  sessionEmailConfirmed,
  formatBangkokDate,
  draftKey,
  normalizeCode,
  normalizeMobile,
  updateWindow,
  validateDailyBody,
} from "../lib/shiftCompanionRules";

describe("SHIFT companion", () => {
  it("accepts a formatted linking code and rejects a shared-looking short password", () => {
    expect(normalizeCode(" abcd-efgh-jklm ")).toBe("ABCDEFGHJKLM");
    expect(normalizeCode("ABCD EFGH JKLM")).toBe("ABCDEFGHJKLM");
    expect(normalizeCode("SHIFT-2026")).toBeNull();
    expect(normalizeCode("IIII-OOOO-0000")).toBeNull();
  });

  it("collects a mobile number without treating a leading zero as part of the country number", () => {
    expect(normalizeMobile("66", "081-234-5678")).toBe("+66812345678");
    expect(normalizeMobile("+66", "812345678")).toBe("+66812345678");
    expect(normalizeMobile("", "123")).toBeNull();
  });

  it("allows short updates throughout the cohort day in Bangkok", () => {
    const open = updateWindow("2026-10-01", "2026-10-05", new Date("2026-10-02T11:59:00Z"));
    const closed = updateWindow("2026-10-01", "2026-10-05", new Date("2026-10-02T12:00:00Z"));
    expect(open).toEqual({ date: "2026-10-02", open: true, reason: null });
    expect(closed).toEqual({ date: "2026-10-02", open: true, reason: null });
    expect(updateWindow("2026-10-03", null, new Date("2026-10-02T02:00:00Z")).reason).toBe("before_cohort");
    expect(updateWindow("2026-10-01", "2026-10-02", new Date("2026-10-03T02:00:00Z")).reason).toBe("after_cohort");
  });

  it("requires what you tried and an http link, and keeps drafts on one account", () => {
    expect(validateDailyBody({ tried: "  ", learned: "", help: "", link: "" })).toBe("tried");
    expect(validateDailyBody({ tried: "Talked to two people", learned: "", help: "", link: "javascript:alert(1)" })).toBe("link");
    expect(validateDailyBody({ tried: "Talked to two people", learned: "Labels were too small", help: "", link: "https://example.com" })).toBeNull();
    expect(draftKey("user-a", "cohort", "2026-10-02")).not.toBe(draftKey("user-b", "cohort", "2026-10-02"));
  });

  it("never treats a phone confirmation or another email as verified email identity", () => {
    expect(sessionEmailConfirmed({ email: "me@example.com", confirmed_at: "2026-10-01" }, "me@example.com")).toBe(false);
    expect(sessionEmailConfirmed({ email: "me@example.com", email_confirmed_at: "2026-10-01" }, " ME@example.com ")).toBe(true);
    expect(sessionEmailConfirmed({ email: "me@example.com", email_confirmed_at: "2026-10-01" }, "someone@example.com")).toBe(false);
    expect(companionEntryTarget({ linked: false, onboarded: true, segments: ["shift", "today"] })).toBe("/shift/link");
  });
  it("keeps recovered dates unambiguous across years and does not repair an impossible date silently", () => {
    expect(formatBangkokDate("2025-10-01", "en")).toContain("2025");
    expect(formatBangkokDate("2026-10-01", "en")).toContain("2026");
    expect(formatBangkokDate("2026-02-30", "en")).toBe("2026-02-30");
  });
  it("opens Today when already linked, and the connect screen right after sign-in", () => {
    expect(companionEntryTarget({
      linked: true,
      onboarded: false,
      segments: ["onboarding"],
    })).toBe("/shift/today");
    expect(companionEntryTarget({
      linked: true,
      onboarded: true,
      segments: ["index"],
    })).toBe("/shift/today");
    expect(companionEntryTarget({
      linked: true,
      onboarded: true,
      segments: ["shift", "update"],
    })).toBeNull();
    expect(companionEntryTarget({
      linked: false,
      onboarded: true,
      segments: ["index"],
    })).toBeNull();
    expect(companionEntryTarget({
      linked: false,
      onboarded: true,
      segments: ["(tabs)", "discover"],
    })).toBeNull();
    expect(companionEntryTarget({
      linked: true,
      onboarded: true,
      segments: ["(tabs)", "discover"],
    })).toBeNull();
  });
});
