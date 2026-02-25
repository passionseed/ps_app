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

    const { goalText, proofTypes, parsedFrequency } = await req.json();

    const frequencyStr = parsedFrequency ?? "frequency not specified";

    const result = await model.generateContent(
      `Do a reality check on this goal commitment:

Goal: "${goalText}"
Proof type: ${(proofTypes ?? []).join(", ") || "not specified"}
Frequency: ${frequencyStr}

Respond with JSON only:
{
  "likelihood": <0-100 integer, % chance they complete this>,
  "pitfalls": [<2-3 short strings, common failure points>],
  "suggestions": [<1-2 short strings, concrete improvements>]}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[reality-check error]", err);
    return new Response(
      JSON.stringify({ error: "reality check failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
