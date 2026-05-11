import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// MiniMax API config (same as score-engine)
const MINIMAX_API_KEY = Deno.env.get("MINIMAX_API_KEY") ?? "";
const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7-highspeed";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwinUpdaterRequest {
  userId?: string;
}

interface TwinPersonality {
  traits: string[];
  work_style: "hands-on" | "theoretical" | "collaborative" | "independent";
  values: string[];
  risk_tolerance: "low" | "medium" | "high";
  summary: string;
}

interface TwinPassionSignal {
  score: number;
  confidence: number;
  signal_count: number;
  trend: "rising" | "stable" | "declining" | "exploring";
  evidence: string[];
}

interface TwinCareerInsight {
  passion_fit: number;
  aptitude_fit: number;
  market_fit: number;
  overall: number;
  reasoning: string;
}

interface DigitalTwinData {
  personality: TwinPersonality;
  passion_signals: Record<string, TwinPassionSignal>;
  career_insights: Record<string, TwinCareerInsight>;
  version: number;
  updated_at?: string;
}

interface NormalizedSignal {
  source: string;
  [key: string]: unknown;
}

interface TwinDbRow {
  id: string;
  user_id: string;
  twin_data: DigitalTwinData;
  signal_count: number;
  last_signal_at: string;
  stale_after: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return a successful response (always 200 per spec).
 */
function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Get a default/empty twin structure when LLM parsing fails.
 */
function defaultTwin(version = 1): DigitalTwinData {
  return {
    personality: {
      traits: [],
      work_style: "independent",
      values: [],
      risk_tolerance: "medium",
      summary: "No signals analyzed yet.",
    },
    passion_signals: {},
    career_insights: {},
    version,
  };
}

/**
 * Compute world score from career goal via simple keyword matching.
 */
function computeWorldScore(careerGoal: string): number {
  const lower = careerGoal.toLowerCase();

  const highWorld = ["healthcare", "health", "medical", "doctor", "nurse",
    "education", "teacher", "teaching", "climate", "environment", "green"];
  const medHighWorld = ["technology", "tech", "engineering", "software",
    "developer", "programmer"];
  const mediumWorld = ["business", "finance", "banking", "accounting",
    "marketing"];
  const lowWorld = ["art", "arts", "entertainment", "music", "film",
    "design", "creative"];

  if (highWorld.some((kw) => lower.includes(kw))) return 85;
  if (medHighWorld.some((kw) => lower.includes(kw))) return 75;
  if (mediumWorld.some((kw) => lower.includes(kw))) return 65;
  if (lowWorld.some((kw) => lower.includes(kw))) return 55;
  return 60;
}

/**
 * Simple retry wrapper for fetch calls.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 1,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, init);
      return resp;
    } catch (err) {
      lastError = err as Error;
      if (i < retries) {
        console.warn(
          `[twin-updater] Fetch attempt ${i + 1} failed, retrying...`,
        );
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  throw lastError ?? new Error("Fetch failed after retries");
}

/**
 * Match a career goal string to keys in a record using keyword overlap.
 * Returns the best-matching key or null.
 */
function matchCareerToDomain(
  careerGoal: string,
  domains: string[],
): string | null {
  if (domains.length === 0) return null;

  const goalWords = careerGoal.toLowerCase().split(/\s+/).filter((w) =>
    w.length > 2
  );

  let bestDomain: string | null = null;
  let bestScore = 0;

  for (const domain of domains) {
    const domainLower = domain.toLowerCase();
    let score = 0;
    // Check if domain name is fully contained in career goal or vice versa
    if (careerGoal.toLowerCase().includes(domainLower) ||
      domainLower.includes(careerGoal.toLowerCase())) {
      score = 10; // strong match
    }
    // Count individual word matches
    for (const word of goalWords) {
      if (domainLower.includes(word)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

// ─── Signal Collection ────────────────────────────────────────────────────────

async function collectSignals(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  since: string,
): Promise<{ signals: NormalizedSignal[]; signalCount: number }> {
  const signals: NormalizedSignal[] = [];

  // 1. Score events
  const { data: scoreEvents, error: scoreErr } = await supabase
    .from("score_events")
    .select("id, score_type, score_value, metadata, created_at")
    .eq("user_id", userId)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (scoreErr) {
    console.error(
      "[twin-updater] Error fetching score_events:",
      scoreErr,
    );
  } else if (scoreEvents) {
    for (const ev of scoreEvents) {
      signals.push({
        source: "score_event",
        id: ev.id,
        score_type: ev.score_type,
        score_value: ev.score_value,
        metadata: ev.metadata,
        created_at: ev.created_at,
      });
    }
  }

  // 2. Path reflections — get via enrollment join
  //    First fetch all enrollment IDs for the user
  const { data: enrollments, error: enrollErr } = await supabase
    .from("path_enrollments")
    .select("id, path_id")
    .eq("user_id", userId);

  if (enrollErr || !enrollments || enrollments.length === 0) {
    console.log(
      "[twin-updater] No path_enrollments found for user",
    );
  } else {
    const enrollmentIds = enrollments.map((e) => e.id);

    // Build a map: enrollment_id → path_id
    const enrollmentPathMap = new Map<string, string>();
    for (const e of enrollments) {
      enrollmentPathMap.set(e.id, e.path_id);
    }

    // Fetch reflections for these enrollments
    const { data: reflections, error: reflErr } = await supabase
      .from("path_reflections")
      .select(
        "id, enrollment_id, day_number, energy_level, confusion_level, interest_level, open_response, decision, created_at",
      )
      .in("enrollment_id", enrollmentIds)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30);

    if (reflErr) {
      console.error(
        "[twin-updater] Error fetching path_reflections:",
        reflErr,
      );
    } else if (reflections) {
      // Fetch seed titles for all unique path_ids
      const pathIds = [...new Set(enrollments.map((e) => e.path_id))];
      const { data: paths, error: pathsErr } = await supabase
        .from("paths")
        .select("id, seed_id")
        .in("id", pathIds);

      const seedIdSet = new Set<string>();
      if (paths) {
        for (const p of paths) seedIdSet.add(p.seed_id);
      }

      const { data: seeds } = await supabase
        .from("seeds")
        .select("id, title")
        .in("id", [...seedIdSet]);

      // Build lookup: path_id → seed_title
      const pathSeedMap = new Map<string, string>();
      if (paths && seeds) {
        const seedMap = new Map<string, string>();
        for (const s of seeds) seedMap.set(s.id, s.title);
        for (const p of paths) {
          pathSeedMap.set(p.id, seedMap.get(p.seed_id) ?? "");
        }
      }

      for (const ref of reflections) {
        const pathId = enrollmentPathMap.get(ref.enrollment_id) ?? "";
        const seedTitle = pathSeedMap.get(pathId) ?? "";
        signals.push({
          source: "path_reflection",
          id: ref.id,
          enrollment_id: ref.enrollment_id,
          day_number: ref.day_number,
          energy_level: ref.energy_level,
          confusion_level: ref.confusion_level,
          interest_level: ref.interest_level,
          open_response: ref.open_response,
          decision: ref.decision,
          seed_title: seedTitle,
          created_at: ref.created_at,
        });
      }
    }
  }

  // 3. User events — specific event types only
  const relevantEventTypes = [
    "interest_selected",
    "career_searched",
    "career_selected",
    "seed_completed",
    "program_saved",
  ];

  const { data: userEvents, error: userEventErr } = await supabase
    .from("user_events")
    .select("id, event_type, event_data, created_at")
    .eq("user_id", userId)
    .in("event_type", relevantEventTypes)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);

  if (userEventErr) {
    console.error(
      "[twin-updater] Error fetching user_events:",
      userEventErr,
    );
  } else if (userEvents) {
    for (const ev of userEvents) {
      signals.push({
        source: "user_event",
        id: ev.id,
        event_type: ev.event_type,
        event_data: ev.event_data,
        created_at: ev.created_at,
      });
    }
  }

  // 4. Student journeys — updated_at > since
  const { data: journeys, error: journeyErr } = await supabase
    .from("student_journeys")
    .select("id, title, career_goal, steps, scores, updated_at")
    .eq("student_id", userId)
    .gt("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (journeyErr) {
    console.error(
      "[twin-updater] Error fetching student_journeys:",
      journeyErr,
    );
  } else if (journeys) {
    for (const j of journeys) {
      signals.push({
        source: "student_journey",
        id: j.id,
        title: j.title,
        career_goal: j.career_goal,
        steps: j.steps,
        scores: j.scores,
        updated_at: j.updated_at,
      });
    }
  }

  return { signals, signalCount: signals.length };
}

// ─── LLM Prompt & Call ────────────────────────────────────────────────────────

function buildPrompt(
  existingTwin: DigitalTwinData | null,
  signals: NormalizedSignal[],
): string {
  const signalsJson = JSON.stringify(signals, null, 2);

  if (!existingTwin) {
    return `You are building a Digital Twin — a living profile that represents a student exploring careers.

RECENT SIGNALS about this student:
${signalsJson}

Analyze these signals and create a profile. Be honest — if evidence is sparse, reflect that with low confidence. Never fabricate insights.

OUTPUT ONLY valid JSON:
{
  "personality": {
    "traits": ["string"],
    "work_style": "hands-on" | "theoretical" | "collaborative" | "independent",
    "values": ["string"],
    "risk_tolerance": "low" | "medium" | "high",
    "summary": "1-2 sentence personality summary"
  },
  "passion_signals": {
    "domain_name": {
      "score": 0-100,
      "confidence": 0-1,
      "signal_count": number,
      "trend": "exploring" | "rising" | "stable" | "declining",
      "evidence": ["specific observation from signals"]
    }
  },
  "career_insights": {
    "Career Name": {
      "passion_fit": 0-100,
      "aptitude_fit": 0-100,
      "market_fit": 0-100,
      "overall": 0-100,
      "reasoning": "1-2 sentence explanation"
    }
  }
}`;
  }

  // Update prompt with existing twin
  const existingJson = JSON.stringify(existingTwin, null, 2);
  return `CURRENT TWIN PROFILE:
${existingJson}

NEW SIGNALS since last update:
${signalsJson}

Update the twin by merging new signals into the existing profile.

RULES:
- Preserve prior insights unless clearly contradicted by new evidence
- Increase confidence when signal_count grows (max 1.0)
- Evidence arrays are CUMULATIVE — append new evidence, keep old
- Trend can only be: "exploring" → "rising" → "stable" or "declining"
- All scores MUST be traceable to actual signals
- If a passion_signals domain has 0 new signals, leave it unchanged
- Update version number

OUTPUT the COMPLETE updated twin as valid JSON (all fields, not just changes).`;
}

async function callMinimax(prompt: string): Promise<string> {
  if (!MINIMAX_API_KEY) {
    throw new Error("MiniMax API key not configured");
  }

  const response = await fetchWithRetry(
    `${MINIMAX_BASE_URL}/v1/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "x-api-key": MINIMAX_API_KEY,
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
    },
    1, // retry once
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[twin-updater] MiniMax API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(
      `MiniMax API error (${response.status}): ${errorText || response.statusText}`,
    );
  }

  const data = await response.json();

  // MiniMax Anthropic-compatible format: content blocks
  const contentBlocks: Array<{ type: string; text?: string }> = data.content || [];
  const textBlock = contentBlocks.find((block) => block.type === "text");
  const responseText = textBlock?.text || "";

  if (!responseText) {
    console.error(
      "[twin-updater] Empty response from MiniMax:",
      JSON.stringify(data),
    );
    throw new Error("Empty response from LLM");
  }

  return responseText;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAndParseTwin(text: string): DigitalTwinData | null {
  // Try to extract JSON from the response (may contain markdown fences)
  let jsonStr = text.trim();

  // Strip markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate required structure
    if (!parsed.personality || typeof parsed.personality !== "object") {
      console.error("[twin-updater] Missing personality in LLM response");
      return null;
    }
    if (!parsed.passion_signals || typeof parsed.passion_signals !== "object") {
      console.error("[twin-updater] Missing passion_signals in LLM response");
      return null;
    }
    if (!parsed.career_insights || typeof parsed.career_insights !== "object") {
      console.error("[twin-updater] Missing career_insights in LLM response");
      return null;
    }

    const personality = parsed.personality as Record<string, unknown>;
    if (
      !Array.isArray(personality.traits) ||
      typeof personality.work_style !== "string" ||
      !Array.isArray(personality.values) ||
      typeof personality.risk_tolerance !== "string" ||
      typeof personality.summary !== "string"
    ) {
      console.error(
        "[twin-updater] Invalid personality fields in LLM response",
      );
      return null;
    }

    // Validate passion_signals entries
    for (const [key, value] of Object.entries(
      parsed.passion_signals as Record<string, unknown>,
    )) {
      const sig = value as Record<string, unknown>;
      if (
        typeof sig.score !== "number" ||
        typeof sig.confidence !== "number" ||
        typeof sig.signal_count !== "number" ||
        typeof sig.trend !== "string" ||
        !Array.isArray(sig.evidence)
      ) {
        console.error(
          `[twin-updater] Invalid passion_signal entry: ${key}`,
        );
        return null;
      }
    }

    // Validate career_insights entries
    for (const [key, value] of Object.entries(
      parsed.career_insights as Record<string, unknown>,
    )) {
      const ins = value as Record<string, unknown>;
      if (
        typeof ins.passion_fit !== "number" ||
        typeof ins.aptitude_fit !== "number" ||
        typeof ins.market_fit !== "number" ||
        typeof ins.overall !== "number" ||
        typeof ins.reasoning !== "string"
      ) {
        console.error(
          `[twin-updater] Invalid career_insight entry: ${key}`,
        );
        return null;
      }
    }

    // Ensure version is a number and increment if update
    const version =
      typeof parsed.version === "number" ? Math.floor(parsed.version) : 1;

    return {
      personality: personality as unknown as TwinPersonality,
      passion_signals: parsed.passion_signals as Record<
        string,
        TwinPassionSignal
      >,
      career_insights: parsed.career_insights as Record<
        string,
        TwinCareerInsight
      >,
      version,
    };
  } catch (e) {
    console.error(
      "[twin-updater] JSON parse error:",
      (e as Error).message,
    );
    return null;
  }
}

// ─── Back-Sync Scores ─────────────────────────────────────────────────────────

async function backSyncScores(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  twin: DigitalTwinData,
): Promise<number> {
  const { data: journeys, error: journeyErr } = await supabase
    .from("student_journeys")
    .select("id, career_goal")
    .eq("student_id", userId);

  if (journeyErr || !journeys || journeys.length === 0) {
    console.log("[twin-updater] No student journeys to back-sync");
    return 0;
  }

  const passionDomainKeys = Object.keys(twin.passion_signals);
  const careerInsightKeys = Object.keys(twin.career_insights);

  let updated = 0;

  for (const journey of journeys) {
    const careerGoal: string = journey.career_goal ?? "";

    // Match career goal to passion_signal domain
    const passionDomain = matchCareerToDomain(careerGoal, passionDomainKeys);
    const passionScore = passionDomain
      ? twin.passion_signals[passionDomain].score
      : 50; // default neutral

    // Match career goal to career_insight
    const insightKey = matchCareerToDomain(careerGoal, careerInsightKeys);
    const futureScore = insightKey
      ? twin.career_insights[insightKey].market_fit
      : 50;

    // World score from keyword lookup
    const worldScore = computeWorldScore(careerGoal);

    const scores = {
      passion: passionScore,
      future: futureScore,
      world: worldScore,
    };

    const { error: updateErr } = await supabase
      .from("student_journeys")
      .update({ scores, updated_at: new Date().toISOString() })
      .eq("id", journey.id);

    if (updateErr) {
      console.error(
        `[twin-updater] Error updating journey ${journey.id}:`,
        updateErr,
      );
    } else {
      updated++;
    }
  }

  return updated;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Validate auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return ok({ success: false, error: "Authorization header required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Create Supabase client with user's auth (for auth verification only)
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error("[twin-updater] Auth error:", authError);
      return ok({ success: false, error: "Invalid or expired session" });
    }

    console.log(`[twin-updater] Authenticated user: ${user.id}`);

    // ── 2. Parse request ─────────────────────────────────────────────────────
    const body: TwinUpdaterRequest = await req.json().catch(() => ({}));
    const targetUserId = body.userId || user.id;

    // Determine which client to use for DB operations.
    // By default, use the anon key with RLS enforcing the auth user's access.
    // If a different userId is requested, require service_role to bypass RLS.
    let supabase: ReturnType<typeof createClient>;

    if (body.userId && body.userId !== user.id) {
      // Cross-user access — requires service_role
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const authIsServiceKey =
        authHeader.startsWith("Bearer eyJ") &&
        authHeader.includes("service_role");
      const authMatchesServiceKey = serviceKey &&
        authHeader === `Bearer ${serviceKey}`;

      if (!authIsServiceKey && !authMatchesServiceKey) {
        console.warn(
          `[twin-updater] Permission denied: auth=${user.id}, requested=${body.userId}`,
        );
        return ok({
          success: false,
          error: "Cannot update twin for another user without service role",
        });
      }

      if (!serviceKey) {
        return ok({
          success: false,
          error: "SUPABASE_SERVICE_ROLE_KEY not configured",
        });
      }

      // Use service_role client (bypasses RLS)
      supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });
    } else {
      // Same user — pass auth header so RLS enforces user-scoped access
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
    }

    // ── 3. Fetch current twin ────────────────────────────────────────────────
    const { data: existingTwinRow, error: twinFetchErr } = await supabase
      .from("user_digital_twins")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (twinFetchErr) {
      console.error(
        "[twin-updater] Error fetching twin:",
        twinFetchErr,
      );
    }

    const existingTwin: DigitalTwinData | null =
      existingTwinRow?.twin_data ?? null;

    // Determine signal window
    const since = existingTwinRow?.updated_at
      ? new Date(existingTwinRow.updated_at).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[twin-updater] Fetching signals since: ${since}`);

    // ── 4. Collect signals ───────────────────────────────────────────────────
    const { signals, signalCount } = await collectSignals(
      supabase,
      targetUserId,
      since,
    );

    console.log(`[twin-updater] Collected ${signalCount} signals`);

    if (signals.length === 0) {
      return ok({ skipped: true, reason: "No new signals" });
    }

    // ── 5. Build prompt & call LLM ───────────────────────────────────────────
    const prompt = buildPrompt(existingTwin, signals);
    console.log(
      `[twin-updater] Prompt length: ${prompt.length} chars, mode: ${
        existingTwin ? "update" : "first-time"
      }`,
    );

    let llmResponse: string;
    try {
      llmResponse = await callMinimax(prompt);
    } catch (llmErr) {
      console.error(
        "[twin-updater] LLM call failed:",
        (llmErr as Error).message,
      );
      // Return existing twin unchanged on LLM failure
      return ok({
        success: false,
        error: `LLM call failed: ${(llmErr as Error).message}`,
        twin: existingTwin ?? defaultTwin(),
      });
    }

    // ── 6. Parse & validate response ─────────────────────────────────────────
    let newTwin = validateAndParseTwin(llmResponse);

    if (!newTwin) {
      console.error(
        "[twin-updater] LLM response validation failed. Raw:",
        llmResponse.slice(0, 500),
      );
      // Return existing twin with error flag
      return ok({
        success: false,
        error: "Failed to parse LLM response as valid twin JSON",
        twin: existingTwin ?? defaultTwin(),
        rawResponse: llmResponse.slice(0, 1000),
      });
    }

    // For updates, preserve version increment
    if (existingTwin) {
      newTwin.version = (existingTwin.version || 0) + 1;
    }

    newTwin.updated_at = new Date().toISOString();

    console.log(
      `[twin-updater] Twin v${newTwin.version} built. ` +
        `Passion domains: ${Object.keys(newTwin.passion_signals).length}, ` +
        `Career insights: ${Object.keys(newTwin.career_insights).length}`,
    );

    // ── 7. Store twin ────────────────────────────────────────────────────────
    const existingRow = existingTwinRow as TwinDbRow | null;
    const now = new Date().toISOString();
    const staleAfter = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const currentSignalCount = (existingRow?.signal_count ?? 0) + signalCount;

    const upsertPayload: Record<string, unknown> = {
      user_id: targetUserId,
      twin_data: newTwin,
      signal_count: currentSignalCount,
      last_signal_at: now,
      stale_after: staleAfter,
      updated_at: now,
    };

    if (existingRow) {
      const { error: updateErr } = await supabase
        .from("user_digital_twins")
        .update(upsertPayload)
        .eq("user_id", targetUserId);

      if (updateErr) {
        console.error(
          "[twin-updater] Error updating twin:",
          updateErr,
        );
        return ok({
          success: false,
          error: `Database update failed: ${updateErr.message}`,
        });
      }
    } else {
      upsertPayload["created_at"] = now;
      const { error: insertErr } = await supabase
        .from("user_digital_twins")
        .insert(upsertPayload);

      if (insertErr) {
        console.error(
          "[twin-updater] Error inserting twin:",
          insertErr,
        );
        return ok({
          success: false,
          error: `Database insert failed: ${insertErr.message}`,
        });
      }
    }

    // ── 8. Back-sync scores to student_journeys ──────────────────────────────
    const syncedJourneys = await backSyncScores(
      supabase,
      targetUserId,
      newTwin,
    );

    console.log(
      `[twin-updater] Back-synced scores to ${syncedJourneys} student journeys`,
    );

    // ── 9. Return success ────────────────────────────────────────────────────
    return ok({
      success: true,
      signalCount,
      updatedDomains: Object.keys(newTwin.passion_signals),
      version: newTwin.version,
      syncedJourneys,
    });
  } catch (err) {
    console.error("[twin-updater] Unexpected error:", err);
    return ok({
      success: false,
      error: (err as Error).message || "Internal server error",
    });
  }
});
