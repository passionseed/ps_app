import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EXA_API_KEY = Deno.env.get("EXA_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const { universityName, facultyName, careerGoal = "", passionScore, futureScore, worldScore } =
    await req.json();

  if (!universityName || !facultyName) {
    return new Response(
      JSON.stringify({ error: "universityName and facultyName required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS } },
    );
  }

  // 1. Check DB cache
  const { data: cached } = await supabase
    .from("university_insights_cache")
    .select("data, expires_at")
    .eq("university_name", universityName)
    .eq("faculty_name", facultyName)
    .eq("career_goal", careerGoal)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return new Response(JSON.stringify(cached.data), {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS },
    });
  }

  // 2. Research via Exa
  const [exaSearch, exaPeople] = await Promise.all([
    fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${universityName} ${facultyName} Thailand admission tuition curriculum`,
        numResults: 8,
        useAutoprompt: true,
        contents: { text: { maxCharacters: 800 } },
      }),
    }).then((r) => r.json()),
    fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${facultyName} ${universityName} professor alumni Thailand`,
        numResults: 5,
        type: "neural",
      }),
    }).then((r) => r.json()),
  ]);

  const searchSnippets = (exaSearch.results ?? [])
    .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.text ?? ""}`)
    .join("\n\n---\n\n")
    .slice(0, 6000);

  // 3. AI synthesis via Claude Haiku
  const aiPrompt = `You are helping a Thai high school student evaluate university options.
University: ${universityName}
Faculty: ${facultyName}
Career Goal: ${careerGoal}
Student scores — Passion: ${passionScore}/100, Future: ${futureScore}/100, Market: ${worldScore}/100

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

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: aiPrompt }],
    }),
  });

  const aiData = await aiRes.json();
  let aiParsed: Record<string, any> = {};
  try {
    aiParsed = JSON.parse(aiData.content?.[0]?.text ?? "{}");
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

  // 5. Save to DB cache (upsert — also updates seeded rows on miss)
  await supabase.from("university_insights_cache").upsert(
    {
      university_name: universityName,
      faculty_name: facultyName,
      career_goal: careerGoal,
      data: result,
      source: "ai",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "university_name,faculty_name,career_goal" },
  );

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "X-Cache": "MISS", ...CORS },
  });
});
