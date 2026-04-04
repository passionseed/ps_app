import { describe, expect, it } from "vitest";

import { parseHackathonComicContent } from "../lib/hackathonComic";

describe("parseHackathonComicContent", () => {
  it("parses valid metadata into ordered panels", () => {
    const comic = parseHackathonComicContent(
      {
        variant: "evidence_first",
        panels: [
          {
            id: "outcome",
            order: 4,
            headline: "You'll walk away with a validated problem.",
            body: "A validated pain point, a clear target user, and a guide-backed next step.",
            image_key: "phase1-outcome",
            accent: "cyan",
          },
          {
            id: "noise",
            order: 1,
            headline: "Most teams start with a vague idea.",
            body: "Trends, guesses, and half-formed assumptions all sound important at first.",
            image_key: "phase1-noise",
            accent: "amber",
          },
          {
            id: "validation",
            order: 3,
            headline: "A good problem becomes specific.",
            body: "One clear person. One real pain. One concrete context.",
            image_key: "phase1-validation",
            accent: "blue",
          },
          {
            id: "evidence",
            order: 2,
            headline: "Real interviews reveal repeated pain.",
            body: "Patterns matter more than opinions. We look for friction people already feel.",
            image_key: "phase1-evidence",
            accent: "cyan",
          },
        ],
      },
      "What You'll Walk Away With",
      "By the end of Phase 1, you'll know how to find a good problem, validate a real pain point, and define the right target user with our guide.",
    );

    expect(comic?.variant).toBe("evidence_first");
    expect(comic?.panels.map((panel) => panel.id)).toEqual([
      "noise",
      "evidence",
      "validation",
      "outcome",
    ]);
    expect(comic?.panels[0]).toMatchObject({
      headline: "Most teams start with a vague idea.",
      body: "Trends, guesses, and half-formed assumptions all sound important at first.",
      imageKey: "phase1-noise",
      accent: "amber",
    });
  });

  it("falls back safely when panel fields are missing", () => {
    const comic = parseHackathonComicContent(
      {
        panels: [
          {
            id: "panel-a",
          },
          {
            id: "panel-b",
            order: 2,
            title: "Validation",
            description: "One clear person. One real pain.",
          },
        ],
      },
      "What You'll Walk Away With",
      "A validated pain point, a clear target user, and a guide-backed next step.",
    );

    expect(comic?.panels).toHaveLength(2);
    expect(comic?.panels[0]).toMatchObject({
      id: "panel-a",
      order: 1,
      headline: "What You'll Walk Away With",
      body: "A validated pain point, a clear target user, and a guide-backed next step.",
      imageKey: null,
      accent: "cyan",
    });
    expect(comic?.panels[1]).toMatchObject({
      id: "panel-b",
      order: 2,
      headline: "Validation",
      body: "One clear person. One real pain.",
      imageKey: null,
      accent: "cyan",
    });
  });

  it("returns null for unsupported metadata shapes", () => {
    expect(parseHackathonComicContent(null as any, "What You'll Walk Away With", "Body")).toBeNull();
    expect(
      parseHackathonComicContent(
        { kind: "not-a-comic" } as any,
        "What You'll Walk Away With",
        "Body",
      ),
    ).toBeNull();
    expect(
      parseHackathonComicContent(
        { panels: "nope" } as any,
        "What You'll Walk Away With",
        "Body",
      ),
    ).toBeNull();
  });

  it("handles nullable content text and mixed panel entries safely", () => {
    const comic = parseHackathonComicContent(
      {
        panels: [
          "skip-me",
          {
            id: 101,
            display_order: "2",
            image_url: "https://cdn.example.com/panel-2.png",
          },
          {
            id: "panel-1",
            order: "1",
            headline: "Noise",
            body: "Messy inputs everywhere.",
            imageUrl: "https://cdn.example.com/panel-1.png",
          },
        ],
      } as any,
      null,
      null,
    );

    expect(comic?.panels).toHaveLength(2);
    expect(comic?.panels[0]).toMatchObject({
      id: "panel-1",
      order: 1,
      headline: "Noise",
      body: "Messy inputs everywhere.",
      imageKey: "https://cdn.example.com/panel-1.png",
    });
    expect(comic?.panels[1]).toMatchObject({
      id: "101",
      order: 2,
      headline: "Panel 1",
      body: "",
      imageKey: "https://cdn.example.com/panel-2.png",
    });
  });
});
