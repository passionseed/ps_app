import { describe, expect, it } from "vitest";
import { clampPost, DISCORD_LIMIT, progressPost } from "../lib/round/discord";

const base = { lang: "th" as const, roundNumber: 2, day: 2 };

describe("#progress post formatter (D7)", () => {
  it("formats the Daily Show: built, broke, heard and the link", () => {
    const text = progressPost({
      ...base,
      type: "daily",
      payload: { built: "หน้าจองห้องสมุด", broke: "ปุ่มกดไม่ได้บนมือถือ", heard: "อยากเห็นที่ว่าง", link: "https://example.com/b" },
    });
    expect(text).toBe(
      ["SHIFT[2] · Day 2 · อัปเดตประจำวัน", "ทำอะไรไป: หน้าจองห้องสมุด", "อะไรพัง: ปุ่มกดไม่ได้บนมือถือ", "คนใช้พูดว่า: อยากเห็นที่ว่าง", "ลิงก์: https://example.com/b"].join("\n"),
    );
    expect(progressPost({ ...base, type: "daily", payload: { built: "แก้ปุ่ม" } })).toBe("SHIFT[2] · Day 2 · อัปเดตประจำวัน\nทำอะไรไป: แก้ปุ่ม");
  });

  it("lists ideas with who has them, the pick and reachability", () => {
    const text = progressPost({
      ...base,
      day: 1,
      type: "ideas",
      payload: { ideas: [{ text: "ห้องสมุดเต็ม", who: "ม.4" }, { text: "คิวยาว", who: "เพื่อน" }, { text: "ลืมส่งงาน", who: "รุ่นน้อง" }], picked: 1, reachable: true },
    });
    expect(text.split("\n")).toEqual([
      "SHIFT[2] · Day 1 · ไอเดีย",
      "1. ห้องสมุดเต็ม (ใครเจอ: ม.4)",
      "2. คิวยาว (ใครเจอ: เพื่อน)",
      "3. ลืมส่งงาน (ใครเจอ: รุ่นน้อง)",
      "เลือกข้อ 2",
      "ทักกลุ่มนี้ได้เอง",
    ]);
  });

  it("never includes transcripts, audio, photos or links about other people", () => {
    const text = progressPost({
      ...base,
      type: "interview",
      progress: { have: 2, need: 3 },
      payload: { who_label: "ครู", key_point: "จดไม่ทัน", transcript: "full transcript", planned_change: "เพิ่มปุ่มจด", link: "https://ig.example/x", input: "voice" },
    });
    expect(text.split("\n")).toEqual(["SHIFT[2] · Day 2 · สัมภาษณ์ 2/3", "คุยกับ: ครู", "เขาบอกว่า: จดไม่ทัน", "จะเปลี่ยน: เพิ่มปุ่มจด"]);
    expect(text).not.toContain("transcript");
    expect(text).not.toContain("https://");
    const contact = progressPost({ ...base, type: "contact", payload: { who_label: "รุ่นน้อง", channel: "chat", link: "https://x.example" } });
    expect(contact).toBe("SHIFT[2] · Day 2 · ทักคนแรก\nทัก: รุ่นน้อง (แชต)");
  });

  it("keeps reviewer-only demo links out of Discord", () => {
    const hidden = progressPost({ ...base, type: "demo_post", payload: { url: "https://drive.example/secret", visibility: "reviewer_only" } });
    expect(hidden).not.toContain("drive.example");
    expect(hidden).toContain("ส่งเดโมให้ทีมงานดูแล้ว");
    const open = progressPost({ ...base, lang: "en", type: "demo_post", payload: { url: "https://ig.example/p/1", visibility: "public", note: "2 min" } });
    expect(open).toBe("SHIFT[2] · Day 2 · Demo post\nDemo: https://ig.example/p/1\nNote: 2 min");
  });

  it("formats problem, prototype, tester and change logs", () => {
    expect(progressPost({ ...base, type: "problem_statement", payload: { text: "นักเรียนหาที่นั่งไม่ได้", user_group: "ม.4" } })).toBe(
      "SHIFT[2] · Day 2 · โจทย์\nปัญหา: นักเรียนหาที่นั่งไม่ได้\nกลุ่มคนใช้: ม.4",
    );
    expect(progressPost({ ...base, lang: "en", type: "mvp", payload: { link: "https://proto.example", note: "paper" } })).toBe(
      "SHIFT[2] · Day 2 · MVP\nNote: paper\nLink: https://proto.example",
    );
    expect(progressPost({ ...base, lang: "en", type: "tester", progress: { have: 1, need: 3 }, payload: { who_label: "Beam", key_point: "Stuck on step 2", what_tried: "the form" } })).toBe(
      "SHIFT[2] · Day 2 · Tester 1/3\nTalked to: Beam\nThey tried: the form\nWhat happened: Stuck on step 2",
    );
    expect(progressPost({ ...base, type: "change", payload: { kind: "decided_not_to", what: "ไม่เปลี่ยนสี" } })).toBe(
      "SHIFT[2] · Day 2 · สิ่งที่เปลี่ยน\nตัดสินใจไม่เปลี่ยน: ไม่เปลี่ยนสี",
    );
  });

  it("works without a round number or day, and stays within Discord's limit", () => {
    expect(progressPost({ lang: "en", type: "daily", payload: { built: "x" } })).toBe("SHIFT · Daily update\nBuilt: x");
    const long = progressPost({ ...base, type: "daily", payload: { built: "ก".repeat(500), broke: "ข".repeat(500), heard: "ค ".repeat(700) } });
    expect(long.length).toBeLessThanOrEqual(DISCORD_LIMIT);
    expect(long.endsWith("…")).toBe(true);
    expect(clampPost("short")).toBe("short");
  });
});
