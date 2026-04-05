import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const journeyScreenSource = readFileSync(
  join(__dirname, "../app/(hackathon)/journey.tsx"),
  "utf8",
);

const phaseActivityLibSource = readFileSync(
  join(__dirname, "../lib/hackathonPhaseActivity.ts"),
  "utf8",
);
const summaryHelperSource = phaseActivityLibSource.split(
  "export async function getProgramPhaseActivitySummaries",
)[1] ?? "";

describe("hackathon journey loading", () => {
  it("uses the lightweight activity summary query for phase cards", () => {
    expect(journeyScreenSource).toContain("getProgramPhaseActivitySummaries");
    expect(journeyScreenSource).not.toContain("getProgramPhasesWithActivities");
    expect(journeyScreenSource).not.toContain("JSON.stringify(home)");
    expect(phaseActivityLibSource).toContain(
      "export async function getProgramPhaseActivitySummaries",
    );
    expect(summaryHelperSource).not.toContain("hackathon_phase_activity_content");
    expect(summaryHelperSource).not.toContain("hackathon_phase_activity_assessments");
  });

  it("shows the jellyfish skia loader while the journey screen is loading", () => {
    expect(journeyScreenSource).toContain("HackathonJellyfishLoader");
    expect(journeyScreenSource).toContain("<HackathonJellyfishLoader />");
    expect(journeyScreenSource).toContain("Loading your journey...");
  });
});
