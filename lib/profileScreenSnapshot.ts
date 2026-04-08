import type { UserEvent } from "../types/events";
import type { CareerGoal, InterestCategory } from "../types/onboarding";
import {
  PROFILE_SCREEN_CACHE_SCHEMA_VERSION,
  type ProfileScreenSnapshot,
} from "./profileScreenCache";
import type { IkigaiScores, ScoreTimelineItem } from "./scoreEngine";
import { getProfile } from "./onboarding";
import { supabase } from "./supabase";

const inFlightProfileScreenSnapshotRequests = new Map<
  string,
  Promise<ProfileScreenSnapshot>
>();

function buildProfileScoreSnapshot(
  journey: any,
  scoreEvents: any[],
): Pick<ProfileScreenSnapshot, "ikigaiScores" | "hasScores" | "scoreTimeline"> {
  let ikigaiScores: IkigaiScores | null = null;
  let hasScores = false;

  if (journey?.scores) {
    const scores = journey.scores;
    const passion = scores.passion || 0;
    const mission = scores.future || 0;
    const profession = scores.world || 0;
    const vocation = Math.round((passion + mission + profession) / 3);
    ikigaiScores = { passion, mission, profession, vocation };
    hasScores = passion > 0 || mission > 0 || profession > 0;
  } else if (scoreEvents.length > 0) {
    const latestMeta = (scoreEvents[0].metadata as Record<string, number>) || {};
    const passion = latestMeta.passion || 0;
    const mission = latestMeta.mission || 0;
    const profession = latestMeta.profession || 0;
    const vocation =
      latestMeta.vocation || Math.round((passion + mission + profession) / 3);
    ikigaiScores = { passion, mission, profession, vocation };
    hasScores = passion > 0 || mission > 0 || profession > 0;
  }

  let scoreTimeline: ScoreTimelineItem[] = [];

  if (scoreEvents.length > 0) {
    const eventsByDate = new Map<string, any[]>();

    for (const event of scoreEvents) {
      const date = event.created_at.split("T")[0];
      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, []);
      }
      eventsByDate.get(date)!.push(event);
    }

    scoreTimeline = Array.from(eventsByDate.entries())
      .map(([date, events]) => {
        const meta = (events[0].metadata as Record<string, number>) || {};
        return {
          date,
          passion: meta.passion || 0,
          mission: meta.mission || 0,
          profession: meta.profession || 0,
          vocation: meta.vocation || 0,
        };
      })
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
  }

  return {
    ikigaiScores,
    hasScores,
    scoreTimeline,
  };
}

export async function fetchProfileScreenSnapshot(
  userId: string,
): Promise<ProfileScreenSnapshot> {
  const existingRequest = inFlightProfileScreenSnapshotRequests.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const [
      profileData,
      interestsData,
      careersData,
      journeyData,
      scoreEventsData,
      portfolioData,
      savedProgramsData,
      eventsData,
      adminRoleData,
    ] = await Promise.all([
      getProfile(userId),
      supabase.from("user_interests").select("*").eq("user_id", userId),
      supabase.from("career_goals").select("*").eq("user_id", userId),
      supabase
        .from("student_journeys")
        .select("*")
        .eq("student_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .maybeSingle(),
      supabase
        .from("score_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("student_portfolio_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("saved_programs")
        .select("id,user_id,program_id,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_events")
        .select("id,user_id,event_type,event_data,session_id,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    const scoreEvents = (scoreEventsData.data as any[]) || [];
    const { ikigaiScores, hasScores, scoreTimeline } = buildProfileScoreSnapshot(
      journeyData.data,
      scoreEvents,
    );

    return {
      version: PROFILE_SCREEN_CACHE_SCHEMA_VERSION,
      userId,
      cachedAt: new Date().toISOString(),
      profile: profileData,
      interests: (interestsData.data as InterestCategory[] | null) ?? [],
      careers: (careersData.data as CareerGoal[] | null) ?? [],
      ikigaiScores,
      hasScores,
      scoreTimeline,
      activityEvents: (eventsData.data as UserEvent[] | null) ?? [],
      portfolioCount: (portfolioData.data as any[])?.length ?? 0,
      savedProgramsCount: (savedProgramsData.data as any[])?.length ?? 0,
      isAdmin: Boolean(adminRoleData.data),
    };
  })();

  inFlightProfileScreenSnapshotRequests.set(userId, request);

  try {
    return await request;
  } finally {
    if (inFlightProfileScreenSnapshotRequests.get(userId) === request) {
      inFlightProfileScreenSnapshotRequests.delete(userId);
    }
  }
}
