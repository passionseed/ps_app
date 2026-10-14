import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hasPersonalData, validateEvidence, whoKey } from "../lib/round/schema";
import type { EvidenceType } from "../lib/round/types";
import { addDays } from "../lib/round/time";

const SOURCE = "44444444-4444-4444-8444-444444444444";

const valid: { type: EvidenceType; payload: Record<string, unknown>; media?: { kind: "photo" | "audio"; consent: boolean; duration_ms?: number }[] }[] = [
  { type: "contact", payload: { who_label: "ม.5 ห้องเดียวกัน", channel: "chat", occurred_on: "2026-11-12" } },
  { type: "contact", payload: { who_label: "ครู", channel: "in_person", occurred_on: "2026-11-12", link: "https://example.com/x" }, media: [{ kind: "photo", consent: true }] },
  { type: "interview", payload: { who_label: "รุ่นน้อง ม.4", occurred_on: "2026-11-12", key_point: "งงว่าส่งไปแล้วหรือยัง", input: "voice", transcript: "..." }, media: [{ kind: "audio", consent: true, duration_ms: 42_000 }] },
  { type: "problem_statement", payload: { text: "นักเรียน ม.4 ลำบากกับการจองห้องสมุดตอนพักเที่ยง เพราะไม่รู้ว่าห้องว่างไหม", user_group: "นักเรียน ม.4" } },
  { type: "mvp", payload: { link: "https://figma.com/proto/abc" } },
  { type: "mvp", payload: { note: "paper prototype" }, media: [{ kind: "photo", consent: true }] },
  { type: "tester", payload: { who_label: "เพื่อนในชมรม", occurred_on: "2026-11-13", key_point: "กดซ้ำสองรอบ", what_tried: "จองห้อง" } },
  { type: "change", payload: { kind: "decided_not_to", what: "ไม่เปลี่ยนสี เพราะ...", source_evidence_id: SOURCE } },
  { type: "demo_post", payload: { url: "https://instagram.com/p/xyz", visibility: "reviewer_only" } },
];

const invalid: { type: EvidenceType; payload: Record<string, unknown>; media?: { kind: "photo" | "audio"; consent: boolean; duration_ms?: number }[]; code: string; field: string; rule?: string }[] = [
  { type: "contact", payload: { who_label: "ครู", channel: "chat" }, code: "missing_field", field: "occurred_on" },
  { type: "contact", payload: { who_label: "ครู", channel: "fax", occurred_on: "2026-11-12" }, code: "invalid_field", field: "channel" },
  { type: "contact", payload: { who_label: "0812345678", channel: "chat", occurred_on: "2026-11-12" }, code: "invalid_field", field: "who_label", rule: "personal_data" },
  { type: "contact", payload: { who_label: "me@example.com", channel: "chat", occurred_on: "2026-11-12" }, code: "invalid_field", field: "who_label", rule: "personal_data" },
  { type: "contact", payload: { who_label: "line.me/abc", channel: "chat", occurred_on: "2026-11-12" }, code: "invalid_field", field: "who_label", rule: "personal_data" },
  { type: "contact", payload: { who_label: "ครู", channel: "chat", occurred_on: "2026-11-12", extra: 1 }, code: "invalid_field", field: "extra" },
  { type: "contact", payload: { who_label: "ครู", channel: "chat", occurred_on: "2026-11-12" }, media: [{ kind: "photo", consent: false }], code: "photo_consent_required", field: "photo" },
  { type: "contact", payload: { who_label: "ครู", channel: "chat", occurred_on: "2026-11-12" }, media: [{ kind: "audio", consent: true }], code: "invalid_field", field: "audio" },
  { type: "interview", payload: { who_label: "ครู", occurred_on: "2026-11-12", key_point: "   " }, code: "missing_field", field: "key_point" },
  { type: "interview", payload: { who_label: "ครู", occurred_on: "2026-11-12", key_point: "x" }, media: [{ kind: "audio", consent: false }], code: "audio_consent_required", field: "audio" },
  { type: "interview", payload: { who_label: "ครู", occurred_on: "2026-11-12", key_point: "x" }, media: [{ kind: "audio", consent: true, duration_ms: 181_000 }], code: "invalid_field", field: "audio" },
  { type: "problem_statement", payload: { text: "too short", user_group: "ม.4" }, code: "invalid_field", field: "text" },
  { type: "mvp", payload: {}, code: "missing_field", field: "link" },
  { type: "mvp", payload: { link: "http://insecure.example" }, code: "link_not_https", field: "link" },
  { type: "change", payload: { kind: "changed", what: "ปรับปุ่ม" }, code: "missing_field", field: "source_evidence_id" },
  { type: "demo_post", payload: { url: "https://x.co/a" }, code: "missing_field", field: "visibility" },
  { type: "demo_post", payload: { url: "javascript:alert(1)", visibility: "public" }, code: "link_not_https", field: "url" },
];

describe("evidence payload schema v1 (X6, 2.3)", () => {
  it.each(valid.map((v, i) => [i, v] as const))("accepts valid case %i", (_i, c) => {
    const result = validateEvidence(c.type, c.payload, c.media);
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  it.each(invalid.map((v, i) => [i, v] as const))("rejects invalid case %i", (_i, c) => {
    const result = validateEvidence(c.type, c.payload, c.media);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ code: c.code, field: c.field, ...(c.rule ? { rule: c.rule } : {}) }));
    }
  });

  it("trims strings and drops empty optionals before sending", () => {
    const result = validateEvidence("contact", { who_label: "  ครู  ", channel: "chat", occurred_on: "2026-11-12", link: "" });
    expect(result).toEqual({ ok: true, payload: { who_label: "ครู", channel: "chat", occurred_on: "2026-11-12" } });
  });

  it("checks occurred_on against the round window", () => {
    const ctx = { earliestDate: "2026-11-03", today: "2026-11-15" };
    expect(validateEvidence("contact", { who_label: "ครู", channel: "chat", occurred_on: "2026-11-01" }, [], ctx).ok).toBe(false);
    expect(validateEvidence("contact", { who_label: "ครู", channel: "chat", occurred_on: "2026-11-16" }, [], ctx).ok).toBe(false);
    expect(validateEvidence("contact", { who_label: "ครู", channel: "chat", occurred_on: "2026-11-03" }, [], ctx).ok).toBe(true);
  });

  it("normalizes who keys like the server (E19)", () => {
    expect(whoKey("  ม.5   ห้อง 2 ")).toBe("ม.5 ห้อง 2");
    expect(whoKey("Grade 11 Music")).toBe("grade 11 music");
    expect(hasPersonalData("@tonnie")).toBe(true);
    expect(hasPersonalData("ม.5 ห้อง 2 ชมรมดนตรี")).toBe(false);
  });

  it("treats the same labels as personal data as the server (has_personal_data)", () => {
    for (const label of ["fb.com/x", "tiktok.com/@x", "Ploy@school", "ploy@example.com", "@a", "line.me/ti/p/x", "FACEBOOK.COM/x", "0812345678", "08 1234 5678 9"]) {
      expect(hasPersonalData(label), label).toBe(true);
    }
    for (const label of ["ม.4 ห้อง 2", "kids who take the bus", "Grade 10 @ school", "ครู 12345678", "fbcom"]) {
      expect(hasPersonalData(label), label).toBe(false);
    }
  });

  it("reports every problem inside the ideas list on `ideas` with {rule, index, key} (0-based)", () => {
    const ok = { text: "คิวโรงอาหารยาว", who: "ม.4" };
    const issuesOf = (payload: Record<string, unknown>) => {
      const r = validateEvidence("ideas", payload);
      return r.ok ? [] : r.issues;
    };
    expect(issuesOf({ ideas: [ok, { ...ok, phone: "1" }, ok], picked: 0 })).toContainEqual({ code: "invalid_field", field: "ideas", rule: "unknown_key", index: 1, key: "phone" });
    expect(issuesOf({ ideas: [ok, ok, { text: "Canteen queue" }], picked: 0 })).toContainEqual({ code: "invalid_field", field: "ideas", rule: "required", index: 2, key: "who" });
    expect(issuesOf({ ideas: [ok, ok, { text: 3, who: "ม.4" }], picked: 0 })).toContainEqual({ code: "invalid_field", field: "ideas", rule: "type", index: 2, key: "text" });
    expect(issuesOf({ ideas: [{ text: "ab", who: "ม.4" }, ok, ok], picked: 0 })).toContainEqual({ code: "invalid_field", field: "ideas", rule: "length", index: 0, key: "text" });
    expect(issuesOf({ ideas: [ok, "just text", ok], picked: 0 })).toContainEqual({ code: "invalid_field", field: "ideas", rule: "type", index: 1 });
    expect(issuesOf({ ideas: [ok, ok], picked: 0 })).toContainEqual({ code: "invalid_field", field: "ideas", rule: "count" });
    expect(issuesOf({ ideas: "three", picked: 0 })).toContainEqual({ code: "invalid_field", field: "ideas", rule: "type" });
    expect(issuesOf({ ideas: [ok, ok, ok], picked: 3 })).toContainEqual({ code: "invalid_field", field: "picked", rule: "range" });
    expect(issuesOf({ ideas: [ok, ok, ok] })).toContainEqual({ code: "missing_field", field: "picked" });
  });

  type SharedCase = { name: string; type: EvidenceType; payload: Record<string, unknown>; has_photo?: boolean; code?: string; field?: string; rule?: string };
  type SharedDoc = { context?: { round_starts_on: string; today: string }; valid?: SharedCase[]; invalid?: SharedCase[] };
  const media = (c: SharedCase) => (c.has_photo ? [{ kind: "photo" as const, consent: true }] : []);
  const ctxOf = (doc: SharedDoc) =>
    doc.context ? { earliestDate: addDays(doc.context.round_starts_on, -7), today: doc.context.today } : {};
  function expectParity(doc: SharedDoc) {
    const ctx = ctxOf(doc);
    for (const c of doc.valid ?? []) {
      const r = validateEvidence(c.type, c.payload, media(c), ctx);
      expect(r.ok, `${c.name}: ${JSON.stringify(r)}`).toBe(true);
    }
    for (const c of doc.invalid ?? []) {
      const r = validateEvidence(c.type, c.payload, media(c), ctx);
      expect(r.ok, c.name).toBe(false);
      if (!r.ok) {
        expect(r.issues, c.name).toContainEqual(
          expect.objectContaining({ code: c.code, field: c.field, ...(c.rule ? { rule: c.rule } : {}) }),
        );
      }
    }
  }

  // Scale spec 2.2 cases (ideas, daily, problem user_group), in the shared fixture format so lane A
  // can merge them into supabase/tests/fixtures/shift_round_payloads.json.
  const scale = JSON.parse(readFileSync(resolve(__dirname, "fixtures/shift_round_payloads_scale.json"), "utf8")) as SharedDoc;
  it("accepts and rejects the scale spec 2.2 fixtures (ideas, daily, problem user group)", () => {
    expect(scale.valid?.length).toBeGreaterThan(0);
    expect(scale.invalid?.length).toBeGreaterThan(0);
    expectParity(scale);
  });

  // Shared fixtures from lane A (supabase/tests/fixtures/shift_round_payloads.json) when present and
  // already on the scale contract (they include ideas cases); older copies predate user_group.
  const candidates = [process.env.PSEED_DIR, resolve(__dirname, "../../../pseed-shift"), resolve(__dirname, "../../../pseed")].filter(
    (d): d is string => !!d,
  );
  const fixturePath = candidates.map((d) => resolve(d, "supabase/tests/fixtures/shift_round_payloads.json")).find((p) => existsSync(p));
  const shared = fixturePath ? (JSON.parse(readFileSync(fixturePath, "utf8")) as SharedDoc) : null;
  const sharedIsScale = !!shared && [...(shared.valid ?? []), ...(shared.invalid ?? [])].some((c) => c.type === "ideas");
  it.skipIf(!sharedIsScale)("agrees with lane A's shared fixtures", () => {
    expectParity(shared!);
  });

  it("the ideas payload maps item errors to the list with the row index", () => {
    const three = [
      { text: "ห้องสมุดเต็ม", who: "ม.4" },
      { text: "คิวยาว", who: "0812345678" },
      { text: "ลืมส่งงาน", who: "รุ่นน้อง" },
    ];
    const r = validateEvidence("ideas", { ideas: three, picked: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContainEqual({ code: "invalid_field", field: "ideas", rule: "personal_data", index: 1, key: "who" });
    const ok = validateEvidence("ideas", { ideas: three.map((i, n) => (n === 1 ? { ...i, who: "  เพื่อน  " } : i)), picked: 1, reachable: true });
    expect(ok).toEqual({ ok: true, payload: { ideas: [three[0], { text: "คิวยาว", who: "เพื่อน" }, three[2]], picked: 1, reachable: true } });
  });
});
