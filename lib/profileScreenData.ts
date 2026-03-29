import type { UserEvent } from "../types/events";
import type { CareerGoal, InterestCategory, Profile } from "../types/onboarding";

export interface ProfileFocusSection {
  kind: "career-goals" | "interests";
  title: "Career Goals" | "Interests";
  emphasis: "primary" | "secondary";
  items: string[];
}

export interface ProfileActivityItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  created_at: string;
}

export function formatCareerGoalLabel(name: string): string {
  return name.split("(")[0]?.trim() || name.trim();
}

export function buildFocusSections(
  careers: CareerGoal[],
  interests: InterestCategory[],
): ProfileFocusSection[] {
  const careerItems = careers
    .map((career) => formatCareerGoalLabel(career.career_name))
    .filter(Boolean);
  const interestItems = interests.flatMap((interest) =>
    interest.selected.filter(Boolean),
  );

  const sections: ProfileFocusSection[] = [];

  if (careerItems.length > 0) {
    sections.push({
      kind: "career-goals",
      title: "Career Goals",
      emphasis: "primary",
      items: careerItems,
    });
  }

  if (interestItems.length > 0) {
    sections.push({
      kind: "interests",
      title: "Interests",
      emphasis: "secondary",
      items: interestItems,
    });
  }

  return sections;
}

export function buildProfileMetaPills(profile: Profile | null): string[] {
  if (!profile) return [];

  const pills: string[] = [];

  pills.push(
    profile.education_level === "high_school"
      ? "High School"
      : profile.education_level === "university"
        ? "University"
        : "Unaffiliated",
  );

  if (profile.school_name) {
    pills.push(profile.school_name);
  }

  pills.push(profile.preferred_language === "en" ? "English" : "ไทย");

  return pills;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapEventToActivityItem(event: UserEvent): ProfileActivityItem | null {
  switch (event.event_type) {
    case "career_selected":
      return {
        id: event.id,
        icon: "🎯",
        title: "Added a career goal",
        detail: formatCareerGoalLabel(asString(event.event_data.career_name)),
        created_at: event.created_at,
      };
    case "interest_selected":
      return {
        id: event.id,
        icon: "✨",
        title: "Selected an interest",
        detail: asString(event.event_data.statement),
        created_at: event.created_at,
      };
    case "portfolio_item_added":
      return {
        id: event.id,
        icon: "📁",
        title: "Added portfolio item",
        detail: asString(event.event_data.title),
        created_at: event.created_at,
      };
    case "portfolio_item_deleted":
      return {
        id: event.id,
        icon: "🗑️",
        title: "Removed portfolio item",
        detail: "",
        created_at: event.created_at,
      };
    case "program_saved":
      return {
        id: event.id,
        icon: "📚",
        title: "Saved a program",
        detail: "",
        created_at: event.created_at,
      };
    case "program_unsaved":
      return {
        id: event.id,
        icon: "📚",
        title: "Removed a saved program",
        detail: "",
        created_at: event.created_at,
      };
    case "fit_score_viewed":
      return {
        id: event.id,
        icon: "🧭",
        title: "Viewed TCAS fit results",
        detail: "",
        created_at: event.created_at,
      };
    case "journey_simulation_created":
      return {
        id: event.id,
        icon: "🛤️",
        title: "Created a journey",
        detail: asString(event.event_data.job_title),
        created_at: event.created_at,
      };
    case "onboarding_step_completed":
      return {
        id: event.id,
        icon: "✅",
        title: "Completed onboarding step",
        detail: asString(event.event_data.step),
        created_at: event.created_at,
      };
    default:
      return null;
  }
}

export function buildRecentActivityItems(
  events: UserEvent[],
): ProfileActivityItem[] {
  return [...events]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map(mapEventToActivityItem)
    .filter((item): item is ProfileActivityItem => Boolean(item))
    .filter((item) => item.detail.length > 0 || item.title.length > 0);
}
