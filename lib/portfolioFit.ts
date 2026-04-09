// lib/portfolioFit.ts
import { supabase } from "./supabase";
import { storage } from "./storage";
import type {
  StudentPortfolioItem,
  NewPortfolioItem,
  FitScoreResult,
} from "../types/portfolio";

// Session-level cache — same pattern as universityInsights.ts
const sessionCache = new Map<
  string,
  { results: FitScoreResult[]; fetchedAt: number }
>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

// ============ Portfolio Items Cache ============
const PORTFOLIO_ITEMS_CACHE_KEY_PREFIX = "portfolio-items-cache";
const PORTFOLIO_ITEMS_CACHE_TTL_MS = 5 * 60 * 1000;
const PORTFOLIO_ITEMS_CACHE_SCHEMA_VERSION = 1;

type PortfolioItemsCacheEntry = {
  version: number;
  userId: string;
  cachedAt: string;
  items: StudentPortfolioItem[];
};

const portfolioMemoryCache = new Map<string, PortfolioItemsCacheEntry>();

function getPortfolioCacheKey(userId: string): string {
  return `${PORTFOLIO_ITEMS_CACHE_KEY_PREFIX}/${userId}`;
}

function isValidPortfolioCacheEntry(value: unknown): value is PortfolioItemsCacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<PortfolioItemsCacheEntry>;
  return (
    entry.version === PORTFOLIO_ITEMS_CACHE_SCHEMA_VERSION &&
    typeof entry.userId === "string" &&
    typeof entry.cachedAt === "string" &&
    Array.isArray(entry.items)
  );
}

export function readCachedPortfolioItems(userId: string): PortfolioItemsCacheEntry | null {
  const memory = portfolioMemoryCache.get(userId);
  if (memory) return memory;

  const raw = storage.getString(getPortfolioCacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidPortfolioCacheEntry(parsed) || parsed.userId !== userId) return null;
    portfolioMemoryCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedPortfolioItems(userId: string, items: StudentPortfolioItem[]): void {
  const entry: PortfolioItemsCacheEntry = {
    version: PORTFOLIO_ITEMS_CACHE_SCHEMA_VERSION,
    userId,
    cachedAt: new Date().toISOString(),
    items,
  };
  portfolioMemoryCache.set(userId, entry);
  storage.set(getPortfolioCacheKey(userId), JSON.stringify(entry));
}

export function clearCachedPortfolioItems(userId: string): void {
  portfolioMemoryCache.delete(userId);
  storage.delete(getPortfolioCacheKey(userId));
}

export function isPortfolioItemsCacheFresh(entry: PortfolioItemsCacheEntry | null): boolean {
  if (!entry) return false;
  const cachedAt = new Date(entry.cachedAt).getTime();
  return Number.isFinite(cachedAt) && Date.now() - cachedAt <= PORTFOLIO_ITEMS_CACHE_TTL_MS;
}

// ── Portfolio CRUD ────────────────────────────────────────────────────────

export async function getPortfolioItems(
  userId: string,
): Promise<StudentPortfolioItem[]> {
  const { data, error } = await supabase
    .from("student_portfolio_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentPortfolioItem[];
}

export async function addPortfolioItem(
  userId: string,
  item: NewPortfolioItem,
): Promise<StudentPortfolioItem> {
  if (!item.title || item.title.trim().length === 0) {
    throw new Error("Portfolio item title is required");
  }
  if (item.title.length > 200) {
    throw new Error("Title must be 200 characters or less");
  }
  if (item.description && item.description.length > 2000) {
    throw new Error("Description must be 2000 characters or less");
  }

  const { data, error } = await supabase
    .from("student_portfolio_items")
    .insert({
      user_id: userId,
      item_type: item.item_type,
      title: item.title.trim(),
      description: item.description?.trim() ?? null,
      date_from: item.date_from ?? null,
      date_to: item.date_to ?? null,
      tags: item.tags ?? [],
      source: "manual",
    })
    .select("*")
    .single();

  if (error) throw error;

  // Invalidate cached fit scores since portfolio changed
  invalidateFitScores(userId);
  clearCachedPortfolioItems(userId);

  return data as StudentPortfolioItem;
}

export async function deletePortfolioItem(
  userId: string,
  itemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("student_portfolio_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw error;

  invalidateFitScores(userId);
  clearCachedPortfolioItems(userId);
}

// ── Fit Scores ─────────────────────────────────────────────────────────────

export function invalidateFitScores(userId: string): void {
  // Clear all cached results for this user
  for (const key of sessionCache.keys()) {
    if (key.startsWith(userId)) sessionCache.delete(key);
  }
}

export async function getFitScores(
  userId: string,
  roundIds: string[],
  forceRefresh = false,
): Promise<FitScoreResult[]> {
  const cacheKey = `${userId}:${[...roundIds].sort().join(",")}`;

  if (!forceRefresh) {
    const cached = sessionCache.get(cacheKey);
    if (cached && isFresh(cached.fetchedAt)) return cached.results;
  }

  const { data, error } = await supabase.functions.invoke("portfolio-fit", {
    body: { round_ids: roundIds, force_refresh: forceRefresh },
  });

  if (error) throw error;

  const results = (data?.results ?? []) as FitScoreResult[];
  sessionCache.set(cacheKey, { results, fetchedAt: Date.now() });
  return results;
}

export async function getDiscoveredPrograms(
  userId: string,
  limit = 5,
): Promise<FitScoreResult[]> {
  const { data, error } = await supabase.functions.invoke(
    `portfolio-fit/discover?limit=${limit}`,
    { method: "GET" } as any,
  );

  if (error) throw error;
  return (data?.results ?? []) as FitScoreResult[];
}
