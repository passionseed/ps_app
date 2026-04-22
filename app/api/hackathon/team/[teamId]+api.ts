import { createClient } from "@supabase/supabase-js";
import { corsHeaders, withCors } from "../../../../lib/apiCors";

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";
const MEMBER_SELECT = "id, name, university, track, team_emoji";

const SERVER_STORAGE = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

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

function getRouteSupabase() {
  const url = getEnvVar("EXPO_PUBLIC_SUPABASE_URL");
  const publishableKey = getEnvVar("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const anonKey = getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const supabaseKey = publishableKey || anonKey;

  if (!url || !supabaseKey) {
    throw new Error("Missing Supabase runtime config");
  }

  return createClient(url, supabaseKey, {
    auth: {
      storage: SERVER_STORAGE,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 200, headers: corsHeaders(request) });
}

export async function GET(request: Request, { teamId }: { teamId: string }) {
  if (!teamId?.trim()) {
    return Response.json({ error: "Team ID is required" }, withCors({ status: 400 }, request));
  }

  try {
    const supabase = getRouteSupabase();

    const [teamResult, memberResult, scoreResult] = await Promise.all([
      supabase.from("hackathon_teams").select("*").eq("id", teamId).maybeSingle(),
      supabase
        .from("hackathon_team_members")
        .select("participant_id")
        .eq("team_id", teamId),
      supabase.from("hackathon_team_scores").select("*").eq("team_id", teamId),
    ]);

    if (teamResult.error) throw teamResult.error;
    if (memberResult.error) throw memberResult.error;
    if (scoreResult.error) throw scoreResult.error;
    if (!teamResult.data) {
      return Response.json({ error: "Team not found" }, withCors({ status: 404 }, request));
    }

    const memberIds = Array.from(
      new Set(
        (memberResult.data ?? [])
          .map((row) => row.participant_id)
          .filter((participantId): participantId is string => !!participantId),
      ),
    );

    let members: Array<{
      id: string;
      name: string;
      university?: string | null;
      track?: string | null;
      team_emoji?: string | null;
    }> = [];

    if (memberIds.length > 0) {
      const participantResult = await supabase
        .from("hackathon_participants")
        .select(MEMBER_SELECT)
        .in("id", memberIds);

      if (participantResult.error) throw participantResult.error;

      const participantsById = new Map(
        (participantResult.data ?? [])
          .filter((participant) => !!participant?.id)
          .map((participant) => [participant.id, participant]),
      );

      members = memberIds
        .map((memberId) => participantsById.get(memberId))
        .filter(
          (participant): participant is NonNullable<typeof participant> =>
            !!participant,
        );
    }

    return Response.json(
      {
        team: teamResult.data,
        members,
        scores: scoreResult.data ?? [],
      },
      withCors({
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      }, request),
    );
  } catch (error) {
    console.error("[api/hackathon/team] Failed to load team bundle", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isConfigError = errorMessage.includes("Missing Supabase");
    return Response.json(
      { error: "Failed to load team data", details: errorMessage, isConfigError },
      withCors({ status: isConfigError ? 503 : 500 }, request),
    );
  }
}
