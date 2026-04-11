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

export type GuideWithCompletion = MentorGuide & {
  is_completed: boolean;
  page_count: number;
};

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

  const [{ data: guide }, { data: pages }, { data: completion }] = await Promise.all([
    supabase
      .from("mentor_guides")
      .select("*")
      .eq("id", guideId)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("mentor_guide_pages")
      .select("*")
      .eq("guide_id", guideId)
      .order("display_order", { ascending: true }),
    participant?.id
      ? supabase
          .from("mentor_guide_completions")
          .select("id")
          .eq("guide_id", guideId)
          .eq("participant_id", participant.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!guide) return null;

  return {
    ...guide,
    is_completed: !!completion,
    page_count: pages?.length ?? 0,
  };
}

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

  // 1. Find the team
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (!membership?.team_id) throw new Error("Not on a team");

  // 2. Get guide points
  const { data: guide } = await supabase
    .from("mentor_guides")
    .select("points_on_completion")
    .eq("id", guideId)
    .maybeSingle();

  const points = guide?.points_on_completion ?? 5;

  // 3. Insert completion (upsert for idempotency)
  const { error: completionError } = await supabase
    .from("mentor_guide_completions")
    .upsert(
      {
        participant_id: participant.id,
        guide_id: guideId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "participant_id,guide_id" }
    );

  if (completionError) {
    // Already completed — no double award
    if (completionError.code === "23505") return { awarded: 0 };
    throw new Error(completionError.message);
  }

  // 4. Log score event
  const { error: eventError } = await supabase
    .from("hackathon_team_score_events")
    .insert({
      team_id: membership.team_id,
      submission_id: null,
      activity_id: null,
      participant_id: participant.id,
      scope: "team",
      points_possible: points,
      member_count: 1,
      points_awarded: points,
    });

  if (eventError && eventError.code !== "23505") {
    console.warn("[mentor-guides] score event failed:", eventError.message);
  }

  // 5. Update team total
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
