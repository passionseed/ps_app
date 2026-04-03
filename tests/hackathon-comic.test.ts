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
            headline: "By the end of Phase 1, you leave with evidence.",
            body: "A validated pain point, a clear target user, and a guide for what to do next.",
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
      "Show the Outcome",
      "Show the outcome first: what the participant will get, who they could become, the skills they will build, how those skills help them fix the problem, and the challenge they will face.",
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
      "Show the Outcome",
      "A validated pain point, a clear target user, and a guide for what to do next.",
    );

    expect(comic?.panels).toHaveLength(2);
    expect(comic?.panels[0]).toMatchObject({
      id: "panel-a",
      order: 1,
      headline: "Show the Outcome",
      body: "A validated pain point, a clear target user, and a guide for what to do next.",
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
    expect(parseHackathonComicContent(null as any, "Show the Outcome", "Body")).toBeNull();
    expect(
      parseHackathonComicContent(
        { kind: "not-a-comic" } as any,
        "Show the Outcome",
        "Body",
      ),
    ).toBeNull();
    expect(
      parseHackathonComicContent(
        { panels: "nope" } as any,
        "Show the Outcome",
        "Body",
      ),
    ).toBeNull();
  });
});
