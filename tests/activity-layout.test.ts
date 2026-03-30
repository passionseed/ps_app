import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const activityScreenSource = readFileSync(
  "/Users/bunyasit/dev/ps_app/app/activity/[activityId].tsx",
  "utf8",
);

describe("learning activity layout", () => {
  it("keeps horizontal padding on the main scroll content", () => {
    expect(activityScreenSource).toContain("scrollContent: {");
    expect(activityScreenSource).toContain("padding: 20,");
    expect(activityScreenSource).not.toContain("paddingHorizontal: 0,");
  });
});
