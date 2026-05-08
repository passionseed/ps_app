import { describe, it, expect } from "vitest";
import { phase2Hints } from "./phase2Hints";
import { archetypes } from "./archetypes";

describe("phase2Hints data integrity", () => {
  it("exports exactly 9 hint sets matching archetype IDs", () => {
    const archetypeIds = archetypes.map((a) => a.id);
    const hintIds = Object.keys(phase2Hints);
    expect(hintIds).toHaveLength(9);
    for (const id of archetypeIds) {
      expect(hintIds).toContain(id);
    }
  });

  it("each archetype has superpower and growthEdge keys", () => {
    for (const id of Object.keys(phase2Hints)) {
      const hint = phase2Hints[id];
      expect(hint.superpower).toBeDefined();
      expect(hint.growthEdge).toBeDefined();
    }
  });

  it("all hint values have non-empty EN and TH strings", () => {
    for (const id of Object.keys(phase2Hints)) {
      const hint = phase2Hints[id];
      expect(hint.superpower.en).toBeTruthy();
      expect(hint.superpower.th).toBeTruthy();
      expect(hint.growthEdge.en).toBeTruthy();
      expect(hint.growthEdge.th).toBeTruthy();
      expect(typeof hint.superpower.en).toBe("string");
      expect(typeof hint.superpower.th).toBe("string");
      expect(typeof hint.growthEdge.en).toBe("string");
      expect(typeof hint.growthEdge.th).toBe("string");
      expect(hint.superpower.en.length).toBeGreaterThan(0);
      expect(hint.superpower.th.length).toBeGreaterThan(0);
      expect(hint.growthEdge.en.length).toBeGreaterThan(0);
      expect(hint.growthEdge.th.length).toBeGreaterThan(0);
    }
  });

  it("all TH hint values contain Thai characters", () => {
    for (const id of Object.keys(phase2Hints)) {
      const hint = phase2Hints[id];
      expect(/[\u0E00-\u0E7F]/.test(hint.superpower.th)).toBe(true);
      expect(/[\u0E00-\u0E7F]/.test(hint.growthEdge.th)).toBe(true);
    }
  });
});
