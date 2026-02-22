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
    const { goalText, measurementTypes, frequencyCount, frequencyUnit, durationType, durationValue } =
      await req.json();

    const durationStr =
      durationType === "date"
        ? `until ${durationValue}`
        : `for ${durationValue}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Do a reality check on this goal commitment:

Goal: "${goalText}"
Proof type: ${measurementTypes.join(", ")}
Frequency: ${frequencyCount} times per ${frequencyUnit}
Duration: ${durationStr}

Respond with JSON only:
{
  "likelihood": <0-100 integer, % chance they complete this>,
  "pitfalls": [<2-3 short strings, common failure points>],
  "suggestions": [<1-2 short strings, concrete improvements>]
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
    return new Response(JSON.stringify({ error: "reality check failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
