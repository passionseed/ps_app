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

    const { topic, answer } = await req.json();

    const result = await model.generateContent(
      `You are a warm, curious onboarding coach for a goal accountability app.
The user just answered a question about their "${topic}".
Their answer: "${answer}"

Generate ONE short, warm follow-up question (1 sentence, max 15 words) that digs a little deeper into their answer.
Do not repeat the topic name. Be conversational, not clinical.
Respond with the question only, no explanation.`
    );

    const followUp = result.response.text().trim();
    return new Response(JSON.stringify({ followUp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[onboarding-followup error]", err);
    return new Response(
      JSON.stringify({ error: "followup failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
