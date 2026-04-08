import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const journeyScreenSource = readFileSync(
  join(__dirname, "../app/(hackathon)/journey.tsx"),
  "utf8",
);

describe("hackathon journey alien button", () => {
  it("tracks participant-aware alien button clicks before opening the link", () => {
    expect(journeyScreenSource).toContain("trackHackathonAlienButtonClick");
    expect(journeyScreenSource).toContain('source: "journey_header_alien_button"');
    expect(journeyScreenSource).toContain("teamId: data.team?.id ?? null");
    expect(journeyScreenSource).toContain("targetUrl: ALIEN_VIDEO_URL");
    expect(journeyScreenSource).toContain("void Linking.openURL(ALIEN_VIDEO_URL)");
  });
});
