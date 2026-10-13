import { beforeEach, describe, expect, it, vi } from "vitest";
const values = new Map<string, string>();
vi.mock("../lib/shiftStorage", () => ({ shiftStorage: {
  getItem: async (key: string) => values.get(key) ?? null,
  setItem: async (key: string, value: string) => { values.set(key, value); },
  removeItem: async (key: string) => { values.delete(key); },
} }));
import { clearCompanionResume, loadCompanionAccess, loadCompanionResume, permittedCompanionResume,
  preserveInterruptedComposer, rememberActiveComposer, rememberCompanionResume } from "../lib/shiftCompanionRecovery";
import { isIsoDate, type CompanionStatus } from "../lib/shiftCompanionRules";
const cohort = { id: "cohort-a", name: "SHIFT", starts_on: "2026-10-01", ends_on: "2026-10-07" };
const status: CompanionStatus = { ok: true, linked: true, email: "me@example.com", mobile: "+66812345678", cohorts: [{ ...cohort, mobile: "+66812345678" }] };
const unavailable = async (): Promise<never> => { throw new Error("Network request failed"); };
beforeEach(() => values.clear());
describe("SHIFT recovery across app and authentication restarts", () => {
  it("reopens the same account's cached cohorts offline without copying private contacts", async () => {
    await loadCompanionAccess("a", async () => status);
    const stored = values.get("shift-linked-cohorts:a")!;
    expect(stored).not.toContain("me@example.com"); expect(stored).not.toContain("+66812345678");
    expect(await loadCompanionAccess("a", unavailable)).toEqual({ ok: true, linked: true, email: null, mobile: null, cohorts: [cohort], fromDevice: true });
    await expect(loadCompanionAccess("b", unavailable)).rejects.toThrow("Network");
  });
  it("does not restore cached membership after a verified unlink or authorization error", async () => {
    await loadCompanionAccess("a", async () => status);
    await expect(loadCompanionAccess("a", async () => { throw new Error("JWT expired"); })).rejects.toThrow("JWT expired");
    await expect(loadCompanionAccess("a", async () => {
      throw Object.assign(new Error("Connection rejected"), { code: "PGRST301" });
    })).rejects.toThrow("Connection rejected");
    await loadCompanionAccess("a", async () => ({ ok: true, linked: false, email: null, mobile: null, cohorts: [] }));
    await expect(loadCompanionAccess("a", unavailable)).rejects.toThrow("Network");
  });
  it("rejects damaged metadata and impossible dates rather than rendering invented cohorts", async () => {
    for (const raw of ["not json", "[null]", '[{"id":"cohort"}]', JSON.stringify([{ ...cohort, starts_on: "2026-02-30" }])]) {
      values.set("shift-linked-cohorts:a", raw);
      await expect(loadCompanionAccess("a", unavailable)).rejects.toThrow("Network");
    }
    expect(isIsoDate("2024-02-29")).toBe(true); expect(isIsoDate("2026-02-29")).toBe(false);
  });
  it("persists the original account/cohort/date through logout and OAuth URL replacement", async () => {
    const resume = { cohortId: cohort.id, date: "2026-10-01" };
    await rememberActiveComposer("a", resume); await preserveInterruptedComposer("a");
    expect(await loadCompanionResume("a")).toEqual(resume);
    expect(permittedCompanionResume(await loadCompanionResume("a"), [cohort])).toEqual(resume);
    expect(await loadCompanionResume("b")).toBeNull();
    expect(permittedCompanionResume(await loadCompanionResume("a"), [{ ...cohort, id: "other-cohort" }])).toBeNull();
    await clearCompanionResume("a"); expect(await loadCompanionResume("a")).toBeNull();
  });
  it("refuses malformed resume intents and never uses a shared logged-out identity", async () => {
    await rememberCompanionResume("", { cohortId: cohort.id, date: "2026-10-01" });
    await rememberCompanionResume("a", { cohortId: cohort.id, date: "2026-02-30" });
    expect(values.size).toBe(0); expect(await loadCompanionResume("")).toBeNull();
    values.set("shift-resume:a", '{"date":"2026-10-01"}'); expect(await loadCompanionResume("a")).toBeNull();
  });
});
