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

    const { messages } = await req.json();
    // messages: Array<{ topic: string, answer: string, followUpAnswer: string }>

    const transcript = messages
      .map((m: { topic: string; answer: string; followUpAnswer: string }) =>
        `Topic: ${m.topic}\nAnswer: ${m.answer}\nFollow-up answer: ${m.followUpAnswer}`
      )
      .join("\n\n");

    const result = await model.generateContent(
      `Extract a structured user profile from this onboarding conversation transcript.

${transcript}

Respond with JSON only, no explanation:
{
  "lifeAreas": [<array of 1-5 short strings, e.g. "health", "career", "relationships", "learning", "finances">],
  "direction": <1-2 sentence string summarising their ambitions and 6-12 month vision>,
  "values": <1 sentence string listing their core values>,
  "blockers": <1 sentence string summarising what's in their way>,
  "weeklyHours": <integer, estimated hours per week they can commit to new habits>
}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[onboarding-extract error]", err);
    return new Response(
      JSON.stringify({ error: "extraction failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
