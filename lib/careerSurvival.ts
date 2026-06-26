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

export interface CareerMetrics {
  demand_growth: number | null;        // 1-10
  grad_employment_pct: number | null;  // 0-100
  saturation_level: number | null;     // 1-10
  progression_difficulty: number | null; // 1-10
  ai_impact_score: number | null;      // 1-10 (from ai_impact.automation_risk)
  salary_floor: number | null;         // THB/month (Thai) or USD/month (Global)
  salary_ceiling: number | null;       // THB/month (Thai) or USD/month (Global)
}

export interface MetricDetailSource {
  title: string;
  url: string;
}

export interface MetricDetail {
  th: string;
  en: string;
  sources: MetricDetailSource[];
}

/** metric_details JSONB: keys are metric names, values are bilingual explanation + sources */
export type MetricDetailsMap = Record<string, MetricDetail>;

export type MarketRegion = "th" | "global";

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
  demand_growth: number | null;
  grad_employment_pct: number | null;
  saturation_level: number | null;
  progression_difficulty: number | null;
  salary_floor: number | null;
  salary_ceiling: number | null;
  global_demand_growth: number | null;
  global_grad_employment_pct: number | null;
  global_saturation_level: number | null;
  global_progression_difficulty: number | null;
  global_salary_floor: number | null;
  global_salary_ceiling: number | null;
  metric_details: MetricDetailsMap;
  global_metric_details: MetricDetailsMap;
  created_at: string;
  updated_at: string;
}

const VALID_TIERS: SurvivalTier[] = ["growing", "shifting", "exposed"];

function parseMetricDetails(raw: unknown): MetricDetailsMap {
  if (raw == null || typeof raw !== "object") return {};
  const result: MetricDetailsMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (val == null || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    if (typeof v.th !== "string" || typeof v.en !== "string") continue;
    const sources: MetricDetailSource[] = [];
    if (Array.isArray(v.sources)) {
      for (const s of v.sources) {
        if (s && typeof s === "object" && typeof (s as any).title === "string" && typeof (s as any).url === "string") {
          sources.push({ title: (s as any).title, url: (s as any).url });
        }
      }
    }
    result[key] = { th: v.th, en: v.en, sources };
  }
  return result;
}

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

  // Validate insights (optional — may be missing from some DB schemas)
  const insights: SurvivalInsight[] = [];
  if (Array.isArray(r.insights)) {
    for (const ins of r.insights) {
      if (ins == null || typeof ins !== "object") continue;
      const i = ins as Record<string, unknown>;
      if (typeof i.category !== "string") continue;
      if (typeof i.content !== "string") continue;
      if (typeof i.priority !== "number") continue;
      insights.push({ category: i.category, content: i.content, priority: i.priority });
    }
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

  // Validate specialty_tracks (optional — may not exist on all DB schemas)
  const specialtyTracks: SpecialtyTrack[] = [];
  if (Array.isArray(r.specialty_tracks)) {
    for (const tr of r.specialty_tracks) {
      if (tr == null || typeof tr !== "object") continue;
      const t = tr as Record<string, unknown>;
      if (typeof t.name !== "string") continue;
      if (typeof t.description !== "string") continue;
      if (typeof t.demand_level !== "string") continue;
      if (typeof t.salary_premium !== "string") continue;
      specialtyTracks.push({
        name: t.name,
        description: t.description,
        demand_level: t.demand_level as "high" | "medium" | "low",
        salary_premium: t.salary_premium,
      });
    }
  }

  // Validate future_opportunities (optional — may not exist on all DB schemas)
  const futureOpportunities: FutureOpportunity[] = [];
  if (Array.isArray(r.future_opportunities)) {
    for (const op of r.future_opportunities) {
      if (op == null || typeof op !== "object") continue;
      const o = op as Record<string, unknown>;
      if (typeof o.role !== "string") continue;
      if (typeof o.description !== "string") continue;
      if (typeof o.timeline !== "string") continue;
      if (typeof o.transition_difficulty !== "string") continue;
      futureOpportunities.push({
        role: o.role,
        description: o.description,
        timeline: o.timeline,
        transition_difficulty: o.transition_difficulty as "easy" | "medium" | "hard" | "very hard",
      });
    }
  }

  const optInt = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

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
    demand_growth: optInt(r.demand_growth),
    grad_employment_pct: optInt(r.grad_employment_pct),
    saturation_level: optInt(r.saturation_level),
    progression_difficulty: optInt(r.progression_difficulty),
    salary_floor: optInt(r.salary_floor),
    salary_ceiling: optInt(r.salary_ceiling),
    global_demand_growth: optInt(r.global_demand_growth),
    global_grad_employment_pct: optInt(r.global_grad_employment_pct),
    global_saturation_level: optInt(r.global_saturation_level),
    global_progression_difficulty: optInt(r.global_progression_difficulty),
    global_salary_floor: optInt(r.global_salary_floor),
    global_salary_ceiling: optInt(r.global_salary_ceiling),
    metric_details: parseMetricDetails(r.metric_details),
    global_metric_details: parseMetricDetails(r.global_metric_details),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function getCareerMetrics(cs: CareerSurvival, market: MarketRegion = "th"): CareerMetrics {
  if (market === "global") {
    return {
      demand_growth: cs.global_demand_growth,
      grad_employment_pct: cs.global_grad_employment_pct,
      saturation_level: cs.global_saturation_level,
      progression_difficulty: cs.global_progression_difficulty,
      ai_impact_score: cs.ai_impact?.automation_risk ?? null,
      salary_floor: cs.global_salary_floor,
      salary_ceiling: cs.global_salary_ceiling,
    };
  }
  return {
    demand_growth: cs.demand_growth,
    grad_employment_pct: cs.grad_employment_pct,
    saturation_level: cs.saturation_level,
    progression_difficulty: cs.progression_difficulty,
    ai_impact_score: cs.ai_impact?.automation_risk ?? null,
    salary_floor: cs.salary_floor,
    salary_ceiling: cs.salary_ceiling,
  };
}

export function getMetricDetails(cs: CareerSurvival, market: MarketRegion = "th"): MetricDetailsMap {
  return market === "global" ? cs.global_metric_details : cs.metric_details;
}

export async function getCareerSurvival(
  supabase: SupabaseClient,
  name: string,
): Promise<CareerSurvival | null> {
  try {
    // If the name looks like a slug (contains hyphens), query directly by slug
    // to avoid the RPC's normalization stripping hyphens.
    const isSlug = /^[a-z0-9-]+$/.test(name) && name.includes("-");
    console.log("[careerSurvival] getCareerSurvival called:", name, "isSlug:", isSlug);
    if (isSlug) {
      const { data, error } = await supabase
        .from("career_survival")
        .select("*")
        .eq("slug", name)
        .maybeSingle();
      console.log("[careerSurvival] direct query result:", error ? `error: ${JSON.stringify(error)}` : data ? `found slug=${data.slug}` : "null/empty");
      if (error || !data) return null;
      console.log("[careerSurvival] metrics:", JSON.stringify({
        demand_growth: data.demand_growth,
        grad_employment_pct: data.grad_employment_pct,
        salary_floor: data.salary_floor,
        global_demand_growth: data.global_demand_growth,
        global_salary_floor: data.global_salary_floor,
      }));
      const result = parseSurvivalVerdict(data);
      console.log("[careerSurvival] parsed:", result ? "ok" : "null");
      return result;
    }

    const { data, error } = await supabase.rpc("get_career_survival", {
      p_name: name,
    });

    if (error) {
      return null;
    }

    // RPC returns SETOF (array); take the first row.
    const row = Array.isArray(data) ? data[0] ?? null : data;
    return parseSurvivalVerdict(row);
  } catch {
    return null;
  }
}
