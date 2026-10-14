import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios } }));

import { Gem, Glow, Ink, Keycap, Surface, Violet, Wash } from "../lib/theme";

/** WCAG relative luminance and contrast of opaque #RRGGBB colours. */
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** OKLCH chroma (how saturated a colour looks), 0 for greys, ~0.25 for the old electric violet. */
function chroma(hex: string): number {
  const [r, g, b] = channels(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return Math.hypot(a, bb);
}

const canvas = Surface.canvas;
const white = "#FFFFFF";

describe("calm palette (DESIGN.md section 2, v4.2)", () => {
  it("caps accent chroma at 0.15 so violet never turns electric", () => {
    const accents = [
      ...Object.values(Violet),
      ...Gem.face,
      ...Gem.tile,
      ...Gem.orb,
      ...Gem.avatars.flat(),
      ...Glow.fill,
      ...Keycap.shift.dish,
      ...Keycap.shift.wall,
    ];
    for (const colour of accents) expect(chroma(colour), colour).toBeLessThanOrEqual(0.152);
  });

  it("keeps tints and the canvas washes quiet (chroma <= 0.06)", () => {
    for (const colour of [Violet[50], Violet[100], Violet[200], Wash.topRight, Wash.left, Surface.line]) {
      expect(chroma(colour), colour).toBeLessThanOrEqual(0.06);
    }
  });

  it("uses soft ink, not near-black, and still clears the reading thresholds", () => {
    expect(contrast(Ink.primary, canvas)).toBeLessThan(14);
    expect(contrast(Ink.primary, canvas)).toBeGreaterThanOrEqual(12);
    expect(contrast(Ink.secondary, Wash.topRight)).toBeGreaterThanOrEqual(7);
    expect(contrast(Ink.tertiary, Wash.topRight)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(Violet[700], white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(Violet[700], Wash.topRight)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(Surface.control, white)).toBeGreaterThanOrEqual(3);
  });

  it("keeps white text readable on every violet that carries it", () => {
    expect(contrast(white, Violet[600])).toBeGreaterThanOrEqual(4.5);
    for (const [a, b] of [Gem.face, ...Gem.avatars]) {
      // Text sits mid-gradient; both ends must still clear 3:1 and the darker end 4.5:1.
      expect(contrast(white, a), a).toBeGreaterThanOrEqual(3);
      expect(contrast(white, b), b).toBeGreaterThanOrEqual(4.5);
    }
  });
});
