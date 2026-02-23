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

    if (!goalText || goalText.trim().length < 5) {
      return new Response(JSON.stringify({ score: 0, tips: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await model.generateContent(
      `Evaluate this goal on SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound).

Goal: "${goalText}"

Respond with JSON only, no explanation:
{
  "score": <0-100 integer, overall SMART score>,
  "tips": {
    "specific": <null if good, or one short tip string>,
    "measurable": <null if good, or one short tip string>,
    "achievable": <null if good, or one short tip string>,
    "relevant": <null if good, or one short tip string>,
    "time_bound": <null if good, or one short tip string>
  }
}`
    );

    const raw = result.response.text();
    // Strip markdown code blocks if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[smart-grade error]", err);
    return new Response(JSON.stringify({ error: "grading failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
