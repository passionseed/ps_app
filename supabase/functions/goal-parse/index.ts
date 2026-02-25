import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get("AI_SDK_GEMINI_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const { goalText } = await req.json();

    if (!goalText || goalText.trim().length < 3) {
      return new Response(
        JSON.stringify({ frequencyCount: null, frequencyUnit: null, durationValue: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await model.generateContent(
      `Extract frequency and duration information from this goal text.

Goal: "${goalText}"

Respond with JSON only, no explanation:
{
  "frequencyCount": <integer or null if not stated>,
  "frequencyUnit": <"day" | "week" | "month" | null>,
  "durationValue": <string like "8 weeks" or "until March 2026" or null if not stated>,
  "humanReadable": <short string like "3× per week" or null if nothing extracted>
}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[goal-parse error]", err);
    return new Response(
      JSON.stringify({ error: "parse failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
