import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limiting config
const RATE_LIMIT_MESSAGES_PER_MINUTE = 10;

// Gemini API config
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.5-flash";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIChatRequest {
  message: string;
  systemPrompt?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  activityId?: string;
  enrollmentId?: string;
  sessionId?: string;
}

interface AIChatResponse {
  response: string;
  usage?: {
    messageCount: number;
    windowStart: string;
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Check rate limit and increment usage for a user
 */
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  activityId?: string,
  enrollmentId?: string,
  sessionId?: string
): Promise<{ allowed: boolean; currentCount: number; windowStart: string }> {
  // Call the database function to increment usage
  const { data, error } = await supabase.rpc("increment_ai_chat_usage", {
    p_user_id: userId,
    p_activity_id: activityId || null,
    p_enrollment_id: enrollmentId || null,
    p_session_id: sessionId || null,
  });

  if (error) {
    console.error("[ai-chat] Error incrementing usage:", error);
    // Fail open - allow the request but log the error
    return { allowed: true, currentCount: 0, windowStart: new Date().toISOString() };
  }

  const result = data?.[0];
  const currentCount = result?.current_count || 0;
  const windowStart = result?.window_start || new Date().toISOString();

  const allowed = currentCount <= RATE_LIMIT_MESSAGES_PER_MINUTE;

  console.log(`[ai-chat] Rate limit check for user ${userId}: ${currentCount}/${RATE_LIMIT_MESSAGES_PER_MINUTE} messages`);

  return { allowed, currentCount, windowStart };
}

/**
 * Call Gemini API with the conversation
 */
async function callGeminiAPI(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentMessage: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  // Build conversation parts
  const conversationParts = conversationHistory.map((msg) => ({
    text: `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
  }));

  // Add current message
  conversationParts.push({
    text: `User: ${currentMessage}`,
  });

  const geminiPayload = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\n${conversationParts.map((p) => p.text).join("\n")}\n\nAssistant:`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
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
    console.error("[ai-chat] Gemini API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Gemini API error (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const assistantContent =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I couldn't generate a response.";

  return assistantContent;
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[ai-chat] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-chat] Authenticated user: ${user.id}`);

    // ── 2. Parse request ─────────────────────────────────────────────────────
    const body: AIChatRequest = await req.json();
    const {
      message,
      systemPrompt = "You are a helpful assistant.",
      conversationHistory = [],
      activityId,
      enrollmentId,
      sessionId,
    } = body;

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Check rate limit ──────────────────────────────────────────────────
    const { allowed, currentCount, windowStart } = await checkRateLimit(
      supabase,
      user.id,
      activityId,
      enrollmentId,
      sessionId
    );

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `You have exceeded the limit of ${RATE_LIMIT_MESSAGES_PER_MINUTE} messages per minute. Please wait a moment before sending more messages.`,
          limit: RATE_LIMIT_MESSAGES_PER_MINUTE,
          current: currentCount,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Call Gemini API ───────────────────────────────────────────────────
    console.log("[ai-chat] Calling Gemini API for user:", user.id);
    const assistantResponse = await callGeminiAPI(
      systemPrompt,
      conversationHistory,
      message.trim()
    );

    // ── 5. Return response ───────────────────────────────────────────────────
    const response: AIChatResponse = {
      response: assistantResponse,
      usage: {
        messageCount: currentCount,
        windowStart,
      },
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ai-chat] Error:", err);
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
