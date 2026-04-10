import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

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

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
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
  const sanitizedMessages = trimmedMessages.map((msg: any) => ({
    role: msg.role === "user" ? "User" : "Assistant",
    content: String(msg.content ?? "").slice(0, MAX_INPUT_LENGTH),
  }));

  const isGreeting = mode === "greeting";

  const conversationParts = sanitizedMessages.map((msg: any) => ({
    text: `${msg.role}: ${msg.content}`,
  }));

  const fullPrompt = isGreeting
    ? `${systemPrompt}\n\nStart the conversation with a friendly greeting in Thai.`
    : `${systemPrompt}\n\n${conversationParts.map((p: any) => p.text).join("\n")}\n\nAssistant:`;

  const geminiPayload = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: isGreeting ? 0.8 : 0.7,
      maxOutputTokens: isGreeting ? 256 : MAX_OUTPUT_TOKENS,
    },
  };

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[ai-chat] Gemini error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai-chat] Error:", err);
    return new Response(JSON.stringify({ error: "AI service unavailable" }), {
      status: 503,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
