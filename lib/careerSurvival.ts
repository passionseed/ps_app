import type { SupabaseClient } from "@supabase/supabase-js";

export type SurvivalTier = "growing" | "shifting" | "exposed";

export interface SurvivalSource {
  title: string;
  url: string;
  author?: string;
  date?: string;
}

export interface SurvivalInsight {
  category: string;
  content: string;
  priority: number;
}

export interface AiImpact {
  automation_risk: number;
  tools_to_master: string[];
  augmented_tasks: string;
  automated_tasks: string;
}

export interface SpecialtyTrack {
  name: string;
  description: string;
  demand_level: "high" | "medium" | "low";
  salary_premium: string;
}

export interface FutureOpportunity {
  role: string;
  description: string;
  timeline: string;
  transition_difficulty: "easy" | "medium" | "hard" | "very hard";
}

export interface CareerSurvival {
  slug: string;
  aliases: string[];
  tier: SurvivalTier;
  reasoning: string;
  sources: SurvivalSource[];
  insights: SurvivalInsight[];
  ai_impact: AiImpact | null;
  specialty_tracks: SpecialtyTrack[];
  future_opportunities: FutureOpportunity[];
  escape_route_slug: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_TIERS: SurvivalTier[] = ["growing", "shifting", "exposed"];

export function normalizeCareerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseSurvivalVerdict(row: unknown): CareerSurvival | null {
  if (row == null || typeof row !== "object") {
    return null;
  }

  const r = row as Record<string, unknown>;

  // Validate required string fields
  if (typeof r.slug !== "string") return null;
  if (typeof r.reasoning !== "string") return null;
  if (typeof r.created_at !== "string") return null;
  if (typeof r.updated_at !== "string") return null;

  // Validate tier
  if (!VALID_TIERS.includes(r.tier as SurvivalTier)) {
    return null;
  }

  // Validate aliases
  if (!Array.isArray(r.aliases)) return null;
  if (!r.aliases.every((a) => typeof a === "string")) return null;

  // Validate escape_route_slug
  const escapeRouteSlug = r.escape_route_slug;
  if (escapeRouteSlug !== null && typeof escapeRouteSlug !== "string") {
    return null;
  }

  // Validate sources
  if (!Array.isArray(r.sources)) return null;
  const sources: SurvivalSource[] = [];
  for (const src of r.sources) {
    if (src == null || typeof src !== "object") return null;
    const s = src as Record<string, unknown>;
    if (typeof s.title !== "string") return null;
    if (typeof s.url !== "string") return null;
    const source: SurvivalSource = { title: s.title, url: s.url };
    if (typeof s.author === "string") source.author = s.author;
    if (typeof s.date === "string") source.date = s.date;
    sources.push(source);
  }

  // Validate insights
  if (!Array.isArray(r.insights)) return null;
  const insights: SurvivalInsight[] = [];
  for (const ins of r.insights) {
    if (ins == null || typeof ins !== "object") return null;
    const i = ins as Record<string, unknown>;
    if (typeof i.category !== "string") return null;
    if (typeof i.content !== "string") return null;
    if (typeof i.priority !== "number") return null;
    insights.push({ category: i.category, content: i.content, priority: i.priority });
  }

  // Validate ai_impact
  let aiImpact: AiImpact | null = null;
  if (r.ai_impact !== null && r.ai_impact !== undefined) {
    if (typeof r.ai_impact !== "object") return null;
    const a = r.ai_impact as Record<string, unknown>;
    if (typeof a.automation_risk !== "number") return null;
    if (!Array.isArray(a.tools_to_master)) return null;
    if (!a.tools_to_master.every((t) => typeof t === "string")) return null;
    if (typeof a.augmented_tasks !== "string") return null;
    if (typeof a.automated_tasks !== "string") return null;
    aiImpact = {
      automation_risk: a.automation_risk,
      tools_to_master: a.tools_to_master as string[],
      augmented_tasks: a.augmented_tasks,
      automated_tasks: a.automated_tasks,
    };
  }

  // Validate specialty_tracks
  if (!Array.isArray(r.specialty_tracks)) return null;
  const specialtyTracks: SpecialtyTrack[] = [];
  for (const tr of r.specialty_tracks) {
    if (tr == null || typeof tr !== "object") return null;
    const t = tr as Record<string, unknown>;
    if (typeof t.name !== "string") return null;
    if (typeof t.description !== "string") return null;
    if (typeof t.demand_level !== "string") return null;
    if (typeof t.salary_premium !== "string") return null;
    specialtyTracks.push({
      name: t.name,
      description: t.description,
      demand_level: t.demand_level as "high" | "medium" | "low",
      salary_premium: t.salary_premium,
    });
  }

  // Validate future_opportunities
  if (!Array.isArray(r.future_opportunities)) return null;
  const futureOpportunities: FutureOpportunity[] = [];
  for (const op of r.future_opportunities) {
    if (op == null || typeof op !== "object") return null;
    const o = op as Record<string, unknown>;
    if (typeof o.role !== "string") return null;
    if (typeof o.description !== "string") return null;
    if (typeof o.timeline !== "string") return null;
    if (typeof o.transition_difficulty !== "string") return null;
    futureOpportunities.push({
      role: o.role,
      description: o.description,
      timeline: o.timeline,
      transition_difficulty: o.transition_difficulty as "easy" | "medium" | "hard" | "very hard",
    });
  }

  return {
    slug: r.slug,
    aliases: r.aliases as string[],
    tier: r.tier as SurvivalTier,
    reasoning: r.reasoning,
    sources,
    insights,
    ai_impact: aiImpact,
    specialty_tracks: specialtyTracks,
    future_opportunities: futureOpportunities,
    escape_route_slug: escapeRouteSlug as string | null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function getCareerSurvival(
  supabase: SupabaseClient,
  name: string,
): Promise<CareerSurvival | null> {
  try {
    const { data, error } = await supabase.rpc("get_career_survival", {
      p_name: name,
    });

    if (error) {
      return null;
    }

    return parseSurvivalVerdict(data);
  } catch {
    return null;
  }
}
