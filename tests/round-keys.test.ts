import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

vi.mock("react-native", () => ({ Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios } }));

import { Ink, KeyDish, Keycap, KeySize } from "../lib/theme";

/** WCAG relative luminance of an opaque #RRGGBB colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("keycap tokens (DESIGN.md section 6)", () => {
  it("keeps every legend at least 4.5:1 where it sits (the 34% and 70% dish stops)", () => {
    expect(KeyDish[1]).toBe(0.34);
    expect(KeyDish[2]).toBe(0.7);
    for (const [tone, palette] of Object.entries(Keycap)) {
      for (const stop of [palette.dish[1], palette.dish[2]]) {
        expect(contrast(palette.label, stop), `${tone} label on ${stop}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps icons at least 3:1 (graphics) on every face stop", () => {
    for (const [tone, palette] of Object.entries(Keycap)) {
      for (const stop of palette.dish) {
        expect(contrast(palette.icon, stop), `${tone} icon on ${stop}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("travels less than its wall so the edge never disappears, and keeps 44pt targets", () => {
    for (const size of Object.values(KeySize)) {
      expect(size.travel).toBeGreaterThanOrEqual(3);
      expect(size.radius).toBeLessThan(size.face / 2);
      // Small keys reach 44pt with their 4pt top and bottom hit slop.
      expect(size.face + size.travel + (size.face + size.travel < 44 ? 8 : 0)).toBeGreaterThanOrEqual(44);
    }
  });

  it("gives disabled keys an ink-3 legend and no ambient shadow", () => {
    expect(Keycap.off.label).toBe(Ink.tertiary);
    expect(Keycap.off.ambient).toBe("");
  });
});

describe("one key system on SHIFT screens", () => {
  const root = join(__dirname, "..");
  const files = (dir: string): string[] =>
    readdirSync(join(root, dir)).flatMap((name) => {
      const rel = join(dir, name);
      return statSync(join(root, rel)).isDirectory() ? files(rel) : /\.tsx$/.test(name) ? [rel] : [];
    });
  const sources = [...files("app/round"), ...files("components/round"), "app/(tabs)/shift.tsx", "app/(tabs)/squad.tsx", "app/delete-account.tsx"].map(
    (rel) => [rel, readFileSync(join(root, rel), "utf8")] as const,
  );

  it("has no Pillow or soft buttons left", () => {
    for (const [rel, source] of sources) {
      expect(source, rel).not.toMatch(/PillowButton|SoftButton|PillAction/);
    }
  });
});
