import { describe, it, expect } from "vitest";
import { prompts, p3Options } from "./prompts";

describe("prompts data integrity", () => {
  it("exports exactly 6 prompts with unique IDs p1-p6", () => {
    expect(prompts).toHaveLength(6);
    const ids = prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids).toContain("p1");
    expect(ids).toContain("p2");
    expect(ids).toContain("p3");
    expect(ids).toContain("p4");
    expect(ids).toContain("p5");
    expect(ids).toContain("p6");
  });

  it("each prompt has non-empty EN and TH question text", () => {
    for (const prompt of prompts) {
      expect(prompt.question.en).toBeTruthy();
      expect(prompt.question.en.length).toBeGreaterThan(0);
      expect(prompt.question.th).toBeTruthy();
      expect(prompt.question.th.length).toBeGreaterThan(0);
    }
  });

  it("Prompt 1 is slider 0-4 driving MM axis", () => {
    const p1 = prompts.find((p) => p.id === "p1")!;
    expect(p1.type).toBe("slider");
    expect(p1.min).toBe(0);
    expect(p1.max).toBe(4);
    expect(p1.axis).toBe("MM");
    expect(p1.labels?.en?.left).toBeTruthy();
    expect(p1.labels?.en?.right).toBeTruthy();
    expect(p1.labels?.th?.left).toBeTruthy();
    expect(p1.labels?.th?.right).toBeTruthy();
  });

  it("Prompt 2 is slider 0-4 driving SB axis", () => {
    const p2 = prompts.find((p) => p.id === "p2")!;
    expect(p2.type).toBe("slider");
    expect(p2.min).toBe(0);
    expect(p2.max).toBe(4);
    expect(p2.axis).toBe("SB");
    expect(p2.labels?.en?.left).toBeTruthy();
    expect(p2.labels?.th?.left).toBeTruthy();
    expect(p2.labels?.en?.right).toBeTruthy();
    expect(p2.labels?.th?.right).toBeTruthy();
  });

  it("Prompt 3 is multi-select with 6 options and dual axis weights", () => {
    const p3 = prompts.find((p) => p.id === "p3")!;
    expect(p3.type).toBe("multi-select");
    expect(p3.axis).toBe("SQ");
    expect(p3.secondaryAxis).toBe("MM");
    expect(p3Options).toHaveLength(6);
    const sqWeights = p3Options.map((o) => o.sq);
    expect(sqWeights).toEqual([0, -0.5, 0.1, 0.5, -0.4, 0.2]);
    const mmWeights = p3Options.map((o) => o.mm);
    expect(mmWeights).toEqual([0.4, 0, -0.4, 0, -0.2, 0.3]);
    for (const opt of p3Options) {
      expect(opt.en).toBeTruthy();
      expect(opt.th).toBeTruthy();
    }
  });

  it("Prompt 4 has drag-rank type with pickCount 3 and 6 items", () => {
    const p4 = prompts.find((p) => p.id === "p4")!;
    expect(p4.type).toBe("drag-rank");
    expect(p4.pickCount).toBe(3);
    expect(p4.axis).toBe("PR");
    expect(p4.items).toBeInstanceOf(Array);
    expect(p4.items!.length).toBe(6);
    for (const item of p4.items!) {
      expect(item.en).toBeTruthy();
      expect(item.th).toBeTruthy();
      expect(typeof item.pr).toBe("number");
    }
  });

  it("Prompt 5 is optional text with no scoring", () => {
    const p5 = prompts.find((p) => p.id === "p5")!;
    expect(p5.type).toBe("text");
    expect(p5.optional).toBe(true);
    expect(p5.axis).toBeUndefined();
  });

  it("Prompt 6 is optional text with maxLength 80", () => {
    const p6 = prompts.find((p) => p.id === "p6")!;
    expect(p6.type).toBe("text");
    expect(p6.optional).toBe(true);
    expect(p6.maxLength).toBe(80);
    expect(p6.axis).toBeUndefined();
  });

  it("Prompts 1-4 have bgmPrompt; Prompts 5-6 lack one", () => {
    for (const id of ["p1", "p2", "p3", "p4"]) {
      const p = prompts.find((x) => x.id === id)!;
      expect(p.bgmPrompt).toBeTruthy();
      expect(p.bgmPrompt!.startsWith("mmx music generate:")).toBe(true);
      expect(p.bgmPrompt!.length).toBeGreaterThan(50 + "mmx music generate:".length);
    }
    const p5 = prompts.find((p) => p.id === "p5")!;
    expect(p5.bgmPrompt === null || p5.bgmPrompt === undefined).toBe(true);
    const p6 = prompts.find((p) => p.id === "p6")!;
    expect(p6.bgmPrompt === null || p6.bgmPrompt === undefined).toBe(true);
  });

  it("prompts export is indexable by ID", () => {
    const byId: Record<string, (typeof prompts)[number]> = {};
    for (const p of prompts) {
      byId[p.id] = p;
    }
    expect(byId["p1"]).toBeDefined();
    expect(byId["p2"]).toBeDefined();
    expect(byId["p3"]).toBeDefined();
    expect(byId["p4"]).toBeDefined();
    expect(byId["p5"]).toBeDefined();
    expect(byId["p6"]).toBeDefined();
  });
});
