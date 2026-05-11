import { describe, it, expect } from "vitest";
import {
  archetypes,
  axes,
  NEUTRAL_THRESHOLD,
  computeMMAxis,
  computeSBAxis,
  computeSQAxis,
  computePRAxis,
  classifyArchetype,
  getSecondaryArchetype,
  computeActivitySignals,
  blendScores,
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
      expect([s.mm, s.sb, s.pr, s.sq].every((v) => [-1, 0, 1].includes(v))).toBe(true);
      const key = `${s.mm},${s.sb},${s.pr},${s.sq}`;
      expect(signSet.has(key)).toBe(false);
      signSet.add(key);
    }
  });

  it("wanderer has no sign pattern (or all-zero)", () => {
    const wanderer = archetypes.find((a) => a.id === "wanderer")!;
    if (wanderer.signs) {
      expect(wanderer.signs.mm).toBe(0);
      expect(wanderer.signs.sb).toBe(0);
      expect(wanderer.signs.pr).toBe(0);
      expect(wanderer.signs.sq).toBe(0);
    }
  });

  it("sign vectors match explicit enumerated table", () => {
    const table: Record<string, { mm: number; sb: number; pr: number; sq: number }> = {
      "the-empath": { mm: -1, sb: 1, pr: -1, sq: 0 },
      "the-advocate": { mm: -1, sb: 1, pr: 1, sq: 0 },
      "the-interrogator": { mm: -1, sb: -1, pr: -1, sq: 0 },
      "the-mythbuster": { mm: -1, sb: -1, pr: 1, sq: 0 },
      "the-architect": { mm: 1, sb: 1, pr: -1, sq: 0 },
      "the-synthesizer": { mm: 1, sb: 1, pr: 1, sq: 0 },
      "the-auditor": { mm: 1, sb: -1, pr: -1, sq: 0 },
      "the-pivot-forcer": { mm: 1, sb: -1, pr: 1, sq: 0 },
    };
    for (const [id, expected] of Object.entries(table)) {
      const a = archetypes.find((x) => x.id === id)!;
      expect(a.signs).toEqual(expected);
    }
  });

  it("four axis constants exported with correct poles", () => {
    expect(axes.MM).toBeDefined();
    expect(axes.SB).toBeDefined();
    expect(axes.PR).toBeDefined();
    expect(axes.SQ).toBeDefined();
    expect(axes.MM.negative.en).toBe("Micro");
    expect(axes.MM.positive.en).toBe("Macro");
    expect(axes.SB.negative.en).toBe("Skeptic");
    expect(axes.SB.positive.en).toBe("Believer");
    expect(axes.PR.negative.en).toBe("Patient");
    expect(axes.PR.positive.en).toBe("Restless");
    expect(axes.SQ.negative.en).toBe("Solo");
    expect(axes.SQ.positive.en).toBe("Squad");
  });

  it("named archetypes have persona and sqDynamic fields", () => {
    const named = archetypes.filter((a) => a.id !== "wanderer");
    for (const a of named) {
      expect(a.persona).toBeDefined();
      expect(a.persona!.en).toBeTruthy();
      expect(a.persona!.th).toBeTruthy();
      expect(a.sqDynamic).toBeDefined();
      expect(a.sqDynamic!.solo.en).toBeTruthy();
      expect(a.sqDynamic!.solo.th).toBeTruthy();
      expect(a.sqDynamic!.squad.en).toBeTruthy();
      expect(a.sqDynamic!.squad.th).toBeTruthy();
    }
  });
});

describe("axis computation", () => {
  it("computeMMAxis maps slider 0 to negative, 4 to positive, 2 to ~0", () => {
    expect(computeMMAxis(0, [])).toBeLessThan(0);
    expect(computeMMAxis(4, [])).toBeGreaterThan(0);
    expect(computeMMAxis(2, [])).toBeCloseTo(0, 5);
  });

  it("MM axis base formula: (sliderValue - 2) / 2", () => {
    expect(computeMMAxis(0, [])).toBe(-1);
    expect(computeMMAxis(1, [])).toBe(-0.5);
    expect(computeMMAxis(2, [])).toBe(0);
    expect(computeMMAxis(3, [])).toBe(0.5);
    expect(computeMMAxis(4, [])).toBe(1);
  });

  it("MM axis aggregation: baseScore + sum(P3 MM weights) clamped", () => {
    // Selecting option 0 (mm +0.40) and option 3 (mm 0)
    expect(computeMMAxis(2, [0, 3])).toBeCloseTo(0.4, 5);
    // Selecting option 2 (mm -0.40)
    expect(computeMMAxis(2, [2])).toBeCloseTo(-0.4, 5);
  });

  it("MM axis clamped to [-1, 1]", () => {
    expect(computeMMAxis(4, [0, 5])).toBe(1);
    expect(computeMMAxis(0, [2])).toBe(-1);
    expect(computeMMAxis(0, [])).toBe(-1);
    expect(computeMMAxis(4, [])).toBe(1);
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
    // option 3: +0.50, option 5: +0.20 => 0.70
    expect(computeSQAxis([3, 5])).toBeCloseTo(0.7, 5);
    // option 1: -0.50, option 4: -0.40 => -0.90
    expect(computeSQAxis([1, 4])).toBeCloseTo(-0.9, 5);
  });

  it("computeSQAxis is clamped to [-1, 1]", () => {
    expect(computeSQAxis([3, 5])).toBe(0.7);
    expect(computeSQAxis([1, 4])).toBe(-0.9);
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
    expect(computeMMAxis(100, [0, 1, 2, 3, 4, 5])).toBe(1);
    expect(computeMMAxis(-100, [])).toBe(-1);
    expect(computeSBAxis(100)).toBe(1);
    expect(computeSBAxis(-100)).toBe(-1);
    expect(computeSQAxis([3, 5])).toBe(0.7);
    expect(computeSQAxis([])).toBe(0);
    expect(computePRAxis([0, 3, 5])).toBeCloseTo(0.9167, 3);
    expect(computePRAxis([])).toBe(0);
  });

  it("non-integer slider values handled", () => {
    expect(computeMMAxis(1.5, [])).toBeCloseTo(-0.25, 5);
    expect(computeSBAxis(3.7)).toBeCloseTo(0.85, 5);
  });
});

describe("classification logic", () => {
  it("classifyArchetype exists and is deterministic", () => {
    const scores = { mm: 0.5, sb: -0.5, pr: 0.5, sq: -0.5 };
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
    const scores = { mm: 0.1, sb: -0.1, pr: 0.05, sq: -0.05 };
    expect(classifyArchetype(scores).id).toBe("wanderer");
  });

  it("wanderer returned for unmatched sign combinations", () => {
    // A sign pattern that doesn't match any named archetype
    const scores = { mm: 1, sb: 1, pr: -1, sq: -1 };
    expect(classifyArchetype(scores).id).toBe("wanderer");
  });

  it("classification boundaries are deterministic at zero", () => {
    const scores = { mm: 0, sb: 0, pr: 0, sq: 0 };
    const r = classifyArchetype(scores);
    // Zero should deterministically map to one side
    expect(r.id).toBeTruthy();
  });

  it("extreme scores classify to named archetypes", () => {
    const allPositive = { mm: 1, sb: 1, pr: 1, sq: 1 };
    expect(classifyArchetype(allPositive).id).not.toBe("wanderer");
    const allNegative = { mm: -1, sb: -1, pr: -1, sq: -1 };
    expect(classifyArchetype(allNegative).id).not.toBe("wanderer");
  });

  it("all 8 named archetypes are reachable by some scores input", () => {
    const reachability: Record<string, { mm: number; sb: number; pr: number; sq: number }> = {
      "the-empath": { mm: -1, sb: 1, pr: -1, sq: 0 },
      "the-advocate": { mm: -1, sb: 1, pr: 1, sq: 0 },
      "the-interrogator": { mm: -1, sb: -1, pr: -1, sq: 0 },
      "the-mythbuster": { mm: -1, sb: -1, pr: 1, sq: 0 },
      "the-architect": { mm: 1, sb: 1, pr: -1, sq: 0 },
      "the-synthesizer": { mm: 1, sb: 1, pr: 1, sq: 0 },
      "the-auditor": { mm: 1, sb: -1, pr: -1, sq: 0 },
      "the-pivot-forcer": { mm: 1, sb: -1, pr: 1, sq: 0 },
    };
    for (const [expectedId, scores] of Object.entries(reachability)) {
      expect(classifyArchetype(scores).id).toBe(expectedId);
    }
  });

  it("classifyArchetype handles out-of-range scores", () => {
    const scores = { mm: 1.5, sb: -2, pr: 3, sq: -0.5 };
    expect(() => classifyArchetype(scores)).not.toThrow();
    const result = classifyArchetype(scores);
    expect(archetypes.map((a) => a.id)).toContain(result.id);
  });

  it("scoring functions are pure and synchronous", () => {
    const mm1 = computeMMAxis(2, [0, 1]);
    const mm2 = computeMMAxis(2, [0, 1]);
    expect(mm1).toBe(mm2);
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
        name: "the-empath",
        p1: 0,
        p2: 4,
        p3: [],
        p4: [2, 1, 0],
        expected: "the-empath",
      },
      {
        name: "the-advocate",
        p1: 0,
        p2: 4,
        p3: [],
        p4: [0, 1, 2],
        expected: "the-advocate",
      },
      {
        name: "the-interrogator",
        p1: 0,
        p2: 0,
        p3: [],
        p4: [2, 1, 0],
        expected: "the-interrogator",
      },
      {
        name: "the-mythbuster",
        p1: 0,
        p2: 0,
        p3: [],
        p4: [0, 1, 2],
        expected: "the-mythbuster",
      },
      {
        name: "the-architect",
        p1: 4,
        p2: 4,
        p3: [],
        p4: [2, 1, 0],
        expected: "the-architect",
      },
      {
        name: "the-synthesizer",
        p1: 4,
        p2: 4,
        p3: [],
        p4: [0, 1, 2],
        expected: "the-synthesizer",
      },
      {
        name: "the-auditor",
        p1: 4,
        p2: 0,
        p3: [],
        p4: [2, 1, 0],
        expected: "the-auditor",
      },
      {
        name: "the-pivot-forcer",
        p1: 4,
        p2: 0,
        p3: [],
        p4: [0, 1, 2],
        expected: "the-pivot-forcer",
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
      const mm = computeMMAxis(tc.p1, tc.p3);
      const sb = computeSBAxis(tc.p2);
      const sq = computeSQAxis(tc.p3);
      const pr = computePRAxis(tc.p4);
      const result = classifyArchetype({ mm, sb, sq, pr });
      expect(result.id).toBe(tc.expected);
    }
  });
});

describe("secondary archetype", () => {
  it("getSecondaryArchetype returns a different archetype than primary", () => {
    const scores = { mm: -1, sb: 1, pr: -1, sq: 0 };
    const primary = classifyArchetype(scores);
    const secondary = getSecondaryArchetype(scores);
    expect(primary.id).toBe("the-empath");
    expect(secondary.id).not.toBe(primary.id);
    expect(archetypes.map((a) => a.id)).toContain(secondary.id);
  });
});

describe("activity signals", () => {
  it("computeActivitySignals returns zero signals for empty submissions", () => {
    const signals = computeActivitySignals([]);
    expect(signals.mm).toBe(0);
    expect(signals.sb).toBe(0);
    expect(signals.pr).toBe(0);
    expect(signals.sq).toBe(0);
  });

  it("computeActivitySignals detects 5+ evidence uploads as Micro", () => {
    const submissions = Array.from({ length: 5 }, (_, i) => ({
      id: `sub-${i}`,
      participant_id: "p1",
      activity_id: "a1",
      submission_type: "evidence",
      created_at: "2026-05-01T00:00:00Z",
    }));
    const signals = computeActivitySignals(submissions);
    expect(signals.mm).toBe(-0.3);
  });

  it("computeActivitySignals detects system map as Macro", () => {
    const submissions = [
      {
        id: "sub-1",
        participant_id: "p1",
        activity_id: "a1",
        submission_type: "system_map",
        created_at: "2026-05-01T00:00:00Z",
      },
    ];
    const signals = computeActivitySignals(submissions);
    expect(signals.mm).toBe(0.3);
  });

  it("computeActivitySignals detects proceed decision as Believer", () => {
    const submissions = [
      {
        id: "sub-1",
        participant_id: "p1",
        activity_id: "a1",
        submission_type: "decision",
        created_at: "2026-05-01T00:00:00Z",
        metadata: { decision: "proceed" },
      },
    ];
    const signals = computeActivitySignals(submissions);
    expect(signals.sb).toBe(0.3);
  });

  it("computeActivitySignals detects pivot decision as Skeptic", () => {
    const submissions = [
      {
        id: "sub-1",
        participant_id: "p1",
        activity_id: "a1",
        submission_type: "decision",
        created_at: "2026-05-01T00:00:00Z",
        metadata: { decision: "pivot" },
      },
    ];
    const signals = computeActivitySignals(submissions);
    expect(signals.sb).toBe(-0.3);
  });

  it("computeActivitySignals detects solo reflection as Solo", () => {
    const submissions = [
      {
        id: "sub-1",
        participant_id: "p1",
        activity_id: "a1",
        submission_type: "reflection",
        created_at: "2026-05-01T00:00:00Z",
        metadata: { solo: true },
      },
    ];
    const signals = computeActivitySignals(submissions);
    expect(signals.sq).toBe(-0.2);
  });

  it("computeActivitySignals clamps values to [-1, 1]", () => {
    const manySubmissions = Array.from({ length: 20 }, (_, i) => ({
      id: `sub-${i}`,
      participant_id: "p1",
      activity_id: "a1",
      submission_type: "evidence",
      created_at: "2026-05-01T00:00:00Z",
    }));
    const signals = computeActivitySignals(manySubmissions);
    expect(signals.mm).toBeGreaterThanOrEqual(-1);
    expect(signals.mm).toBeLessThanOrEqual(1);
  });
});

describe("blend scores", () => {
  it("blendScores applies 65/35 weight split", () => {
    const promptScores = { mm: 1, sb: 0.5, pr: -0.5, sq: 0 };
    const activitySignals = { mm: 0, sb: 0, pr: 0, sq: 0 };
    const blended = blendScores(promptScores, activitySignals);
    expect(blended.mm).toBe(0.65);
    expect(blended.sb).toBe(0.325);
    expect(blended.pr).toBe(-0.325);
    expect(blended.sq).toBe(0);
  });

  it("blendScores clamps to [-1, 1]", () => {
    const promptScores = { mm: 1, sb: 1, pr: 1, sq: 1 };
    const activitySignals = { mm: 1, sb: 1, pr: 1, sq: 1 };
    const blended = blendScores(promptScores, activitySignals);
    expect(blended.mm).toBe(1);
    expect(blended.sb).toBe(1);
    expect(blended.pr).toBe(1);
    expect(blended.sq).toBe(1);
  });
});

describe("edge cases", () => {
  it("empty/invalid P3 selections handled gracefully", () => {
    expect(computeMMAxis(2, [])).toBe(0);
    expect(computeSQAxis([])).toBe(0);
    // duplicates deduplicated
    expect(computeMMAxis(2, [0, 0, 0])).toBe(computeMMAxis(2, [0]));
    expect(computeSQAxis([0, 0, 0])).toBe(computeSQAxis([0]));
    // out-of-range indices ignored
    expect(computeMMAxis(2, [8, -1, 0])).toBe(computeMMAxis(2, [0]));
    expect(computeSQAxis([8, -1, 0])).toBe(computeSQAxis([0]));
  });
});
