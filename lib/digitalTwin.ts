// Digital Twin client library for PassionSeed
// Invokes the twin-updater edge function and reads twin data from Supabase
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DigitalTwinPersonality {
  traits: string[];
  work_style: string;
  values: string[];
  risk_tolerance: "low" | "medium" | "high";
  summary: string;
}

export interface PassionSignal {
  score: number;
  confidence: number;
  signal_count: number;
  trend: "exploring" | "rising" | "stable" | "declining";
  evidence: string[];
}

export interface CareerInsight {
  passion_fit: number;
  aptitude_fit: number;
  market_fit: number;
  overall: number;
  reasoning: string;
}

export interface DigitalTwin {
  version: number;
  personality: DigitalTwinPersonality;
  passion_signals: Record<string, PassionSignal>;
  career_insights: Record<string, CareerInsight>;
  updated_at: string;
  stale_after: string;
}

export interface TwinUpdateResult {
  success: boolean;
  signalCount?: number;
  updatedDomains?: string[];
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export interface CareerScores {
  passion: number | null;
  future: number | null;
  world: number | null;
  overall: number | null;
  confidence: number;
  isStale: boolean;
  signalCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a career goal string to a domain name for passion-signal lookups.
 *
 * Uses a small keyword-driven table for common careers; falls back to the
 * first word of the career goal, lowercased, when no match is found.
 */
export function mapDomainToCareer(careerGoal: string): string {
  const normalized = careerGoal.toLowerCase().trim();

  const known: Record<string, string> = {
    "software engineer": "technology",
    "software developer": "technology",
    "web developer": "technology",
    "data scientist": "technology",
    "machine learning engineer": "technology",
    "ai engineer": "technology",
    "doctor": "healthcare",
    "nurse": "healthcare",
    "surgeon": "healthcare",
    "physician": "healthcare",
    "dentist": "healthcare",
    "teacher": "education",
    "professor": "education",
    "lawyer": "law",
    "attorney": "law",
    "designer": "design",
    "graphic designer": "design",
    "ux designer": "design",
    "architect": "design",
    "accountant": "finance",
    "banker": "finance",
    "financial analyst": "finance",
    "chef": "culinary",
    "musician": "arts",
    "artist": "arts",
    "writer": "arts",
    "journalist": "media",
    "marketing": "business",
    "entrepreneur": "business",
    "manager": "business",
    "scientist": "science",
    "researcher": "science",
    "engineer": "engineering",
  };

  // Exact match
  if (known[normalized]) return known[normalized];

  // Partial / fuzzy match — check if any known key appears inside the goal
  for (const [key, domain] of Object.entries(known)) {
    if (normalized.includes(key)) return domain;
  }

  // Fallback: first word
  const firstWord = normalized.split(/\s+/)[0];
  return firstWord || "general";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Invoke the `twin-updater` Supabase Edge Function to (re)build the digital
 * twin for the current or specified user.
 *
 * @param userId  Optional user id.  When omitted the edge function uses the
 *                caller's auth context.
 * @returns A {@link TwinUpdateResult} with success status and metadata.
 */
export async function updateDigitalTwin(
  userId?: string
): Promise<TwinUpdateResult> {
  try {
    const { data, error } = await supabase.functions.invoke("twin-updater", {
      body: { userId },
    });

    if (error) {
      console.error("Error invoking twin-updater:", error);
      return { success: false, error: error.message };
    }

    return data as TwinUpdateResult;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error invoking twin-updater";
    console.error("Error invoking twin-updater:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetch the digital twin for the current or specified user from the
 * `user_digital_twins` table.
 *
 * @param userId  Optional user id.  When omitted the current authenticated
 *                user is used.
 * @returns The parsed {@link DigitalTwin} or `null` when no twin exists.
 */
export async function getDigitalTwin(
  userId?: string
): Promise<DigitalTwin | null> {
  try {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      uid = user.id;
    }

    const { data, error } = await supabase
      .from("user_digital_twins")
      .select("twin_data, updated_at, stale_after, signal_count")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      console.error("Error fetching digital twin:", error);
      return null;
    }

    if (!data || !data.twin_data) return null;

    // twin_data is stored as a JSON/JSONB column — parse it and combine with
    // the top-level timestamp columns.
    const twinData =
      typeof data.twin_data === "string"
        ? JSON.parse(data.twin_data)
        : data.twin_data;

    return {
      ...twinData,
      updated_at: data.updated_at,
      stale_after: data.stale_after,
    } as DigitalTwin;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching digital twin";
    console.error("Error fetching digital twin:", message);
    return null;
  }
}

/**
 * Derive a structured {@link CareerScores} object for a specific career goal.
 *
 * - Looks up the matching passion signal by mapping the career goal to a
 *   domain name.
 * - Finds the matching career insight (exact key match first, then fuzzy
 *   substring match).
 * - Attaches staleness and confidence metadata from the twin.
 *
 * @param userId      The user whose twin to query.
 * @param careerGoal  The career goal string (e.g. "Software Engineer").
 * @returns A fully populated {@link CareerScores} object.  All score fields
 *          will be `null` when no relevant twin data is available.
 */
export async function getCareerScores(
  userId: string,
  careerGoal: string
): Promise<CareerScores> {
  try {
    const twin = await getDigitalTwin(userId);

    if (!twin) {
      return {
        passion: null,
        future: null,
        world: null,
        overall: null,
        confidence: 0,
        isStale: true,
        signalCount: 0,
      };
    }

    const domain = mapDomainToCareer(careerGoal);
    const passionSignal: PassionSignal | undefined =
      twin.passion_signals?.[domain] ?? twin.passion_signals?.[careerGoal];

    // Career insight — exact match first, then fuzzy
    let careerInsight: CareerInsight | undefined =
      twin.career_insights?.[careerGoal];

    if (!careerInsight && twin.career_insights) {
      const goalLower = careerGoal.toLowerCase();
      for (const [key, value] of Object.entries(twin.career_insights)) {
        if (
          key.toLowerCase().includes(goalLower) ||
          goalLower.includes(key.toLowerCase())
        ) {
          careerInsight = value;
          break;
        }
      }
    }

    const signalCount = passionSignal?.signal_count ?? 0;
    const confidence = passionSignal?.confidence ?? 0;
    const isStale = isTwinStale(twin);

    if (!passionSignal && !careerInsight) {
      return {
        passion: null,
        future: null,
        world: null,
        overall: null,
        confidence: 0,
        isStale,
        signalCount: 0,
      };
    }

    return {
      passion: passionSignal?.score ?? null,
      future: careerInsight?.aptitude_fit ?? null,
      world: careerInsight?.market_fit ?? null,
      overall: careerInsight?.overall ?? null,
      confidence,
      isStale,
      signalCount,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error getting career scores";
    console.error("Error getting career scores:", message);
    return {
      passion: null,
      future: null,
      world: null,
      overall: null,
      confidence: 0,
      isStale: true,
      signalCount: 0,
    };
  }
}

/**
 * Determine whether a digital twin has passed its `stale_after` timestamp.
 *
 * @param twin  The digital twin to check.
 * @returns `true` when the current time is past `stale_after`.
 */
export function isTwinStale(twin: DigitalTwin): boolean {
  return new Date() > new Date(twin.stale_after);
}

/**
 * Calculate the average confidence across all passion signals in the twin.
 *
 * @param twin  The digital twin (or `null`).
 * @returns Average confidence (0–1 scale), or `0` when no twin or no signals.
 */
export function getTwinConfidence(twin: DigitalTwin | null): number {
  if (!twin || !twin.passion_signals) return 0;

  const signals = Object.values(twin.passion_signals);
  if (signals.length === 0) return 0;

  const total = signals.reduce((sum, s) => sum + (s.confidence ?? 0), 0);
  return total / signals.length;
}
