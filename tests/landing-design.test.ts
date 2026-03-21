import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const landingSource = readFileSync(
  "/Users/bunyasit/dev/ps_app/app/index.tsx",
  "utf8",
);

describe("landing page design", () => {
  it("does not render decorative background orbs", () => {
    expect(landingSource).not.toContain("styles.orb");
    expect(landingSource).not.toContain("Floating accent orbs");
  });
});
