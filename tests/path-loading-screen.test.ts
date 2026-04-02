import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pathScreenSource = readFileSync(
  join(__dirname, "../app/path/[enrollmentId].tsx"),
  "utf8",
);

describe("pathlab loading screen", () => {
  it("uses the shared animated splash instead of the green activity spinner", () => {
    expect(pathScreenSource).toContain(
      'import { AnimatedSplash } from "../../components/AnimatedSplash";',
    );
    expect(pathScreenSource).toContain("if (loading) {");
    expect(pathScreenSource).toContain("return <AnimatedSplash />;");
    expect(pathScreenSource).not.toContain('<ActivityIndicator size="large" color="#BFFF00" />');
  });
});
