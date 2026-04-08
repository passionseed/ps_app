import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homeScreenSource = readFileSync(
  join(__dirname, "../app/(hackathon)/home.tsx"),
  "utf8",
);

const journeyScreenSource = readFileSync(
  join(__dirname, "../app/(hackathon)/journey.tsx"),
  "utf8",
);

const phaseScreenSource = readFileSync(
  join(__dirname, "../app/(hackathon)/phase/[phaseId].tsx"),
  "utf8",
);

const activityScreenSource = readFileSync(
  join(__dirname, "../app/(hackathon)/activity/[nodeId].tsx"),
  "utf8",
);

describe("hackathon preloading", () => {
  it("hydrates home and journey from cached bundle helpers", () => {
    expect(homeScreenSource).toContain("getCachedHackathonHomeBundle");
    expect(homeScreenSource).toContain("loadHackathonHomeBundle");
    expect(journeyScreenSource).toContain("getCachedHackathonJourneyBundle");
    expect(journeyScreenSource).toContain("loadHackathonJourneyBundle");
  });

  it("prefetches phase and activity screens before navigation", () => {
    expect(homeScreenSource).toContain("preloadHackathonPhaseBundle(currentPhase.id)");
    expect(journeyScreenSource).toContain("preloadHackathonPhaseBundle(card.phase.id)");
    expect(phaseScreenSource).toContain("preloadHackathonActivityBundle(activity.id)");
  });

  it("preloads adjacent hackathon activities and keeps grouped routing", () => {
    expect(activityScreenSource).toContain("preloadHackathonActivityBundle(nextId)");
    expect(activityScreenSource).toContain("preloadHackathonActivityBundle(previousId)");
    expect(activityScreenSource).toContain("router.replace(getHackathonActivityHref(nextId))");
    expect(activityScreenSource).toContain("router.replace(getHackathonActivityHref(previousId))");
  });
});
