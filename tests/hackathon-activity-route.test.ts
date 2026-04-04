import { describe, expect, it } from "vitest";

import { getHackathonActivityHref } from "../lib/hackathonActivityRoute";

describe("getHackathonActivityHref", () => {
  it("builds the grouped hackathon activity pathname with params", () => {
    expect(getHackathonActivityHref("activity-123")).toEqual({
      pathname: "/(hackathon)/activity/[nodeId]",
      params: { nodeId: "activity-123" },
    });
  });
});
