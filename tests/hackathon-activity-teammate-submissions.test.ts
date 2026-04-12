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

  it("always renders the teammate section and keeps individual work blurred until self submission", () => {
    expect(activityScreenSource).toContain("const hasAnySubmission = pastSubmissions.length > 0;");
    expect(activityScreenSource).toContain('activity?.submission_scope === "team"');
    expect(activityScreenSource).toContain("const showTeammateSubmissions = true;");
    expect(activityScreenSource).toContain("const blurTeammateSubmissions = !isTeamSubmissionActivity && !hasAnySubmission;");
    expect(activityScreenSource).toContain("showTeammateSubmissions ? (");
    expect(activityScreenSource).toContain("blurred={blurTeammateSubmissions}");
    expect(activityScreenSource).toContain("ส่งของตัวเองก่อนเพื่อดูรายละเอียด");
    expect(activityScreenSource).toContain("ผลงานของเพื่อนร่วมทีม");
  });
});
