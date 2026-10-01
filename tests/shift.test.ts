import { describe, it, expect } from "vitest";
import { shiftDay, peerUpdates, validateUpdate } from "../lib/shift-curriculum";
import type { ShiftSnapshot, ShiftUpdate } from "../types/shift";

describe("SHIFT scheduled experience", () => {
  it("switches days at Bangkok midnight, not UTC midnight", () => {
    expect(shiftDay("2026-10-05", new Date("2026-10-04T16:59:59Z"))).toBe(0);
    expect(shiftDay("2026-10-05", new Date("2026-10-04T17:00:00Z"))).toBe(1);
    expect(shiftDay("2026-10-05", new Date("2026-10-11T16:59:59Z"))).toBe(7);
    expect(shiftDay("2026-10-05", new Date("2026-10-11T17:00:00Z"))).toBe(8);
  });
  it("requires a useful presentation but permits unfinished drafts", () => {
    expect(validateUpdate({}, 1, false)).toBeNull();
    expect(validateUpdate({}, 1, true)).toMatch(/tried/);
    expect(validateUpdate({ shipped: "Working tool" }, 7, true)).toMatch(
      /problem/,
    );
    expect(
      validateUpdate(
        {
          shipped: "Working tool",
          problem: "Tiny labels",
          learned: "Larger controls",
        },
        7,
        true,
      ),
    ).toBeNull();
    expect(validateUpdate({ link: "javascript:alert(1)" }, 1, false)).toMatch(
      /http/,
    );
  });
  it("suggests unanswered peer projects, excluding own, hidden, and draft posts", () => {
    const update = (
      id: string,
      project_id: string,
      extra: Partial<ShiftUpdate> = {},
    ): ShiftUpdate => ({
      id,
      project_id,
      day: 1,
      post_id: id,
      body: { shipped: "Attempt" },
      contributor_ids: [],
      author_id: "peer",
      revision: 1,
      hidden: false,
      published_at: "2026-10-05",
      updated_at: "2026-10-05",
      ...extra,
    });
    const s = {
      user_id: "me",
      groups: [{ id: "g", name: "Group", members: ["me", "peer"] }],
      projects: [
        { id: "mine", members: ["me"] },
        { id: "peer-work", members: ["peer"] },
        { id: "other-work", members: ["other"] },
      ],
      updates: [
        update("mine", "mine"),
        update("draft", "peer-work", { published_at: null }),
        update("hidden", "peer-work", { hidden: true }),
        update("peer", "peer-work"),
        update("other", "other-work", { updated_at: "2026-10-06" }),
      ],
      comments: [],
    } as unknown as ShiftSnapshot;
    expect(peerUpdates(s).map((u) => u.id)).toEqual(["peer", "other"]);
    s.comments = [
      {
        id: "c",
        post_id: "peer",
        author_id: "me",
        body: "Tried it",
        created_at: "now",
      },
    ];
    expect(peerUpdates(s).map((u) => u.id)).toEqual(["other"]);
  });
  it("offers another cohort project when all three peers share one project", () => {
    const s = {
      user_id: "me",
      groups: [{ id: "g", members: ["me", "peer", "third"] }],
      projects: [
        { id: "shared", members: ["me", "peer", "third"] },
        { id: "outside", members: ["another"] },
      ],
      updates: [
        {
          id: "u",
          project_id: "outside",
          post_id: "p",
          published_at: "now",
          updated_at: "now",
          hidden: false,
        },
      ],
      comments: [],
    } as unknown as ShiftSnapshot;
    expect(peerUpdates(s).map((u) => u.id)).toEqual(["u"]);
  });
});
