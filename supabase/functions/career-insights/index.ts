import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXA_API_KEY = Deno.env.get("EXA_API_KEY") ?? "";
const EXA_BASE = "https://api.exa.ai/search";
const CACHE_TTL_HOURS = 24;

// ─── Exa helper ───────────────────────────────────────────────────────────────

async function exaSearch(
  query: string,
  category: string,
  numResults = 6,
): Promise<any[]> {
  const body: Record<string, unknown> = {
    query,
    type: "auto",
    num_results: numResults,
    category,
  };

  if (category === "news") {
    body.highlights = { max_characters: 200, highlights_per_url: 1 };
  }

  const res = await fetch(EXA_BASE, {
    method: "POST",
    headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`[career-insights] Exa ${category} error:`, res.status);
    return [];
  }

  const data = await res.json();
  return data.results ?? [];
}

// ─── Normalise raw Exa results ────────────────────────────────────────────────

function normalisePeople(results: any[]) {
  return results.map((r) => ({ title: r.title ?? "", url: r.url ?? "" }));
}

function normaliseCompanies(results: any[]) {
  return results.map((r) => ({ title: r.title ?? "", url: r.url ?? "" }));
}

function normaliseNews(results: any[]) {
  return results.map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    publishedDate: r.publishedDate ?? null,
    snippet: r.highlights?.[0] ?? "",
  }));
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { careerName } = await req.json();

    if (!careerName || careerName.length < 2) {
      return new Response(
        JSON.stringify({ error: "careerName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client — bypasses RLS for cache reads/writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ── 1. Check cache ────────────────────────────────────────────────────────
    const { data: cached } = await supabase
      .from("career_insights_cache")
      .select("people, companies, news, fetched_at")
      .eq("career_name", careerName)
      .single();

    if (cached) {
      const ageHours =
        (Date.now() - new Date(cached.fetched_at).getTime()) / 3_600_000;

      if (ageHours < CACHE_TTL_HOURS) {
        console.log(`[career-insights] Cache hit for "${careerName}" (${ageHours.toFixed(1)}h old)`);
        return new Response(
          JSON.stringify({
            people: cached.people,
            companies: cached.companies,
            news: cached.news,
            cached: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`[career-insights] Cache expired for "${careerName}", refreshing…`);
    } else {
      console.log(`[career-insights] No cache for "${careerName}", fetching from Exa…`);
    }

    // ── 2. Fetch fresh from Exa ───────────────────────────────────────────────
    const [peopleRaw, companiesRaw, newsRaw] = await Promise.all([
      exaSearch(`${careerName} professional expert thought leader`, "people", 8),
      exaSearch(`leading ${careerName} company`, "company", 6),
      exaSearch(`${careerName} industry news trends 2025`, "news", 5),
    ]);

    const people = normalisePeople(peopleRaw);
    const companies = normaliseCompanies(companiesRaw);
    const news = normaliseNews(newsRaw);

    // ── 3. Upsert cache ───────────────────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from("career_insights_cache")
      .upsert(
        { career_name: careerName, people, companies, news, fetched_at: new Date().toISOString() },
        { onConflict: "career_name" },
      );

    if (upsertError) {
      console.error("[career-insights] Cache upsert failed:", upsertError.message);
    } else {
      console.log(`[career-insights] Cache saved for "${careerName}"`);
    }

    return new Response(
      JSON.stringify({ people, companies, news, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[career-insights] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
