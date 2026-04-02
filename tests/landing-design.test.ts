import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const landingSource = readFileSync(
  "app/index.tsx",
  "utf8",
);
const glassCardSource = readFileSync(
  "components/Glass/GlassCard.tsx",
  "utf8",
);

describe("landing page design", () => {
  it("does not render decorative background orbs", () => {
    expect(landingSource).not.toContain("styles.orb");
    expect(landingSource).not.toContain("Floating accent orbs");
  });

  it("lets the landing logo overlap the card while preserving the full card outline", () => {
    expect(glassCardSource).toContain('overflow: "visible"');
    expect(glassCardSource).toContain("styles.surface");
    expect(glassCardSource).toContain("styles.borderOverlay");
    expect(glassCardSource).toContain('overflow: "hidden"');
    expect(landingSource).toContain("marginBottom: -36");
    expect(landingSource).toContain("<View style={styles.cardTopSpacer} />");
    expect(landingSource).toContain("height: 12");
    expect(landingSource).toContain('resizeMode="contain"');
    expect(landingSource).toContain('overflow: "visible"');
  });
});
