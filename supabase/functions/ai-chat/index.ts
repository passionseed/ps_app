import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_PRIMARY_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash-lite";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGES = 30;
const MAX_INPUT_LENGTH = 4000;
const MAX_OUTPUT_TOKENS = 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 20;

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_CALLS) {
    return false;
  }
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { system_prompt, messages, mode } =
    body && typeof body === "object"
      ? (body as { system_prompt?: unknown; messages?: unknown; mode?: unknown })
      : {};

  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "messages must be an array" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Greeting mode allows empty messages; chat mode requires at least one
  if (mode !== "greeting" && messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required for chat mode" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Validate auth - require valid JWT or apikey
  const authHeader = req.headers.get("authorization");
  const apikey = req.headers.get("apikey");
  if (!authHeader && !apikey) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Verify user via Supabase auth if JWT provided
  let userId = "anonymous";
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    } catch {
      // Continue with anonymous rate limit
    }
  }

  // Rate limit
  if (!checkRateLimit(userId)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }), {
      status: 429,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Truncate messages to limit
  const trimmedMessages = messages.slice(-MAX_MESSAGES);

  // Validate and sanitize input
  const systemPrompt = typeof system_prompt === "string" ? system_prompt.slice(0, MAX_INPUT_LENGTH) : "You are a helpful assistant.";
  const isGreeting = mode === "greeting";

  // Build conversation history in Gemini format
  const contents = trimmedMessages.map((msg: any) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: String(msg.content ?? "").slice(0, MAX_INPUT_LENGTH) }],
  }));

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const request = {
    contents,
    systemInstruction: isGreeting
      ? `${systemPrompt}\n\nStart the conversation with a friendly greeting in Thai.`
      : systemPrompt,
    generationConfig: {
      temperature: isGreeting ? 0.8 : 0.7,
      maxOutputTokens: isGreeting ? 256 : MAX_OUTPUT_TOKENS,
    },
  };

  try {
    const primaryModel = genAI.getGenerativeModel({ model: GEMINI_PRIMARY_MODEL });
    const result = await primaryModel.generateContent(request);
    const reply = result.response.text() ?? "";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (primaryError) {
    console.error("[ai-chat] Primary model failed:", primaryError);

    try {
      const fallbackModel = genAI.getGenerativeModel({ model: GEMINI_FALLBACK_MODEL });
      const result = await fallbackModel.generateContent(request);
      const reply = result.response.text() ?? "";

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (fallbackError) {
      console.error("[ai-chat] Fallback model also failed:", fallbackError);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  }
});
