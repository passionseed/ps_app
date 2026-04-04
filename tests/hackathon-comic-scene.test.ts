import { describe, expect, it } from "vitest";

import { getHackathonComicPanelPhase } from "../lib/hackathonComicScene";

describe("getHackathonComicPanelPhase", () => {
  it("returns near zero when a panel is centered in the viewport", () => {
    const phase = getHackathonComicPanelPhase({
      scrollY: 400,
      panelTop: 400,
      panelHeight: 600,
      viewportHeight: 600,
    });

    expect(phase).toBeCloseTo(0, 5);
  });

  it("returns positive when the panel is still below center and negative after it passes", () => {
    expect(
      getHackathonComicPanelPhase({
        scrollY: 0,
        panelTop: 600,
        panelHeight: 600,
        viewportHeight: 600,
      }),
    ).toBeGreaterThan(0);

    expect(
      getHackathonComicPanelPhase({
        scrollY: 900,
        panelTop: 600,
        panelHeight: 600,
        viewportHeight: 600,
      }),
    ).toBeLessThan(0);
  });
});
