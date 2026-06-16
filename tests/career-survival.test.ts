import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = {
  rpc: vi.fn(),
  reset() {
    supabaseState.rpc.mockReset();
  },
};

vi.mock("../lib/supabase", () => ({
  supabase: {
    rpc: supabaseState.rpc,
  },
}));

vi.mock("expo-sqlite/localStorage/install", () => ({}));

describe("career survival", () => {
  beforeEach(() => {
    supabaseState.reset();
  });

  describe("normalizeCareerSlug", () => {
    it("converts Software Engineer to software-engineer", async () => {
      const { normalizeCareerSlug } = await import("../lib/careerSurvival");
      expect(normalizeCareerSlug("Software Engineer")).toBe("software-engineer");
    });

    it("trims and collapses extra spaces for Data Scientist", async () => {
      const { normalizeCareerSlug } = await import("../lib/careerSurvival");
      expect(normalizeCareerSlug("  Data  Scientist  ")).toBe("data-scientist");
    });

    it("replaces special chars with hyphens for AI/ML Researcher", async () => {
      const { normalizeCareerSlug } = await import("../lib/careerSurvival");
      expect(normalizeCareerSlug("AI/ML Researcher")).toBe("ai-ml-researcher");
    });

    it("lowercases Thai text without changing characters", async () => {
      const { normalizeCareerSlug } = await import("../lib/careerSurvival");
      expect(normalizeCareerSlug("วิศวกรซอฟต์แวร์")).toBe("วิศวกรซอฟต์แวร์");
    });
  });

  describe("parseSurvivalVerdict", () => {
    it("parses a valid row into CareerSurvival", async () => {
      const { parseSurvivalVerdict } = await import("../lib/careerSurvival");
      const row = {
        slug: "software-engineer",
        aliases: ["programmer", "coder"],
        tier: "growing",
        reasoning: "High demand across industries.",
        sources: [
          { title: "BLS Report", url: "https://bls.gov", author: "BLS", date: "2026-01-01" },
        ],
        insights: [],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: "product-manager",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
      };

      const result = parseSurvivalVerdict(row);
      expect(result).toEqual({
        slug: "software-engineer",
        aliases: ["programmer", "coder"],
        tier: "growing",
        reasoning: "High demand across industries.",
        sources: [{ title: "BLS Report", url: "https://bls.gov", author: "BLS", date: "2026-01-01" }],
        insights: [],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: "product-manager",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
      });
    });

    it("returns null for invalid tier", async () => {
      const { parseSurvivalVerdict } = await import("../lib/careerSurvival");
      const row = {
        slug: "software-engineer",
        aliases: [],
        tier: "unknown",
        reasoning: "...",
        sources: [{ title: "X", url: "https://x.com" }],
        insights: [],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      expect(parseSurvivalVerdict(row)).toBeNull();
    });

    it("returns null for missing required fields", async () => {
      const { parseSurvivalVerdict } = await import("../lib/careerSurvival");
      expect(parseSurvivalVerdict({})).toBeNull();
      expect(parseSurvivalVerdict({ slug: "x" })).toBeNull();
      expect(parseSurvivalVerdict({ slug: "x", reasoning: "y" })).toBeNull();
    });

    it("returns null when a source is missing url", async () => {
      const { parseSurvivalVerdict } = await import("../lib/careerSurvival");
      const row = {
        slug: "software-engineer",
        aliases: [],
        tier: "growing",
        reasoning: "...",
        sources: [{ title: "Valid", url: "https://valid.com" }, { title: "Invalid" }],
        insights: [],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      expect(parseSurvivalVerdict(row)).toBeNull();
    });

    it("accepts empty sources array", async () => {
      const { parseSurvivalVerdict } = await import("../lib/careerSurvival");
      const row = {
        slug: "software-engineer",
        aliases: [],
        tier: "growing",
        reasoning: "...",
        sources: [],
        insights: [],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      const result = parseSurvivalVerdict(row);
      expect(result).not.toBeNull();
      expect(result!.sources).toEqual([]);
      expect(result!.insights).toEqual([]);
      expect(result!.ai_impact).toBeNull();
      expect(result!.specialty_tracks).toEqual([]);
      expect(result!.future_opportunities).toEqual([]);
    });
  });

  describe("getCareerSurvival", () => {
    it("returns parsed CareerSurvival on successful RPC", async () => {
      const { getCareerSurvival } = await import("../lib/careerSurvival");
      const row = {
        slug: "software-engineer",
        aliases: [],
        tier: "growing",
        reasoning: "...",
        sources: [{ title: "X", url: "https://x.com" }],
        insights: [],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      supabaseState.rpc.mockResolvedValue({ data: row, error: null });

      const result = await getCareerSurvival({ rpc: supabaseState.rpc } as any, "Software Engineer");
      expect(result).toEqual({
        slug: "software-engineer",
        aliases: [],
        tier: "growing",
        reasoning: "...",
        sources: [{ title: "X", url: "https://x.com" }],
        insights: [],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      });
    });

    it("returns null when RPC returns null", async () => {
      const { getCareerSurvival } = await import("../lib/careerSurvival");
      supabaseState.rpc.mockResolvedValue({ data: null, error: null });

      const result = await getCareerSurvival({ rpc: supabaseState.rpc } as any, "Unknown Job");
      expect(result).toBeNull();
    });

    it("parses full row with ai_impact, tracks, and future ops", async () => {
      const { parseSurvivalVerdict } = await import("../lib/careerSurvival");
      const row = {
        slug: "software-engineer",
        aliases: ["programmer"],
        tier: "growing",
        reasoning: "High demand.",
        sources: [{ title: "X", url: "https://x.com" }],
        insights: [{ category: "skills", content: "Python", priority: 1 }],
        ai_impact: {
          automation_risk: 3,
          tools_to_master: ["Claude Code", "Copilot"],
          augmented_tasks: "Coding faster",
          automated_tasks: "Basic scripts",
        },
        specialty_tracks: [
          { name: "Backend", description: "APIs", demand_level: "high", salary_premium: "+30%" },
        ],
        future_opportunities: [
          { role: "Architect", description: "Design systems", timeline: "5-7 years", transition_difficulty: "medium" },
        ],
        escape_route_slug: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      const result = parseSurvivalVerdict(row);
      expect(result).not.toBeNull();
      expect(result!.ai_impact).toEqual({
        automation_risk: 3,
        tools_to_master: ["Claude Code", "Copilot"],
        augmented_tasks: "Coding faster",
        automated_tasks: "Basic scripts",
      });
      expect(result!.specialty_tracks).toHaveLength(1);
      expect(result!.future_opportunities).toHaveLength(1);
    });

    it("returns null when RPC throws error (does not propagate)", async () => {
      const { getCareerSurvival } = await import("../lib/careerSurvival");
      supabaseState.rpc.mockRejectedValue(new Error("Network failure"));

      const result = await getCareerSurvival({ rpc: supabaseState.rpc } as any, "Y");
      expect(result).toBeNull();
    });

    it("returns parsed result when alias matches", async () => {
      const { getCareerSurvival } = await import("../lib/careerSurvival");
      const row = {
        slug: "software-engineer",
        aliases: ["programmer", "coder"],
        tier: "growing",
        reasoning: "...",
        sources: [{ title: "X", url: "https://x.com" }],
        insights: [{ category: "skills", content: "Python", priority: 1 }],
        ai_impact: null,
        specialty_tracks: [],
        future_opportunities: [],
        escape_route_slug: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      supabaseState.rpc.mockResolvedValue({ data: row, error: null });

      const result = await getCareerSurvival({ rpc: supabaseState.rpc } as any, "programmer");
      expect(result).toMatchObject({ slug: "software-engineer", aliases: ["programmer", "coder"], insights: [{ category: "skills", content: "Python", priority: 1 }] });
    });
  });
});
