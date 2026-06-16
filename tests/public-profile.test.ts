import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicProfile } from "../types/publicProfile";

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

function makeProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    user_id: "u1",
    handle: null,
    class_slug: null,
    subclass_slug: null,
    current_path: null,
    evolution_stage: 0,
    growth_count: 0,
    is_public: false,
    published_sections: [],
    created_at: "2026-06-12T00:00:00Z",
    updated_at: "2026-06-12T00:00:00Z",
    ...overrides,
  };
}

describe("public profile", () => {
  beforeEach(() => supabaseState.reset());

  describe("deriveIdentityStage", () => {
    it("returns seedling for a null profile", async () => {
      const { deriveIdentityStage } = await import("../lib/publicProfile");
      expect(deriveIdentityStage(null)).toBe("seedling");
    });

    it("returns seedling when no class is picked", async () => {
      const { deriveIdentityStage } = await import("../lib/publicProfile");
      expect(deriveIdentityStage(makeProfile())).toBe("seedling");
    });

    it("returns revealed once a class is picked", async () => {
      const { deriveIdentityStage } = await import("../lib/publicProfile");
      expect(
        deriveIdentityStage(makeProfile({ class_slug: "builder" })),
      ).toBe("revealed");
    });
  });

  describe("buildBecomingLine", () => {
    it("is null in the seedling state", async () => {
      const { buildBecomingLine } = await import("../lib/publicProfile");
      expect(buildBecomingLine(null)).toBeNull();
      expect(buildBecomingLine(makeProfile())).toBeNull();
    });

    it("renders class only", async () => {
      const { buildBecomingLine } = await import("../lib/publicProfile");
      expect(
        buildBecomingLine(makeProfile({ class_slug: "builder" })),
      ).toBe("A new Builder");
    });

    it("renders class + subclass", async () => {
      const { buildBecomingLine } = await import("../lib/publicProfile");
      expect(
        buildBecomingLine(
          makeProfile({ class_slug: "builder", subclass_slug: "ai-builder" }),
        ),
      ).toBe("Exploring as an Ai Builder");
    });

    it("renders the full chain with articles", async () => {
      const { buildBecomingLine } = await import("../lib/publicProfile");
      expect(
        buildBecomingLine(
          makeProfile({
            class_slug: "builder",
            subclass_slug: "ai-builder",
            current_path: "ai-product-engineer",
          }),
          {
            subclassName: "AI Builder",
            pathName: "AI Product Engineer",
          },
        ),
      ).toBe("an AI Builder becoming an AI Product Engineer");
    });

    it("drops the path clause when only ikigai/career is partial", async () => {
      const { buildBecomingLine } = await import("../lib/publicProfile");
      expect(
        buildBecomingLine(
          makeProfile({ class_slug: "strategist", current_path: "founder" }),
          { pathName: "Founder" },
        ),
      ).toBe("A new Strategist");
    });
  });

  describe("isSectionPublished", () => {
    it("is false when the profile is private", async () => {
      const { isSectionPublished } = await import("../lib/publicProfile");
      expect(
        isSectionPublished(
          makeProfile({ is_public: false, published_sections: ["ikigai"] }),
          "ikigai",
        ),
      ).toBe(false);
    });

    it("is true only for published sections when public", async () => {
      const { isSectionPublished } = await import("../lib/publicProfile");
      const p = makeProfile({
        is_public: true,
        published_sections: ["ikigai"],
      });
      expect(isSectionPublished(p, "ikigai")).toBe(true);
      expect(isSectionPublished(p, "growth")).toBe(false);
    });
  });

  describe("fetchGrowthCount", () => {
    it("returns the server count", async () => {
      supabaseState.rpc.mockResolvedValue({ data: 12, error: null });
      const { fetchGrowthCount } = await import("../lib/publicProfile");
      expect(await fetchGrowthCount("u1")).toBe(12);
    });

    it("falls back to 0 on RPC error", async () => {
      supabaseState.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
      const { fetchGrowthCount } = await import("../lib/publicProfile");
      expect(await fetchGrowthCount("u1")).toBe(0);
    });

    it("falls back to 0 when the RPC throws", async () => {
      supabaseState.rpc.mockRejectedValue(new Error("network"));
      const { fetchGrowthCount } = await import("../lib/publicProfile");
      expect(await fetchGrowthCount("u1")).toBe(0);
    });
  });
});
