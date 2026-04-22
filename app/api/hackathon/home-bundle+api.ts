// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { corsHeaders, withCors } from "../../../lib/apiCors";

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 200, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const participantId = new URL(request.url).searchParams
    .get("participant_id")
    ?.trim();

  if (!participantId) {
    return Response.json(
      { error: "participant_id is required" },
      withCors({ status: 400, headers: { "Cache-Control": "no-store" } }, request)
    );
  }

  // Return debug info about env vars
  const url = getEnvVar("EXPO_PUBLIC_SUPABASE_URL");
  const key = getEnvVar("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  
  if (!url || !key) {
    return Response.json({
      error: "Missing environment variables",
      debug: {
        hasUrl: !!url,
        hasKey: !!key,
      }
    }, withCors({ status: 500, headers: { "Cache-Control": "no-store" }}, request));
  }

  try {
    // For now just return success - don't actually query Supabase
    return Response.json({
      success: true,
      participantId,
      envVarsFound: true
    });
  } catch (error) {
    console.error("[api/hackathon/home-bundle] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      withCors({ status: 500, headers: { "Cache-Control": "no-store" }}, request)
    );
  }
}
