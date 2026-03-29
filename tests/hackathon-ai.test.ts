import { describe, expect, it } from "vitest";

import {
  buildPainPointFeedbackInput,
  getPainPointFeedbackVerdictLabel,
} from "../lib/hackathonAi";

describe("buildPainPointFeedbackInput", () => {
  it("trims and filters empty evidence lines before sending feedback requests", () => {
    expect(
      buildPainPointFeedbackInput({
        problemStatement: "  Nurses lose time to manual triage handoffs.  ",
        customer: "  ER nurses in medium-sized hospitals ",
        evidenceText:
          "Interviewed 3 nurses\n\nObserved shift handoff delays  \n  \nCharting duplication appears daily",
      }),
    ).toEqual({
      problemStatement: "Nurses lose time to manual triage handoffs.",
      customer: "ER nurses in medium-sized hospitals",
      evidenceBullets: [
        "Interviewed 3 nurses",
        "Observed shift handoff delays",
        "Charting duplication appears daily",
      ],
    });
  });
});

describe("getPainPointFeedbackVerdictLabel", () => {
  it("returns stable UI labels for edge function verdicts", () => {
    expect(getPainPointFeedbackVerdictLabel("pass")).toBe("Ready for team refinement");
    expect(getPainPointFeedbackVerdictLabel("revise")).toBe("Needs another iteration");
  });
});
