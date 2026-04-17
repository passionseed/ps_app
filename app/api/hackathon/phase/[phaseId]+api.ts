import { createClient } from "@supabase/supabase-js";
import type {
  HackathonPhaseDetail,
  HackathonPhaseModule,
  HackathonPhasePlaylist,
  HackathonProgramPhase,
} from "../../../../types/hackathon-program";

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";

const SERVER_STORAGE = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      ...(init?.headers ?? {}),
    },
  });
}

function getEnvVar(name: string): string | undefined {
  try {
    return process.env[name]?.trim();
  } catch {
    return undefined;
  }
}

function getSupabaseClient() {
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

export async function GET(
  _request: Request,
  { phaseId }: { phaseId: string },
) {
  try {
    const supabase = getSupabaseClient();
    const [phaseResult, playlistsResult] = await Promise.all([
      supabase
        .from("hackathon_program_phases")
        .select("*")
        .eq("id", phaseId)
        .single(),
      supabase
        .from("hackathon_phase_playlists")
        .select("*")
        .eq("phase_id", phaseId)
        .order("display_order", { ascending: true }),
    ]);

    if (phaseResult.error || !phaseResult.data) {
      if (phaseResult.error?.code === "PGRST116" || !phaseResult.data) {
        return json({ error: "Phase not found" }, { status: 404 });
      }
      throw phaseResult.error;
    }

    if (playlistsResult.error) {
      throw playlistsResult.error;
    }

    const playlists = (playlistsResult.data ?? []) as HackathonPhasePlaylist[];
    const playlistIds = playlists.map((playlist) => playlist.id);

    const modulesResult = playlistIds.length
      ? await supabase
          .from("hackathon_phase_modules")
          .select("*")
          .in("playlist_id", playlistIds)
          .order("display_order", { ascending: true })
      : { data: [] as HackathonPhaseModule[], error: null };

    if (modulesResult.error) {
      throw modulesResult.error;
    }

    const modules = (modulesResult.data ?? []) as HackathonPhaseModule[];
    const detail: HackathonPhaseDetail = {
      phase: phaseResult.data as HackathonProgramPhase,
      playlists: playlists.map((playlist) => ({
        ...playlist,
        modules: modules.filter((module) => module.playlist_id === playlist.id),
      })),
    };

    return json(detail);
  } catch (error) {
    console.error("[api/hackathon/phase/[phaseId]] failed to load phase detail", error);
    return json({ error: "Unable to load hackathon phase" }, { status: 500 });
  }
}
