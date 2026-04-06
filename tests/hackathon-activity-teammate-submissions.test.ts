import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const activityScreenSource = readFileSync(
  join(root, "app/(hackathon)/activity/[nodeId].tsx"),
  "utf8",
);

describe("hackathon activity teammate submissions", () => {
  it("loads teammate submissions alongside the current participant submissions", () => {
    expect(activityScreenSource).toContain("fetchTeammateActivitySubmissions");
    expect(activityScreenSource).toContain("const [teammateSubmissions, setTeammateSubmissions] = useState");
    expect(activityScreenSource).toContain("Promise.all([");
    expect(activityScreenSource).toContain("fetchTeammateActivitySubmissions(nodeId!)");
  });

  it("reveals the teammate section only after the participant has submitted", () => {
    expect(activityScreenSource).toContain("const showTeammateSubmissions = pastSubmissions.length > 0;");
    expect(activityScreenSource).toContain("showTeammateSubmissions ? (");
    expect(activityScreenSource).toContain("ผลงานของเพื่อนร่วมทีม");
  });
});
