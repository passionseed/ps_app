import { describe, it, expect } from "vitest";
import {
  archetypes,
  axes,
  NEUTRAL_THRESHOLD,
  computeEBAxis,
  computeSBAxis,
  computeSQAxis,
  computePRAxis,
  classifyArchetype,
} from "./archetypes";

describe("archetype data integrity", () => {
  it("exports exactly 9 archetypes with unique IDs", () => {
    expect(archetypes).toHaveLength(9);
    const ids = archetypes.map((a) => a.id);
    expect(new Set(ids).size).toBe(9);
  });

  it("each archetype has display name and caption in EN and TH", () => {
    for (const a of archetypes) {
      expect(a.display.en).toBeTruthy();
      expect(a.display.th).toBeTruthy();
      expect(a.caption.en).toBeTruthy();
      expect(a.caption.th).toBeTruthy();
    }
  });

  it("each archetype has bgmPrompt", () => {
    for (const a of archetypes) {
      expect(a.bgmPrompt).toBeTruthy();
      expect(a.bgmPrompt.startsWith("mmx music generate:")).toBe(true);
    }
  });

  it("all 8 named archetypes have unique sign vectors matching explicit table", () => {
    const named = archetypes.filter((a) => a.id !== "wanderer");
    expect(named).toHaveLength(8);
    const signSet = new Set<string>();
    for (const a of named) {
      expect(a.signs).toBeDefined();
      const s = a.signs!;
      expect([s.eb, s.sb, s.pr, s.sq].every((v) => [-1, 0, 1].includes(v))).toBe(true);
      const key = `${s.eb},${s.sb},${s.pr},${s.sq}`;
      expect(signSet.has(key)).toBe(false);
      signSet.add(key);
    }
  });

  it("wanderer has no sign pattern (or all-zero)", () => {
    const wanderer = archetypes.find((a) => a.id === "wanderer")!;
    if (wanderer.signs) {
      expect(wanderer.signs.eb).toBe(0);
      expect(wanderer.signs.sb).toBe(0);
      expect(wanderer.signs.pr).toBe(0);
      expect(wanderer.signs.sq).toBe(0);
    }
  });

  it("sign vectors match explicit enumerated table", () => {
    const table: Record<string, { eb: number; sb: number; pr: number; sq: number }> = {
      "field-researcher": { eb: -1, sb: 0, pr: 0, sq: 0 },
      connector: { eb: -1, sb: 0, pr: 0, sq: 1 },
      detective: { eb: 0, sb: -1, pr: -1, sq: 0 },
      pivoter: { eb: 0, sb: 0, pr: 1, sq: 0 },
      "quiet-anchor": { eb: 1, sb: 0, pr: -1, sq: -1 },
      iterator: { eb: 1, sb: 0, pr: 1, sq: 0 },
      "skeptical-maker": { eb: 1, sb: -1, pr: 0, sq: 0 },
      "gut-caller": { eb: 0, sb: 1, pr: 1, sq: 1 },
    };
    for (const [id, expected] of Object.entries(table)) {
      const a = archetypes.find((x) => x.id === id)!;
      expect(a.signs).toEqual(expected);
    }
  });

  it("four axis constants exported with correct poles", () => {
    expect(axes.EB).toBeDefined();
    expect(axes.SB).toBeDefined();
    expect(axes.PR).toBeDefined();
    expect(axes.SQ).toBeDefined();
    expect(axes.EB.negative.en).toBe("Explorer");
    expect(axes.EB.positive.en).toBe("Builder");
    expect(axes.SB.negative.en).toBe("Skeptic");
    expect(axes.SB.positive.en).toBe("Believer");
    expect(axes.PR.negative.en).toBe("Patient");
    expect(axes.PR.positive.en).toBe("Restless");
    expect(axes.SQ.negative.en).toBe("Solo");
    expect(axes.SQ.positive.en).toBe("Squad");
  });
});

describe("axis computation", () => {
  it("computeEBAxis maps slider 0 to negative, 4 to positive, 2 to ~0", () => {
    expect(computeEBAxis(0, [])).toBeLessThan(0);
    expect(computeEBAxis(4, [])).toBeGreaterThan(0);
    expect(computeEBAxis(2, [])).toBeCloseTo(0, 5);
  });

  it("EB axis base formula: (sliderValue - 2) / 2", () => {
    expect(computeEBAxis(0, [])).toBe(-1);
    expect(computeEBAxis(1, [])).toBe(-0.5);
    expect(computeEBAxis(2, [])).toBe(0);
    expect(computeEBAxis(3, [])).toBe(0.5);
    expect(computeEBAxis(4, [])).toBe(1);
  });

  it("EB axis aggregation: baseScore + sum(P3 EB weights) clamped", () => {
    // Selecting option 1 (eb +0.10) and option 3 (eb +0.30)
    expect(computeEBAxis(2, [1, 3])).toBeCloseTo(0.4, 5);
    // Selecting option 7 (eb -0.30)
    expect(computeEBAxis(2, [7])).toBeCloseTo(-0.3, 5);
  });

  it("EB axis clamped to [-1, 1]", () => {
    expect(computeEBAxis(4, [3, 5, 7])).toBe(1);
    expect(computeEBAxis(0, [2, 4, 6])).toBe(-1);
    expect(computeEBAxis(0, [])).toBe(-1);
    expect(computeEBAxis(4, [])).toBe(1);
  });

  it("computeSBAxis maps slider linearly and is clamped", () => {
    expect(computeSBAxis(0)).toBe(-1);
    expect(computeSBAxis(2)).toBe(0);
    expect(computeSBAxis(4)).toBe(1);
    expect(computeSBAxis(1)).toBe(-0.5);
    expect(computeSBAxis(3)).toBe(0.5);
  });

  it("computeSQAxis aggregates P3 SQ weights", () => {
    expect(computeSQAxis([])).toBe(0);
    // option 0: +0.40, option 4: +0.50 => 0.90
    expect(computeSQAxis([0, 4])).toBeCloseTo(0.9, 5);
    // option 1: -0.50, option 3: -0.20 => -0.70
    expect(computeSQAxis([1, 3])).toBeCloseTo(-0.7, 5);
  });

  it("computeSQAxis is clamped to [-1, 1]", () => {
    expect(computeSQAxis([0, 4, 6])).toBe(1);
    expect(computeSQAxis([1, 3, 5, 7])).toBe(-1);
  });

  it("P3 selections do not affect SB or PR axes", () => {
    // SB only depends on slider
    expect(computeSBAxis(2)).toBe(0);
    // PR only depends on ranked indices
    expect(computePRAxis([])).toBe(0);
    expect(computePRAxis([0, 1, 2])).not.toBeNaN();
  });

  it("computePRAxis maps 3 ranked indices to [-1, 1] with documented formula", () => {
    expect(computePRAxis([])).toBe(0);
    expect(computePRAxis([0])).toBeGreaterThan(0);
    expect(computePRAxis([0, 1, 2])).toBeGreaterThanOrEqual(-1);
    expect(computePRAxis([0, 1, 2])).toBeLessThanOrEqual(1);
    // First weight != third weight
    const single = computePRAxis([0]);
    const triple = computePRAxis([2, 1, 0]);
    expect(single).not.toBe(triple);
  });

  it("computePRAxis handles fewer than 3 indices", () => {
    expect(computePRAxis([])).toBe(0);
    expect(computePRAxis([0])).toBeGreaterThan(0);
    expect(computePRAxis([0, 1])).toBeGreaterThan(0);
  });

  it("all 4 axis functions clamp return values to [-1, 1]", () => {
    expect(computeEBAxis(100, [0, 1, 2, 3, 4, 5, 6, 7])).toBe(1);
    expect(computeEBAxis(-100, [])).toBe(-1);
    expect(computeSBAxis(100)).toBe(1);
    expect(computeSBAxis(-100)).toBe(-1);
    expect(computeSQAxis([0, 4])).toBe(0.9);
    expect(computeSQAxis([])).toBe(0);
    expect(computePRAxis([0, 3, 5])).toBeCloseTo(0.9167, 3);
    expect(computePRAxis([])).toBe(0);
  });

  it("non-integer slider values handled", () => {
    expect(computeEBAxis(1.5, [])).toBeCloseTo(-0.25, 5);
    expect(computeSBAxis(3.7)).toBeCloseTo(0.85, 5);
  });
});

describe("classification logic", () => {
  it("classifyArchetype exists and is deterministic", () => {
    const scores = { eb: 0.5, sb: -0.5, pr: 0.5, sq: -0.5 };
    const r1 = classifyArchetype(scores);
    const r2 = classifyArchetype(scores);
    expect(r1.id).toBe(r2.id);
    expect(r1.display).toBeDefined();
    expect(r1.caption).toBeDefined();
    expect(r1.bgmPrompt).toBeDefined();
  });

  it("NEUTRAL_THRESHOLD is 0.25", () => {
    expect(NEUTRAL_THRESHOLD).toBe(0.25);
  });

  it("wanderer returned when all axes below neutral threshold", () => {
    const scores = { eb: 0.1, sb: -0.1, pr: 0.05, sq: -0.05 };
    expect(classifyArchetype(scores).id).toBe("wanderer");
  });

  it("wanderer returned for unmatched sign combinations", () => {
    // A sign pattern that doesn't match any named archetype
    const scores = { eb: 1, sb: 1, pr: -1, sq: -1 };
    expect(classifyArchetype(scores).id).toBe("wanderer");
  });

  it("classification boundaries are deterministic at zero", () => {
    const scores = { eb: 0, sb: 0, pr: 0, sq: 0 };
    const r = classifyArchetype(scores);
    // Zero should deterministically map to one side
    expect(r.id).toBeTruthy();
  });

  it("extreme scores classify to named archetypes", () => {
    const allPositive = { eb: 1, sb: 1, pr: 1, sq: 1 };
    expect(classifyArchetype(allPositive).id).not.toBe("wanderer");
    const allNegative = { eb: -1, sb: -1, pr: -1, sq: -1 };
    expect(classifyArchetype(allNegative).id).not.toBe("wanderer");
  });

  it("all 8 named archetypes are reachable by some scores input", () => {
    const reachability: Record<string, { eb: number; sb: number; pr: number; sq: number }> = {
      "field-researcher": { eb: -1, sb: 0, pr: 0, sq: 0 },
      connector: { eb: -1, sb: 0, pr: 0, sq: 1 },
      detective: { eb: 0, sb: -1, pr: -1, sq: 0 },
      pivoter: { eb: 0, sb: 0, pr: 1, sq: 0 },
      "quiet-anchor": { eb: 1, sb: 0, pr: -1, sq: -1 },
      iterator: { eb: 1, sb: 0, pr: 1, sq: 0 },
      "skeptical-maker": { eb: 1, sb: -1, pr: 0, sq: 0 },
      "gut-caller": { eb: 0, sb: 1, pr: 1, sq: 1 },
    };
    for (const [expectedId, scores] of Object.entries(reachability)) {
      expect(classifyArchetype(scores).id).toBe(expectedId);
    }
  });

  it("classifyArchetype handles out-of-range scores", () => {
    const scores = { eb: 1.5, sb: -2, pr: 3, sq: -0.5 };
    expect(() => classifyArchetype(scores)).not.toThrow();
    const result = classifyArchetype(scores);
    expect(archetypes.map((a) => a.id)).toContain(result.id);
  });

  it("scoring functions are pure and synchronous", () => {
    const eb1 = computeEBAxis(2, [0, 1]);
    const eb2 = computeEBAxis(2, [0, 1]);
    expect(eb1).toBe(eb2);
    const sb1 = computeSBAxis(2);
    const sb2 = computeSBAxis(2);
    expect(sb1).toBe(sb2);
    const sq1 = computeSQAxis([0, 1]);
    const sq2 = computeSQAxis([0, 1]);
    expect(sq1).toBe(sq2);
    const pr1 = computePRAxis([0, 1, 2]);
    const pr2 = computePRAxis([0, 1, 2]);
    expect(pr1).toBe(pr2);
  });

  it("full pipeline consistency: golden test cases for all 9 archetypes", () => {
    // These are raw responses that should produce each archetype
    const cases: Array<{
      name: string;
      p1: number;
      p2: number;
      p3: number[];
      p4: number[];
      expected: string;
    }> = [
      {
        name: "field-researcher",
        p1: 0,
        p2: 2,
        p3: [2],
        p4: [1, 2, 0],
        expected: "field-researcher",
      },
      {
        name: "connector",
        p1: 0,
        p2: 2,
        p3: [0, 4],
        p4: [1, 2, 0],
        expected: "connector",
      },
      {
        name: "detective",
        p1: 2,
        p2: 0,
        p3: [2],
        p4: [2, 1, 0],
        expected: "detective",
      },
      {
        name: "pivoter",
        p1: 2,
        p2: 2,
        p3: [],
        p4: [0, 1, 2],
        expected: "pivoter",
      },
      {
        name: "quiet-anchor",
        p1: 4,
        p2: 2,
        p3: [3, 5],
        p4: [2, 1, 0],
        expected: "quiet-anchor",
      },
      {
        name: "iterator",
        p1: 4,
        p2: 2,
        p3: [3],
        p4: [0, 1, 2],
        expected: "iterator",
      },
      {
        name: "skeptical-maker",
        p1: 4,
        p2: 0,
        p3: [3],
        p4: [1, 2, 0],
        expected: "skeptical-maker",
      },
      {
        name: "gut-caller",
        p1: 2,
        p2: 4,
        p3: [0, 4],
        p4: [0, 1, 2],
        expected: "gut-caller",
      },
      {
        name: "wanderer",
        p1: 2,
        p2: 2,
        p3: [],
        p4: [],
        expected: "wanderer",
      },
    ];

    for (const tc of cases) {
      const eb = computeEBAxis(tc.p1, tc.p3);
      const sb = computeSBAxis(tc.p2);
      const sq = computeSQAxis(tc.p3);
      const pr = computePRAxis(tc.p4);
      const result = classifyArchetype({ eb, sb, sq, pr });
      expect(result.id).toBe(tc.expected);
    }
  });
});

describe("edge cases", () => {
  it("empty/invalid P3 selections handled gracefully", () => {
    expect(computeEBAxis(2, [])).toBe(0);
    expect(computeSQAxis([])).toBe(0);
    // duplicates deduplicated
    expect(computeEBAxis(2, [0, 0, 0])).toBe(computeEBAxis(2, [0]));
    expect(computeSQAxis([0, 0, 0])).toBe(computeSQAxis([0]));
    // out-of-range indices ignored
    expect(computeEBAxis(2, [8, -1, 0])).toBe(computeEBAxis(2, [0]));
    expect(computeSQAxis([8, -1, 0])).toBe(computeSQAxis([0]));
  });
});
