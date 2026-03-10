import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EXA_API_KEY = Deno.env.get("EXA_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // Fix 1: Wrap req.json() in try/catch to avoid 500 on bad body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  const { universityName, facultyName, careerGoal = "", passionScore, futureScore, worldScore } = body;

  if (!universityName || !facultyName) {
    return new Response(
      JSON.stringify({ error: "universityName and facultyName required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  // Fix 2: Validate and clamp score inputs before prompt interpolation
  const clampScore = (v: unknown) => Math.min(100, Math.max(0, Number(v) || 0));
  const ps = clampScore(passionScore);
  const fs = clampScore(futureScore);
  const ws = clampScore(worldScore);

  // Fix 3: Sanitize user-controlled string inputs before prompt interpolation
  const sanitize = (s: string) => String(s ?? "").replace(/[\r\n]/g, " ").slice(0, 200);
  const safeUniversityName = sanitize(universityName);
  const safeFacultyName = sanitize(facultyName);
  const safeCareerGoal = sanitize(careerGoal);

  // 1. Check DB cache
  const { data: cached } = await supabase
    .from("university_insights_cache")
    .select("data, expires_at")
    .eq("university_name", safeUniversityName)
    .eq("faculty_name", safeFacultyName)
    .eq("career_goal", safeCareerGoal)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return new Response(JSON.stringify(cached.data), {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS },
    });
  }

  // Fix 4: Handle Exa API failures gracefully
  const exaFetch = async (body: unknown) => {
    const r = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { results: [] };
    return r.json();
  };

  let exaSearch: any = { results: [] };
  let exaPeople: any = { results: [] };
  try {
    [exaSearch, exaPeople] = await Promise.all([
      exaFetch({
        query: `${safeUniversityName} ${safeFacultyName} Thailand admission tuition curriculum`,
        numResults: 8,
        useAutoprompt: true,
        contents: { text: { maxCharacters: 800 } },
      }),
      exaFetch({
        query: `${safeFacultyName} ${safeUniversityName} professor alumni Thailand`,
        numResults: 5,
        type: "neural",
      }),
    ]);
  } catch {
    // Exa unavailable — proceed with empty research, AI will have less context
  }

  const searchSnippets = (exaSearch.results ?? [])
    .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.text ?? ""}`)
    .join("\n\n---\n\n")
    .slice(0, 6000);

  // 3. AI synthesis via Gemini flash preview — Fix 3: use safe* variables; Fix 2: use clamped scores
  const aiPrompt = `You are helping a Thai high school student evaluate university options.
University: ${safeUniversityName}
Faculty: ${safeFacultyName}
Career Goal: ${safeCareerGoal}
Student scores — Passion: ${ps}/100, Future: ${fs}/100, Market: ${ws}/100

Web research:
${searchSnippets}

Return ONLY a JSON object (no markdown fences) with:
{
  "aiMatchScore": <0-100>,
  "matchExplanation": "<2-3 sentences in Thai>",
  "acceptanceRate": "<e.g. '12%' or 'GPAX 3.20+', or null>",
  "gpaxCutoff": "<e.g. 'GPAX 3.25 (2566)', or null>",
  "tuitionPerYear": <THB integer or null>,
  "tuitionNote": "<brief Thai note or null>",
  "duration": "<e.g. '4 ปี' or null>",
  "curriculumUrl": "<URL or null>",
  "ranking": "<e.g. 'QS Thailand #3' or null>",
  "news": [{ "title": "...", "url": "...", "snippet": "...", "publishedDate": "..." }]
}`;

  // Fix 5: Handle Gemini API failures — don't cache bad results
  let aiParsed: Record<string, any> = {};
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
    const aiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: aiPrompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1024 },
      }),
    });
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      aiParsed = JSON.parse(rawText);
    }
  } catch { /* fallback — partial data */ }

  // 4. Build people list
  const people = (exaPeople.results ?? []).slice(0, 5).map((r: any) => {
    const raw = (r.title ?? "").replace(/ \| LinkedIn.*$/i, "").trim();
    const dashIdx = raw.indexOf(" - ");
    const name = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw;
    const role = dashIdx > -1 ? raw.slice(dashIdx + 3).trim() : "";
    const initials =
      name.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("") || "?";
    return { name, role, initials, url: r.url };
  });

  const result = {
    aiMatchScore: aiParsed.aiMatchScore ?? null,
    matchExplanation: aiParsed.matchExplanation ?? null,
    acceptanceRate: aiParsed.acceptanceRate ?? null,
    gpaxCutoff: aiParsed.gpaxCutoff ?? null,
    tuitionPerYear: aiParsed.tuitionPerYear ?? null,
    tuitionNote: aiParsed.tuitionNote ?? null,
    duration: aiParsed.duration ?? null,
    curriculumUrl: aiParsed.curriculumUrl ?? null,
    ranking: aiParsed.ranking ?? null,
    people,
    news: (aiParsed.news ?? []).slice(0, 4),
    cachedAt: new Date().toISOString(),
    source: "ai",
  };

  // 5. Save to DB cache only if AI produced a valid result (Fix 5: guard against caching bad results)
  if (result.aiMatchScore !== null) {
    await supabase.from("university_insights_cache").upsert(
      {
        university_name: safeUniversityName,
        faculty_name: safeFacultyName,
        career_goal: safeCareerGoal,
        data: result,
        source: "ai",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "university_name,faculty_name,career_goal" },
    );
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "X-Cache": "MISS", ...CORS },
  });
});
