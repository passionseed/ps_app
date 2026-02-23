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

    const { goalText, measurementTypes, frequencyCount, frequencyUnit, durationType, durationValue } =
      await req.json();

    const durationStr =
      durationType === "date"
        ? `until ${durationValue}`
        : `for ${durationValue}`;

    const result = await model.generateContent(
      `Do a reality check on this goal commitment:

Goal: "${goalText}"
Proof type: ${measurementTypes.join(", ")}
Frequency: ${frequencyCount} times per ${frequencyUnit}
Duration: ${durationStr}

Respond with JSON only:
{
  "likelihood": <0-100 integer, % chance they complete this>,
  "pitfalls": [<2-3 short strings, common failure points>],
  "suggestions": [<1-2 short strings, concrete improvements]>
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
    console.error("[reality-check error]", err);
    return new Response(JSON.stringify({ error: "reality check failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
