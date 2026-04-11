import { readHackathonParticipant } from "./hackathon-mode";
import { supabase } from "./supabase";

export type MentorGuide = {
  id: string;
  mentor_name: string;
  mentor_photo_url: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  points_on_completion: number;
  estimated_minutes: number;
  display_order: number;
  is_published: boolean;
  uses_daily_unlock: boolean;
  total_days: number;
};

export type MentorGuidePage = {
  id: string;
  guide_id: string;
  page_number: number;
  title: string | null;
  content: string;
  content_type: string;
  display_order: number;
};

export type DayProgress = {
  day_number: number;
  is_completed: boolean;
  is_unlocked: boolean;
  prompt_content: string | null;
  affirmation_content: string | null;
};

export type GuideWithCompletion = MentorGuide & {
  is_completed: boolean;
  days_completed: number;
  current_unlocked_day: number;
};

// ---------------------------------------------------------------------------
// Fetch guides
// ---------------------------------------------------------------------------

export async function fetchMentorGuides(): Promise<MentorGuide[]> {
  const { data, error } = await supabase
    .from("mentor_guides")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.warn("[mentor-guides] fetch failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchGuideWithCompletion(
  guideId: string
): Promise<GuideWithCompletion | null> {
  const participant = await readHackathonParticipant();

  const [{ data: guide }] = await Promise.all([
    supabase
      .from("mentor_guides")
      .select("*")
      .eq("id", guideId)
      .eq("is_published", true)
      .maybeSingle(),
  ]);

  if (!guide) return null;

  // Fetch day progress if guide uses daily unlock
  let daysCompleted = 0;
  if (guide.uses_daily_unlock && participant?.id) {
    const { data: dayProgress } = await supabase
      .from("mentor_guide_day_progress")
      .select("day_number")
      .eq("guide_id", guideId)
      .eq("participant_id", participant.id);

    daysCompleted = dayProgress?.length ?? 0;
  }

  const isCompleted = guide.uses_daily_unlock
    ? daysCompleted >= guide.total_days
    : false;

  return {
    ...guide,
    is_completed: isCompleted,
    days_completed: daysCompleted,
    current_unlocked_day: daysCompleted + 1, // next day to unlock
  };
}

// ---------------------------------------------------------------------------
// Day-based progression
// ---------------------------------------------------------------------------

export async function fetchGuideDays(
  guideId: string
): Promise<DayProgress[]> {
  const participant = await readHackathonParticipant();

  const [{ data: guide }, { data: completedDays }] = await Promise.all([
    supabase
      .from("mentor_guides")
      .select("total_days, uses_daily_unlock")
      .eq("id", guideId)
      .maybeSingle(),
    participant?.id
      ? supabase
          .from("mentor_guide_day_progress")
          .select("day_number, completed_at")
          .eq("guide_id", guideId)
          .eq("participant_id", participant.id)
          .order("day_number", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (!guide) return [];

  const totalDays = guide.total_days ?? 7;
  const completedSet = new Set((completedDays ?? []).map((d: any) => d.day_number));

  // Fetch page content for each day
  const { data: allPages } = await supabase
    .from("mentor_guide_pages")
    .select("*")
    .eq("guide_id", guideId)
    .order("display_order", { ascending: true });

  // Group pages by day_number
  const pagesByDay = new Map<number, { prompt: string | null; affirmation: string | null }>();
  for (const page of allPages ?? []) {
    if (!pagesByDay.has(page.page_number)) {
      pagesByDay.set(page.page_number, { prompt: null, affirmation: null });
    }
    const existing = pagesByDay.get(page.page_number)!;
    if (page.content_type === "prompt") {
      existing.prompt = page.content;
    } else if (page.content_type === "affirmation") {
      existing.affirmation = page.content;
    }
  }

  const days: DayProgress[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const pageData = pagesByDay.get(day) ?? { prompt: null, affirmation: null };
    days.push({
      day_number: day,
      is_completed: completedSet.has(day),
      is_unlocked: day === 1 || completedSet.has(day - 1),
      prompt_content: pageData.prompt,
      affirmation_content: pageData.affirmation,
    });
  }

  return days;
}

export async function completeDay(
  guideId: string,
  dayNumber: number
): Promise<{ awarded: number }> {
  const participant = await readHackathonParticipant();
  if (!participant) throw new Error("Not logged in");

  // 1. Check previous day is completed (lock enforcement)
  if (dayNumber > 1) {
    const { data: prevDay } = await supabase
      .from("mentor_guide_day_progress")
      .select("id")
      .eq("guide_id", guideId)
      .eq("participant_id", participant.id)
      .eq("day_number", dayNumber - 1)
      .maybeSingle();

    if (!prevDay) throw new Error("Previous day not completed");
  }

  // 2. Upsert day progress (idempotent)
  const { error: dayError } = await supabase
    .from("mentor_guide_day_progress")
    .upsert(
      {
        participant_id: participant.id,
        guide_id: guideId,
        day_number: dayNumber,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "participant_id,guide_id,day_number" }
    );

  if (dayError) {
    if (dayError.code === "23505") return { awarded: 0 }; // already done
    throw new Error(dayError.message);
  }

  // 3. Check if all days are done → award points
  const { data: guide } = await supabase
    .from("mentor_guides")
    .select("total_days, points_on_completion")
    .eq("id", guideId)
    .maybeSingle();

  if (!guide) return { awarded: 0 };

  const { data: allDays } = await supabase
    .from("mentor_guide_day_progress")
    .select("day_number")
    .eq("guide_id", guideId)
    .eq("participant_id", participant.id);

  const completedCount = allDays?.length ?? 0;

  if (completedCount >= guide.total_days) {
    // All days done — award points
    return awardGuidePoints(guideId, guide.points_on_completion, participant.id);
  }

  return { awarded: 0 };
}

async function awardGuidePoints(
  guideId: string,
  points: number,
  participantId: string
): Promise<{ awarded: number }> {
  // 1. Find the team
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!membership?.team_id) return { awarded: 0 };

  // 2. Mark guide as completed (idempotent)
  const { error: completionError } = await supabase
    .from("mentor_guide_completions")
    .upsert(
      {
        participant_id: participantId,
        guide_id: guideId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "participant_id,guide_id" }
    );

  if (completionError && completionError.code !== "23505") {
    console.warn("[mentor-guides] completion upsert failed:", completionError.message);
    return { awarded: 0 };
  }

  // 3. Log score event
  const { error: eventError } = await supabase
    .from("hackathon_team_score_events")
    .insert({
      team_id: membership.team_id,
      submission_id: null,
      activity_id: null,
      participant_id: participantId,
      scope: "team",
      points_possible: points,
      member_count: 1,
      points_awarded: points,
    });

  if (eventError && eventError.code !== "23505") {
    console.warn("[mentor-guides] score event failed:", eventError.message);
  }

  // 4. Update team total
  const { data: existing } = await supabase
    .from("hackathon_team_scores")
    .select("id, total_score")
    .eq("team_id", membership.team_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("hackathon_team_scores")
      .update({ total_score: existing.total_score + points })
      .eq("team_id", membership.team_id);
  } else {
    await supabase
      .from("hackathon_team_scores")
      .insert({ team_id: membership.team_id, total_score: points });
  }

  return { awarded: points };
}

// ---------------------------------------------------------------------------
// Legacy helpers (for non-daily-lock guides)
// ---------------------------------------------------------------------------

export async function fetchGuidePages(guideId: string): Promise<MentorGuidePage[]> {
  const { data, error } = await supabase
    .from("mentor_guide_pages")
    .select("*")
    .eq("guide_id", guideId)
    .order("display_order", { ascending: true });

  if (error) {
    console.warn("[mentor-guides] pages fetch failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function completeGuide(guideId: string): Promise<{ awarded: number }> {
  const participant = await readHackathonParticipant();
  if (!participant) throw new Error("Not logged in");
  return awardGuidePoints(guideId, 5, participant.id);
}

export async function hasCompletedGuide(guideId: string): Promise<boolean> {
  const participant = await readHackathonParticipant();
  if (!participant) return false;

  const { data } = await supabase
    .from("mentor_guide_completions")
    .select("id")
    .eq("guide_id", guideId)
    .eq("participant_id", participant.id)
    .maybeSingle();

  return !!data;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CategoryInfo = {
  key: string;
  label: string;
  emoji: string;
  color: string;
};

export const GUIDE_CATEGORIES: CategoryInfo[] = [
  { key: "mindfulness", label: "Mindfulness", emoji: "🧘", color: "#91C4E3" },
  { key: "tech", label: "Tech", emoji: "💻", color: "#65ABFC" },
  { key: "design", label: "Design", emoji: "🎨", color: "#A594BA" },
  { key: "business", label: "Business", emoji: "📊", color: "#9D81AC" },
  { key: "general", label: "General", emoji: "📚", color: "#7aa4c4" },
];

export function getCategoryInfo(category: string): CategoryInfo {
  return GUIDE_CATEGORIES.find((c) => c.key === category) ?? GUIDE_CATEGORIES[0];
}
