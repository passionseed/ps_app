import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { goalText } = await req.json();

    if (!goalText || goalText.trim().length < 5) {
      return new Response(JSON.stringify({ score: 0, tips: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Evaluate this goal on SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound).

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
}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "grading failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
