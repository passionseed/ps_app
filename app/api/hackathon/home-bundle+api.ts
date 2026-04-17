// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";
const LIVE_HACKATHON_PROGRAM_SLUG = "super-seed-hackathon";

const SERVER_STORAGE = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

type QueryResult<T> = Promise<{ data: T; error: null }>;

function resolveQuery<T>(data: T): QueryResult<T> {
  return Promise.resolve({ data, error: null });
}

function getEnvVar(name: string): string | undefined {
  try {
    if (typeof process !== 'undefined' && process.env?.[name]) {
      return process.env[name]?.trim();
    }
  } catch {}
  
  try {
    const globalValue = (globalThis as any)[name];
    if (globalValue) return globalValue?.trim();
  } catch {}
  
  return undefined;
}

function createServerSupabaseClient() {
  const url = getEnvVar("EXPO_PUBLIC_SUPABASE_URL");
  const publishableKey = getEnvVar("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const anonKey = getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const supabaseKey = publishableKey || anonKey;

  if (!url || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, supabaseKey, {
    auth: {
      storage: SERVER_STORAGE as any,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function GET(request: Request) {
  const participantId = new URL(request.url).searchParams
    .get("participant_id")
    ?.trim();

  if (!participantId) {
    return Response.json(
      { error: "participant_id is required" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
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
        globalKeys: Object.keys(globalThis).filter(k => k.startsWith('EXPO_') || k.startsWith('SUPABASE_'))
      }
    }, { status: 500, headers: { "Cache-Control": "no-store" }});
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
      { status: 500, headers: { "Cache-Control": "no-store" }}
    );
  }
}
