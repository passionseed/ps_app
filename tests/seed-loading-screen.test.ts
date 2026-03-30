import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const seedScreenSource = readFileSync(
  "/Users/bunyasit/dev/ps_app/app/seed/[id].tsx",
  "utf8",
);

describe("seed detail loading screen", () => {
  it("uses the shared animated splash instead of the green activity spinner", () => {
    expect(seedScreenSource).toContain(
      'import { AnimatedSplash } from "../components/AnimatedSplash";',
    );
    expect(seedScreenSource).toContain("if (loading) {");
    expect(seedScreenSource).toContain("return <AnimatedSplash />;");
    expect(seedScreenSource).not.toContain('<ActivityIndicator size="large" color="#BFFF00" />');
  });
});
