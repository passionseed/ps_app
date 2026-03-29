import { describe, expect, it } from "vitest";

import type { ProgramPlannerCandidate } from "../types/tcas";
import {
  buildPlannerReason,
  buildPlannerSections,
  rankPlannerCandidates,
} from "../lib/tcasPlanner";

function makeCandidate(
  overrides: Partial<ProgramPlannerCandidate>,
): ProgramPlannerCandidate {
  const baseRound = {
    round_id: "round-1",
    round_number: 1,
    round_type: "portfolio",
    project_name: "Portfolio",
    receive_seats: 40,
    min_gpax: 3.2,
    folio_closed_date: "2099-01-10T00:00:00.000Z",
    link: "https://example.com",
    has_requirements: false,
    is_eligible: true,
    deadline_status: "open" as const,
    days_until_deadline: 15,
  };

  return {
    program_id: "prog-1",
    program_name: "วิศวกรรมคอมพิวเตอร์",
    program_name_en: "Computer Engineering",
    faculty_name: "วิศวกรรมศาสตร์",
    faculty_name_en: "Engineering",
    field_name: "คอมพิวเตอร์",
    field_name_en: "Computer",
    program_type: "bachelor",
    program_type_name: "หลักสูตรปริญญาตรี",
    university_id: "uni-1",
    university_name: "จุฬาลงกรณ์มหาวิทยาลัย",
    university_name_en: "Chulalongkorn University",
    description_th: "หลักสูตรด้านคอมพิวเตอร์และซอฟต์แวร์",
    total_seats: 120,
    cost: "45000",
    degree_level: "ปริญญาตรี",
    has_embedding: true,
    has_requirements: false,
    round_numbers: [1, 3],
    best_round: baseRound,
    score_breakdown: {
      exact: 0,
      prefix: 0,
      text: 0,
      semantics: 0,
      availability: 0,
      profile: 0,
      penalties: 0,
      total: 0,
    },
    rationale: "",
    tradeoff_summary: "",
    ...overrides,
  };
}

describe("rankPlannerCandidates", () => {
  it("keeps exact program matches ahead of semantically stronger but fuzzier results", () => {
    const exact = makeCandidate({
      program_id: "exact",
      program_name: "วิศวกรรมคอมพิวเตอร์",
      best_round: { ...makeCandidate({}).best_round!, min_gpax: 3.0 },
    });

    const fuzzy = makeCandidate({
      program_id: "fuzzy",
      program_name: "วิศวกรรมปัญญาประดิษฐ์",
      field_name: "AI",
      description_th: "คอมพิวเตอร์ ซอฟต์แวร์ โค้ด ระบบอัจฉริยะ",
      best_round: { ...makeCandidate({}).best_round!, min_gpax: 2.5 },
      has_requirements: true,
    });

    const ranked = rankPlannerCandidates([fuzzy, exact], "วิศวกรรมคอมพิวเตอร์", {
      userGpax: 3.4,
      nowIso: "2099-01-01T00:00:00.000Z",
    });

    expect(ranked[0]?.program_id).toBe("exact");
    expect(ranked[0]?.score_breakdown.exact).toBeGreaterThan(
      ranked[1]?.score_breakdown.exact ?? 0,
    );
  });

  it("demotes programs that are impossible for the user's GPAX", () => {
    const eligible = makeCandidate({
      program_id: "eligible",
      best_round: { ...makeCandidate({}).best_round!, min_gpax: 2.5, is_eligible: true },
    });

    const impossible = makeCandidate({
      program_id: "impossible",
      best_round: {
        ...makeCandidate({}).best_round!,
        min_gpax: 3.9,
        is_eligible: false,
      },
    });

    const ranked = rankPlannerCandidates([impossible, eligible], "วิศวกรรม", {
      userGpax: 2.8,
      nowIso: "2099-01-01T00:00:00.000Z",
    });

    expect(ranked[0]?.program_id).toBe("eligible");
    expect(ranked[1]?.score_breakdown.penalties).toBeLessThan(0);
  });

  it("demotes expired rounds even when the text is relevant", () => {
    const open = makeCandidate({
      program_id: "open",
      best_round: {
        ...makeCandidate({}).best_round!,
        folio_closed_date: "2099-01-15T00:00:00.000Z",
        deadline_status: "open",
        days_until_deadline: 14,
      },
    });

    const expired = makeCandidate({
      program_id: "expired",
      best_round: {
        ...makeCandidate({}).best_round!,
        folio_closed_date: "2098-12-20T00:00:00.000Z",
        deadline_status: "expired",
        days_until_deadline: -12,
      },
    });

    const ranked = rankPlannerCandidates([expired, open], "วิศวกรรม", {
      userGpax: 3.5,
      nowIso: "2099-01-01T00:00:00.000Z",
    });

    expect(ranked[0]?.program_id).toBe("open");
    expect(ranked[1]?.score_breakdown.penalties).toBeLessThan(0);
  });

  it("uses university_id as a deterministic tie-breaker", () => {
    const b = makeCandidate({
      program_id: "b",
      university_id: "uni-b",
      university_name: "University B",
      program_name: "Business Administration",
      program_name_en: "Business Administration",
      faculty_name: "Business",
      faculty_name_en: "Business",
      field_name: "Business",
      field_name_en: "Business",
    });

    const a = makeCandidate({
      program_id: "a",
      university_id: "uni-a",
      university_name: "University A",
      program_name: "Business Administration",
      program_name_en: "Business Administration",
      faculty_name: "Business",
      faculty_name_en: "Business",
      field_name: "Business",
      field_name_en: "Business",
    });

    const ranked = rankPlannerCandidates([b, a], "business administration", {
      userGpax: 3.5,
      nowIso: "2099-01-01T00:00:00.000Z",
    });

    expect(ranked.map((candidate) => candidate.university_id)).toEqual([
      "uni-a",
      "uni-b",
    ]);
  });
});

describe("buildPlannerSections", () => {
  it("creates discovery-led sections for an empty query", () => {
    const candidates = [
      makeCandidate({
        program_id: "best",
        has_requirements: true,
        best_round: {
          ...makeCandidate({}).best_round,
          is_eligible: true,
          deadline_status: "open",
        },
      }),
      makeCandidate({
        program_id: "hidden",
        university_name: "มหาวิทยาลัยเชียงใหม่",
        cost: "18000",
        has_requirements: false,
      }),
      makeCandidate({
        program_id: "prestige",
        university_name: "จุฬาลงกรณ์มหาวิทยาลัย",
        cost: "80000",
      }),
    ];

    const sections = buildPlannerSections(candidates, "", {
      userGpax: 3.5,
      isThai: true,
    });

    expect(sections.map((section) => section.key)).toEqual([
      "best-matches",
      "hidden-gems",
      "prestige-vs-fit",
    ]);
  });

  it("uses a single search-results section for explicit queries", () => {
    const sections = buildPlannerSections(
      [makeCandidate({ program_id: "search-1" })],
      "computer engineering",
      { userGpax: 3.5, isThai: false },
    );

    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe("search-results");
  });
});

describe("buildPlannerReason", () => {
  it("surfaces a Thai rationale using GPAX, round, and portfolio-fit signals", () => {
    const candidate = makeCandidate({
      has_requirements: true,
      best_round: {
        ...makeCandidate({}).best_round!,
        round_number: 1,
        is_eligible: true,
      },
    });

    expect(buildPlannerReason(candidate, true)).toContain("GPAX");
    expect(buildPlannerReason(candidate, true)).toContain("รอบ 1");
    expect(buildPlannerReason(candidate, true)).toContain("พอร์ต");
  });

  it("degrades gracefully in English when fit data is sparse", () => {
    const candidate = makeCandidate({
      has_requirements: false,
      best_round: {
        ...makeCandidate({}).best_round!,
        round_number: 3,
        is_eligible: false,
      },
    });

    expect(buildPlannerReason(candidate, false)).toContain("Round 3");
    expect(buildPlannerReason(candidate, false)).toContain("eligibility");
  });
});
