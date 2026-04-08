import { describe, expect, it } from "vitest";

import { computeTeamRank } from "../lib/hackathonRanking";

describe("hackathon team ranking", () => {
  it("gives tied teams the same rank", () => {
    const rankA = computeTeamRank(
      "team-a",
      ["team-a", "team-b", "team-c"],
      [
        { team_id: "team-a", total_score: 100 },
        { team_id: "team-b", total_score: 100 },
        { team_id: "team-c", total_score: 120 },
      ],
    );

    const rankB = computeTeamRank(
      "team-b",
      ["team-a", "team-b", "team-c"],
      [
        { team_id: "team-a", total_score: 100 },
        { team_id: "team-b", total_score: 100 },
        { team_id: "team-c", total_score: 120 },
      ],
    );

    expect(rankA).toBe(2);
    expect(rankB).toBe(2);
  });

  it("assigns a rank to teams with no score row yet", () => {
    const rank = computeTeamRank(
      "team-c",
      ["team-a", "team-b", "team-c"],
      [
        { team_id: "team-a", total_score: 50 },
        { team_id: "team-b", total_score: 0 },
      ],
    );

    expect(rank).toBe(2);
  });

  it("treats missing and zero scores as tied", () => {
    const zeroRank = computeTeamRank(
      "team-b",
      ["team-a", "team-b", "team-c"],
      [
        { team_id: "team-a", total_score: 50 },
        { team_id: "team-b", total_score: 0 },
      ],
    );

    const missingRank = computeTeamRank(
      "team-c",
      ["team-a", "team-b", "team-c"],
      [
        { team_id: "team-a", total_score: 50 },
        { team_id: "team-b", total_score: 0 },
      ],
    );

    expect(zeroRank).toBe(2);
    expect(missingRank).toBe(2);
  });
});
