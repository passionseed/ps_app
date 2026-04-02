import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const activityScreenSource = readFileSync(
  join(__dirname, "../app/activity/[activityId].tsx"),
  "utf8",
);

describe("learning activity layout", () => {
  it("keeps horizontal padding on the main scroll content", () => {
    expect(activityScreenSource).toContain("scrollContent: {");
    expect(activityScreenSource).toContain("padding: 20,");
    expect(activityScreenSource).not.toContain("paddingHorizontal: 0,");
  });
});
