import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabase", () => ({ supabase: { rpc: vi.fn(), storage: { from: () => ({}) } } }));
vi.mock("expo-image-manipulator", () => ({ manipulateAsync: vi.fn(), SaveFormat: { JPEG: "jpeg" } }));

import { makeDraft } from "../lib/round/drafts";
import { evidenceSummary } from "../lib/round/evidence";
import { addIdeaRow, canAddIdea, canRemoveIdea, ideaRows, ideasPayload, newIdeaRows, removeIdeaRow, updateIdeaRow } from "../lib/round/ideas";
import { payloadFromDraft, prepareSend } from "../lib/round/submission";
import { ENTRY_ID, ROUND_ID, USER_ID } from "./fixtures/round";

let n = 0;
const id = () => `r${++n}`;

describe("ideas composer rows (3 to 6, pick one)", () => {
  it("starts with 3 rows and adds/removes within 3..6", () => {
    let rows = newIdeaRows(3, id);
    expect(rows).toHaveLength(3);
    expect(canRemoveIdea(rows)).toBe(false);
    expect(removeIdeaRow(rows, rows[0].id)).toBe(rows);
    for (let i = 0; i < 5; i++) rows = addIdeaRow(rows, id);
    expect(rows).toHaveLength(6);
    expect(canAddIdea(rows)).toBe(false);
    rows = removeIdeaRow(rows, rows[1].id);
    expect(rows).toHaveLength(5);
    rows = updateIdeaRow(rows, rows[0].id, { text: "คิวยาว" });
    expect(rows[0].text).toBe("คิวยาว");
  });

  it("builds the payload from non-empty rows and maps the picked row to an index", () => {
    const rows = [
      { id: "a", text: "ห้องสมุดเต็ม", who: "ม.4" },
      { id: "b", text: "  ", who: "" },
      { id: "c", text: "คิวยาว", who: "เพื่อน" },
      { id: "d", text: "ลืมส่งงาน", who: "" },
    ];
    expect(ideasPayload(rows, "c")).toEqual({
      ideas: [
        { text: "ห้องสมุดเต็ม", who: "ม.4" },
        { text: "คิวยาว", who: "เพื่อน" },
        { text: "ลืมส่งงาน", who: "" },
      ],
      picked: 1,
      rowIds: ["a", "c", "d"],
    });
    expect(ideasPayload(rows, "b").picked).toBeUndefined();
    expect(ideasPayload(rows, null).picked).toBeUndefined();
    expect(ideaRows([{ text: "x" }, null, "y"])).toEqual([{ id: "row-0", text: "x", who: "" }]);
  });

  it("shapes and validates an ideas draft; item errors point at the row", () => {
    const draft = {
      ...makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "ideas", draftId: "77777777-7777-4777-8777-777777777777" }),
      fields: {
        ideas: [
          { id: "a", text: "ห้องสมุดเต็มตอนพัก", who: "ม.4 ห้อง 2" },
          { id: "b", text: "คิวโรงอาหารยาว", who: "0812345678" },
          { id: "c", text: "ลืมวันส่งงาน", who: "รุ่นน้อง" },
          { id: "d", text: "", who: "" },
        ],
        picked_id: "c",
        reachable: true,
      },
    };
    expect(payloadFromDraft(draft)).toEqual({
      ideas: [
        { text: "ห้องสมุดเต็มตอนพัก", who: "ม.4 ห้อง 2" },
        { text: "คิวโรงอาหารยาว", who: "0812345678" },
        { text: "ลืมวันส่งงาน", who: "รุ่นน้อง" },
      ],
      picked: 2,
      reachable: true,
    });
    const bad = prepareSend(draft);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues).toContainEqual({ code: "invalid_field", field: "ideas", rule: "personal_data", index: 1, key: "who" });
    const fixed = { ...draft, fields: { ...draft.fields, ideas: draft.fields.ideas.map((r) => (r.id === "b" ? { ...r, who: "เพื่อนในชมรม" } : r)) } };
    const ok = prepareSend(fixed, {}, new Date("2026-10-14T13:00:00Z"), () => "88888888-8888-4888-8888-888888888888");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.draft.attempt?.frozen_payload).toMatchObject({ picked: 2, reachable: true });
    const unpicked = prepareSend({ ...fixed, fields: { ...fixed.fields, picked_id: null } });
    expect(unpicked.ok).toBe(false);
    if (!unpicked.ok) expect(unpicked.issues).toContainEqual({ code: "missing_field", field: "picked" });
  });

  it("passes the problem user group and daily fields through", () => {
    const problem = {
      ...makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "problem_statement" }),
      fields: { text: "นักเรียน ม.4 ลำบากกับการหาที่นั่งอ่านหนังสือตอนพักเที่ยง", user_group: "นักเรียน ม.4" },
    };
    expect(prepareSend(problem).ok).toBe(true);
    const missingGroup = prepareSend({ ...problem, fields: { text: problem.fields.text } });
    expect(!missingGroup.ok && missingGroup.issues).toContainEqual({ code: "missing_field", field: "user_group" });
    const daily = { ...makeDraft({ userId: USER_ID, roundId: ROUND_ID, entryId: ENTRY_ID, type: "daily" }), fields: { built: "แก้ปุ่ม", broke: "", heard: "ชอบ" } };
    const sent = prepareSend(daily);
    expect(sent.ok && sent.draft.attempt?.frozen_payload).toEqual({ built: "แก้ปุ่ม", heard: "ชอบ" });
  });

  it("summarizes ideas, daily and problem logs in one line", () => {
    expect(evidenceSummary({ ideas: [{ text: "a b c", who: "x" }, { text: "คิวยาว", who: "เพื่อน" }], picked: 1 })).toBe("คิวยาว · เพื่อน");
    expect(evidenceSummary({ ideas: [{ id: "a", text: "ห้องสมุด", who: "ม.4" }], picked_id: "a" })).toBe("ห้องสมุด · ม.4");
    expect(evidenceSummary({ built: "แก้ปุ่ม", broke: "x" })).toBe("แก้ปุ่ม");
    expect(evidenceSummary({ text: "หาที่นั่งไม่ได้", user_group: "ม.4" })).toBe("ม.4: หาที่นั่งไม่ได้");
  });
});
