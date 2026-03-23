import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Gemini API config
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.5-flash";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreEngineRequest {
  reflectionId: string;
  enrollmentId: string;
  openResponse: string;
  energyLevel: number;
  confusionLevel: number;
  interestLevel: number;
  dayNumber: number;
  seedTitle?: string;
}

interface IkigaiScores {
  passion: number; // What you love
  mission: number; // What the world needs
  vocation: number; // What you're good at
  profession: number; // What you can be paid for
  overall: number; // Weighted average
}

interface ScoreEngineResponse {
  success: boolean;
  scores: IkigaiScores;
  analysis: string;
  signalData: {
    energyLevel: number;
    confusionLevel: number;
    interestLevel: number;
    dayNumber: number;
    language: string;
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Detect if text is primarily Thai
 */
function detectLanguage(text: string): "th" | "en" {
  const thaiChars = /[\u0E00-\u0E7F]/;
  const thaiCount = (text.match(new RegExp(thaiChars, "g")) || []).length;
  const totalChars = text.replace(/\s/g, "").length;

  if (totalChars === 0) return "en";
  return thaiCount / totalChars > 0.3 ? "th" : "en";
}

/**
 * Build the LLM prompt for ikigai score extraction
 */
function buildScoringPrompt(
  openResponse: string,
  energyLevel: number,
  confusionLevel: number,
  interestLevel: number,
  seedTitle?: string
): string {
  const language = detectLanguage(openResponse);
  const isThai = language === "th";

  const seedContext = seedTitle
    ? `The student is exploring the career path: "${seedTitle}".`
    : "The student is exploring a career path.";

  const basePrompt = isThai
    ? `คุณเป็นนักจิตวิทยาการศึกษาที่เชี่ยวชาญในการวิเคราะห์แรงบันดาลใจและความสนใจของนักเรียน

${seedContext}

นักเรียนได้เขียนบันทึกการสะท้อนคิดหลังจากเรียนรู้ในวันนี้:

---
${openResponse}
---

ระดับคะแนนที่นักเรียนให้ตนเอง:
- พลังงาน (1-5): ${energyLevel}
- ความสับสน (1-5): ${confusionLevel}
- ความสนใจ (1-5): ${interestLevel}

กรุณาวิเคราะห์ข้อความสะท้อนคิดและให้คะแนน Ikigai 4 ด้าน (1-10) สำหรับนักเรียนคนนี้:

1. **Passion (สิ่งที่รัก)** - ความกระตือรือร้น ความสุข และความสนใจที่แสดงออกมา
2. **Mission (สิ่งที่โลกต้องการ)** - ความต้องการช่วยเหลือผู้อื่น สร้างผลกระทบ หรือแก้ปัญหาสังคม
3. **Vocation (สิ่งที่ถนัด)** - ความมั่นใจในทักษะ ความเข้าใจในตนเอง และการยอมรับความสามารถ
4. **Profession (สิ่งที่สร้างรายได้)** - ความตระหนักถึงโอกาสอาชีพ ความสนใจในเส้นทางอาชีพ และความจริงจัง

ตอบกลับในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "scores": {
    "passion": number (1-10),
    "mission": number (1-10),
    "vocation": number (1-10),
    "profession": number (1-10),
    "overall": number (1-10) // ค่าเฉลี่ยถ่วงน้ำหนัก
  },
  "analysis": "คำอธิบายสั้นๆ เป็นภาษาไทยเกี่ยวกับสิ่งที่คุณพบจากการวิเคราะห์ (1-2 ประโยค)"
}`
    : `You are an educational psychologist specializing in analyzing student motivation and interests.

${seedContext}

The student wrote a reflection after today's learning:

---
${openResponse}
---

Self-reported ratings:
- Energy level (1-5): ${energyLevel}
- Confusion level (1-5): ${confusionLevel}
- Interest level (1-5): ${interestLevel}

Please analyze the reflection text and provide Ikigai scores (1-10) for this student:

1. **Passion** - Enthusiasm, joy, and interest expressed
2. **Mission** - Desire to help others, create impact, or solve social problems
3. **Vocation** - Confidence in skills, self-awareness, and acknowledgment of abilities
4. **Profession** - Awareness of career opportunities, interest in career paths, and seriousness

Respond with JSON in this format:
{
  "scores": {
    "passion": number (1-10),
    "mission": number (1-10),
    "vocation": number (1-10),
    "profession": number (1-10),
    "overall": number (1-10) // weighted average
  },
  "analysis": "Brief explanation in English about what you found from the analysis (1-2 sentences)"
}`;

  return basePrompt;
}

/**
 * Call Gemini API to extract ikigai scores
 */
async function extractIkigaiScores(
  openResponse: string,
  energyLevel: number,
  confusionLevel: number,
  interestLevel: number,
  seedTitle?: string
): Promise<{ scores: IkigaiScores; analysis: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = buildScoringPrompt(
    openResponse,
    energyLevel,
    confusionLevel,
    interestLevel,
    seedTitle
  );

  const geminiPayload = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[score-engine] Gemini API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(
      `Gemini API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  const data = await response.json();
  const responseText =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    '{"scores":{"passion":5,"mission":5,"vocation":5,"profession":5,"overall":5},"analysis":"No analysis available"}';

  // Parse the JSON response
  try {
    const parsed = JSON.parse(responseText);

    // Validate scores
    const scores: IkigaiScores = {
      passion: clampScore(parsed.scores?.passion),
      mission: clampScore(parsed.scores?.mission),
      vocation: clampScore(parsed.scores?.vocation),
      profession: clampScore(parsed.scores?.profession),
      overall: clampScore(parsed.scores?.overall),
    };

    return {
      scores,
      analysis: parsed.analysis || "Analysis not available",
    };
  } catch (parseError) {
    console.error("[score-engine] Failed to parse Gemini response:", responseText);
    // Return default scores if parsing fails
    return {
      scores: {
        passion: 5,
        mission: 5,
        vocation: 5,
        profession: 5,
        overall: 5,
      },
      analysis: "Could not analyze reflection text",
    };
  }
}

/**
 * Clamp score to valid range (1-10)
 */
function clampScore(score: number | undefined): number {
  if (typeof score !== "number" || isNaN(score)) return 5;
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Calculate weighted overall score
 */
function calculateOverallScore(scores: Omit<IkigaiScores, "overall">): number {
  // Weight passion and interest higher as they indicate intrinsic motivation
  const weighted =
    scores.passion * 0.3 +
    scores.mission * 0.25 +
    scores.vocation * 0.2 +
    scores.profession * 0.25;
  return Math.round(weighted);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Validate auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[score-engine] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[score-engine] Authenticated user: ${user.id}`);

    // ── 2. Parse request ─────────────────────────────────────────────────────
    const body: ScoreEngineRequest = await req.json();
    const {
      reflectionId,
      enrollmentId,
      openResponse,
      energyLevel,
      confusionLevel,
      interestLevel,
      dayNumber,
      seedTitle,
    } = body;

    // Validate required fields
    if (!reflectionId || !enrollmentId || !openResponse) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: reflectionId, enrollmentId, openResponse",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 3. Call Gemini API to extract scores ─────────────────────────────────
    console.log("[score-engine] Analyzing reflection for user:", user.id);
    const language = detectLanguage(openResponse);
    console.log(`[score-engine] Detected language: ${language}`);

    const { scores: extractedScores, analysis } = await extractIkigaiScores(
      openResponse,
      energyLevel || 3,
      confusionLevel || 3,
      interestLevel || 3,
      seedTitle
    );

    // Calculate overall score if not provided by LLM
    const overallScore =
      extractedScores.overall ||
      calculateOverallScore({
        passion: extractedScores.passion,
        mission: extractedScores.mission,
        vocation: extractedScores.vocation,
        profession: extractedScores.profession,
      });

    const finalScores: IkigaiScores = {
      ...extractedScores,
      overall: overallScore,
    };

    // ── 4. Store score event in database ─────────────────────────────────────
    const { error: insertError } = await supabase.from("score_events").insert({
      user_id: user.id,
      enrollment_id: enrollmentId,
      reflection_id: reflectionId,
      passion_score: finalScores.passion,
      mission_score: finalScores.mission,
      vocation_score: finalScores.vocation,
      profession_score: finalScores.profession,
      overall_score: finalScores.overall,
      analysis: analysis,
      signal_data: {
        energy_level: energyLevel,
        confusion_level: confusionLevel,
        interest_level: interestLevel,
        day_number: dayNumber,
        language: language,
        seed_title: seedTitle,
      },
    });

    if (insertError) {
      console.error("[score-engine] Error storing score event:", insertError);
      // Don't fail the request, just log the error
    }

    // ── 5. Return response ───────────────────────────────────────────────────
    const response: ScoreEngineResponse = {
      success: true,
      scores: finalScores,
      analysis,
      signalData: {
        energyLevel: energyLevel || 0,
        confusionLevel: confusionLevel || 0,
        interestLevel: interestLevel || 0,
        dayNumber: dayNumber || 0,
        language,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[score-engine] Error:", err);
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
