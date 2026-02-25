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

    const {
      goalText,
      proofTypes = [],
      proofDescription = "",
      userProfile = null,
      parsedFrequency = null,
    } = await req.json();

    if (!goalText || goalText.trim().length < 5) {
      return new Response(
        JSON.stringify({ score: 0, scores: { specific: 0, measurable: 0, achievable: 0, relevant: 0, time_bound: 0 }, tips: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const proofContext = proofTypes.length > 0
      ? `Proof types selected: ${proofTypes.join(", ")}${proofDescription ? `. Description: "${proofDescription}"` : ""}`
      : "No proof type selected yet.";

    const profileContext = userProfile
      ? `User profile: focuses on ${userProfile.lifeAreas?.join(", ")}. Direction: ${userProfile.direction}. Values: ${userProfile.values}.`
      : "No user profile available.";

    const frequencyContext = parsedFrequency
      ? `Frequency extracted from goal: ${parsedFrequency}`
      : "No frequency or time commitment found in the goal text.";

    const result = await model.generateContent(
      `Evaluate this goal on all 5 SMART dimensions.

Goal: "${goalText}"
${proofContext}
${profileContext}
${frequencyContext}

Scoring rules:
- S (Specific): How clearly defined is the action/outcome?
- M (Measurable): Score 0-30 if no proof type selected. Score based on how well the selected proof type + description actually proves the goal was done.
- A (Achievable): Is this realistic? Consider frequency if provided.
- R (Relevant): Score 0 and tip "Complete onboarding to grade this" if no user profile. Otherwise score how well the goal aligns with their life areas, direction, and values.
- T (Time-bound): Score 0-20 if no frequency extracted. Score based on how specific the time commitment is.

Respond with JSON only, no explanation:
{
  "score": <0-100 integer, weighted average>,
  "scores": {
    "specific": <0-100>,
    "measurable": <0-100>,
    "achievable": <0-100>,
    "relevant": <0-100>,
    "time_bound": <0-100>
  },
  "tips": {
    "specific": <null if score >= 75, else one short tip>,
    "measurable": <"Select a proof type to grade this" if no proof, null if score >= 75, else tip>,
    "achievable": <null if score >= 75, else tip>,
    "relevant": <"Complete onboarding to grade this" if no profile, null if score >= 75, else tip>,
    "time_bound": <"Add a frequency to your goal, e.g. '3× a week'" if nothing extracted, null if score >= 75, else tip>
  }}`
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[smart-grade error]", err);
    return new Response(
      JSON.stringify({ error: "grading failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
