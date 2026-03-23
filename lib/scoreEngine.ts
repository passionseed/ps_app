// Score Engine client helper for fetching user scores
import { supabase } from "./supabase";

export interface IkigaiScores {
  passion: number;
  mission: number;
  profession: number;
  vocation: number;
}

export interface ScoreEvent {
  id: string;
  user_id: string;
  journey_id: string | null;
  reflection_id: string | null;
  score_type: "daily_reflection" | "journey_progress" | "milestone" | "bonus";
  score_value: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface JourneyScores {
  passion: number;
  future: number;
  world: number;
}

export interface StudentJourney {
  id: string;
  student_id: string;
  title: string;
  career_goal: string;
  source: "ai_generated" | "manual";
  steps: unknown[];
  scores: JourneyScores | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoreTimelineItem {
  date: string;
  passion: number;
  mission: number;
  profession: number;
  vocation: number;
}

/**
 * Get the user's active journey with scores
 */
export async function getUserActiveJourney(): Promise<StudentJourney | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("student_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("Error fetching active journey:", error);
    return null;
  }

  return data as StudentJourney | null;
}

/**
 * Get all user journeys
 */
export async function getUserJourneys(): Promise<StudentJourney[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("student_journeys")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching journeys:", error);
    return [];
  }

  return (data as StudentJourney[]) || [];
}

/**
 * Map journey scores to ikigai format
 * - passion -> passion (what you love)
 * - future -> mission (what the world needs)
 * - world -> profession (what you can be paid for)
 * - vocation is calculated as average of the three
 */
export function mapJourneyScoresToIkigai(
  scores: JourneyScores | null
): IkigaiScores {
  if (!scores) {
    return {
      passion: 0,
      mission: 0,
      profession: 0,
      vocation: 0,
    };
  }

  const passion = scores.passion || 0;
  const mission = scores.future || 0;
  const profession = scores.world || 0;
  // Vocation is the average of the three (what you're good at)
  const vocation = Math.round((passion + mission + profession) / 3);

  return {
    passion,
    mission,
    profession,
    vocation,
  };
}

/**
 * Get user's ikigai scores from their active journey
 */
export async function getUserIkigaiScores(): Promise<IkigaiScores | null> {
  const journey = await getUserActiveJourney();
  if (!journey) return null;
  return mapJourneyScoresToIkigai(journey.scores);
}

/**
 * Get score events for timeline visualization
 */
export async function getScoreEvents(
  journeyId?: string,
  limit: number = 30
): Promise<ScoreEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("score_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (journeyId) {
    query = query.eq("journey_id", journeyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching score events:", error);
    return [];
  }

  return (data as ScoreEvent[]) || [];
}

/**
 * Build score timeline from score events
 * Groups events by date and extracts scores from metadata
 */
export async function getScoreTimeline(
  journeyId?: string
): Promise<ScoreTimelineItem[]> {
  const events = await getScoreEvents(journeyId, 50);

  if (events.length === 0) {
    return [];
  }

  // Group events by date (YYYY-MM-DD)
  const eventsByDate = new Map<string, ScoreEvent[]>();

  events.forEach((event) => {
    const date = event.created_at.split("T")[0];
    if (!eventsByDate.has(date)) {
      eventsByDate.set(date, []);
    }
    eventsByDate.get(date)!.push(event);
  });

  // Build timeline items from events
  const timeline: ScoreTimelineItem[] = [];

  eventsByDate.forEach((dateEvents, date) => {
    // Get the latest scores from metadata or use score_value
    const latestEvent = dateEvents[0];
    const metadata = (latestEvent.metadata as { scores?: IkigaiScores }) || {};

    if (metadata.scores) {
      timeline.push({
        date,
        passion: metadata.scores.passion || 0,
        mission: metadata.scores.mission || 0,
        profession: metadata.scores.profession || 0,
        vocation: metadata.scores.vocation || 0,
      });
    } else {
      // Fallback: use score_value for all dimensions
      const score = latestEvent.score_value;
      timeline.push({
        date,
        passion: score,
        mission: score,
        profession: score,
        vocation: score,
      });
    }
  });

  // Sort by date ascending (oldest first)
  return timeline.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Get the latest score event for each dimension
 */
export async function getLatestScoresByDimension(): Promise<{
  passion: ScoreEvent | null;
  mission: ScoreEvent | null;
  profession: ScoreEvent | null;
  vocation: ScoreEvent | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { passion: null, mission: null, profession: null, vocation: null };
  }

  const { data, error } = await supabase
    .from("score_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    return { passion: null, mission: null, profession: null, vocation: null };
  }

  const events = data as ScoreEvent[];

  // Find latest event for each dimension from metadata
  const result = {
    passion: null as ScoreEvent | null,
    mission: null as ScoreEvent | null,
    profession: null as ScoreEvent | null,
    vocation: null as ScoreEvent | null,
  };

  for (const event of events) {
    const metadata = event.metadata as { dimension?: string } | null;
    const dimension = metadata?.dimension;

    if (dimension && !result[dimension as keyof typeof result]) {
      result[dimension as keyof typeof result] = event;
    }

    // Stop if we have all dimensions
    if (result.passion && result.mission && result.profession && result.vocation) {
      break;
    }
  }

  return result;
}

/**
 * Check if user has any scores yet
 */
export async function hasUserScores(): Promise<boolean> {
  const journey = await getUserActiveJourney();
  if (journey?.scores) {
    const scores = journey.scores;
    return scores.passion > 0 || scores.future > 0 || scores.world > 0;
  }
  return false;
}
