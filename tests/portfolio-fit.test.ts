import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  NewPortfolioItem,
  FitScoreResult,
} from "../types/portfolio";

// ── cosineSimilarity (extracted pure function) ──────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for different-length vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it("handles normalized vectors correctly", () => {
    const a = [1 / Math.sqrt(2), 1 / Math.sqrt(2)];
    const b = [1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1 / Math.sqrt(2));
  });
});

// ── Input validation (client library logic) ─────────────────────────────

describe("portfolio item validation", () => {
  function validateNewPortfolioItem(item: NewPortfolioItem): string | null {
    if (!item.title || item.title.trim().length === 0) {
      return "Portfolio item title is required";
    }
    if (item.title.length > 200) {
      return "Title must be 200 characters or less";
    }
    if (item.description && item.description.length > 2000) {
      return "Description must be 2000 characters or less";
    }
    return null;
  }

  it("rejects empty title", () => {
    expect(
      validateNewPortfolioItem({ item_type: "project", title: "" }),
    ).toBe("Portfolio item title is required");
  });

  it("rejects whitespace-only title", () => {
    expect(
      validateNewPortfolioItem({ item_type: "project", title: "   " }),
    ).toBe("Portfolio item title is required");
  });

  it("rejects title over 200 chars", () => {
    expect(
      validateNewPortfolioItem({
        item_type: "project",
        title: "a".repeat(201),
      }),
    ).toBe("Title must be 200 characters or less");
  });

  it("accepts title at exactly 200 chars", () => {
    expect(
      validateNewPortfolioItem({
        item_type: "project",
        title: "a".repeat(200),
      }),
    ).toBeNull();
  });

  it("rejects description over 2000 chars", () => {
    expect(
      validateNewPortfolioItem({
        item_type: "project",
        title: "test",
        description: "x".repeat(2001),
      }),
    ).toBe("Description must be 2000 characters or less");
  });

  it("accepts valid item with no description", () => {
    expect(
      validateNewPortfolioItem({
        item_type: "award",
        title: "Science Award",
      }),
    ).toBeNull();
  });

  it("accepts valid item with tags", () => {
    expect(
      validateNewPortfolioItem({
        item_type: "activity",
        title: "Volunteer",
        tags: ["community", "leadership"],
      }),
    ).toBeNull();
  });
});

// ── Cache behavior ──────────────────────────────────────────────────────

describe("session cache", () => {
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  function isFresh(fetchedAt: number): boolean {
    return Date.now() - fetchedAt < CACHE_TTL_MS;
  }

  it("considers recent entry fresh", () => {
    expect(isFresh(Date.now())).toBe(true);
  });

  it("considers 23h old entry fresh", () => {
    expect(isFresh(Date.now() - 23 * 60 * 60 * 1000)).toBe(true);
  });

  it("considers 25h old entry stale", () => {
    expect(isFresh(Date.now() - 25 * 60 * 60 * 1000)).toBe(false);
  });

  it("invalidation clears user entries from map", () => {
    const cache = new Map<
      string,
      { results: FitScoreResult[]; fetchedAt: number }
    >();
    cache.set("user1:round-a,round-b", { results: [], fetchedAt: Date.now() });
    cache.set("user1:round-c", { results: [], fetchedAt: Date.now() });
    cache.set("user2:round-a", { results: [], fetchedAt: Date.now() });

    // Simulate invalidateFitScores(userId)
    for (const key of cache.keys()) {
      if (key.startsWith("user1")) cache.delete(key);
    }

    expect(cache.size).toBe(1);
    expect(cache.has("user2:round-a")).toBe(true);
  });
});

// ── Scoring algorithm logic ─────────────────────────────────────────────

describe("scoring algorithm", () => {
  it("high confidence blends 30% semantic + 70% AI", () => {
    const semanticScore = 60;
    const aiAlignmentScore = 80;
    const fitScore = Math.round(
      semanticScore * 0.3 + aiAlignmentScore * 0.7,
    );
    expect(fitScore).toBe(74);
  });

  it("low confidence blends 50% GPAX bonus + 50% semantic", () => {
    const studentGpax = 3.5;
    const semanticScore = 60;
    const gpaxBonus = Math.round((studentGpax / 4.0) * 100);
    const fitScore = Math.round(gpaxBonus * 0.5 + semanticScore * 0.5);
    expect(gpaxBonus).toBe(88);
    expect(fitScore).toBe(74);
  });

  it("GPAX gate: below min_gpax → fit_score=0", () => {
    const studentGpax: number | null = 2.5;
    const minGpax: number | null = 3.0;
    const eligibilityPass =
      !minGpax || minGpax === 0 || studentGpax === null || studentGpax >= minGpax;
    expect(eligibilityPass).toBe(false);
  });

  it("GPAX gate: null GPAX → skip gate (pass)", () => {
    const studentGpax: number | null = null;
    const minGpax: number | null = 3.0;
    const eligibilityPass =
      !minGpax || minGpax === 0 || studentGpax === null || studentGpax >= minGpax;
    expect(eligibilityPass).toBe(true);
  });

  it("GPAX gate: no min_gpax → pass", () => {
    const studentGpax: number | null = 2.0;
    const minGpax: number | null = null;
    const eligibilityPass =
      !minGpax || minGpax === 0 || studentGpax === null || studentGpax >= minGpax;
    expect(eligibilityPass).toBe(true);
  });

  it("GPAX gate: min_gpax=0 → pass", () => {
    const studentGpax: number | null = 1.0;
    const minGpax: number | null = 0;
    const eligibilityPass =
      !minGpax || minGpax === 0 || studentGpax === null || studentGpax >= minGpax;
    expect(eligibilityPass).toBe(true);
  });
});
