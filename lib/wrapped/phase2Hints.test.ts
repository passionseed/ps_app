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

  it("each archetype has exactly 5 hint keys", () => {
    const expectedKeys = ["interview", "build", "pitch", "decide", "synthesize"];
    for (const id of Object.keys(phase2Hints)) {
      const hint = phase2Hints[id];
      const keys = Object.keys(hint);
      expect(keys).toHaveLength(5);
      for (const k of expectedKeys) {
        expect(keys).toContain(k);
      }
    }
  });

  it("all hint values are non-empty Thai strings", () => {
    for (const id of Object.keys(phase2Hints)) {
      const hint = phase2Hints[id];
      for (const key of Object.keys(hint) as Array<keyof typeof hint>) {
        const value = hint[key];
        expect(value).toBeTruthy();
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
        // Contains Thai characters (Unicode range for Thai)
        expect(/[\u0E00-\u0E7F]/.test(value)).toBe(true);
      }
    }
  });
});
