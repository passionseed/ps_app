import { describe, expect, it } from "vitest";
import type { CareerGoal, InterestCategory, Profile } from "../types/onboarding";
import type { UserEvent } from "../types/events";
import {
  buildFocusSections,
  buildProfileMetaPills,
  buildRecentActivityItems,
} from "../lib/profileScreenData";

describe("profile screen data helpers", () => {
  it("prioritizes career goals ahead of interests in focus sections", () => {
    const careers: CareerGoal[] = [
      { career_name: "UX Designer (AI suggested)", source: "ai_suggested" },
      { career_name: "Product Designer", source: "user_typed" },
    ];
    const interests: InterestCategory[] = [
      {
        category_name: "Design",
        statements: ["Visual storytelling", "Research"],
        selected: ["Visual storytelling"],
      },
    ];

    const sections = buildFocusSections(careers, interests);

    expect(sections).toEqual([
      {
        kind: "career-goals",
        title: "Career Goals",
        emphasis: "primary",
        items: ["UX Designer", "Product Designer"],
      },
      {
        kind: "interests",
        title: "Interests",
        emphasis: "secondary",
        items: ["Visual storytelling"],
      },
    ]);
  });

  it("builds quiet profile metadata pills from real profile fields only", () => {
    const profile = {
      id: "user-1",
      full_name: "Mint",
      email: "mint@example.com",
      avatar_url: null,
      education_level: "high_school",
      preferred_language: "th",
      school_name: "Bangkok School",
      is_onboarded: true,
      onboarded_at: null,
      mobile_settings: null,
      expo_push_token: null,
    } satisfies Profile;

    expect(buildProfileMetaPills(profile)).toEqual([
      "High School",
      "Bangkok School",
      "ไทย",
    ]);
  });

  it("maps only supported real events into recent activity items", () => {
    const events: UserEvent[] = [
      {
        id: "1",
        user_id: "user-1",
        event_type: "mobile_app_opened",
        event_data: {},
        session_id: "session-1",
        created_at: "2026-03-29T18:00:00.000Z",
      },
      {
        id: "2",
        user_id: "user-1",
        event_type: "career_selected",
        event_data: { career_name: "Game Developer", source: "ai" },
        session_id: "session-1",
        created_at: "2026-03-29T18:02:00.000Z",
      },
      {
        id: "3",
        user_id: "user-1",
        event_type: "interest_selected",
        event_data: { category: "Technology", statement: "Building games" },
        session_id: "session-1",
        created_at: "2026-03-29T18:04:00.000Z",
      },
      {
        id: "4",
        user_id: "user-1",
        event_type: "portfolio_item_added",
        event_data: { item_type: "project", title: "Robotics showcase" },
        session_id: "session-1",
        created_at: "2026-03-29T18:06:00.000Z",
      },
    ];

    expect(buildRecentActivityItems(events)).toEqual([
      {
        id: "4",
        icon: "📁",
        title: "Added portfolio item",
        detail: "Robotics showcase",
        created_at: "2026-03-29T18:06:00.000Z",
      },
      {
        id: "3",
        icon: "✨",
        title: "Selected an interest",
        detail: "Building games",
        created_at: "2026-03-29T18:04:00.000Z",
      },
      {
        id: "2",
        icon: "🎯",
        title: "Added a career goal",
        detail: "Game Developer",
        created_at: "2026-03-29T18:02:00.000Z",
      },
    ]);
  });

  it("returns empty arrays instead of mock fallback content", () => {
    expect(buildFocusSections([], [])).toEqual([]);
    expect(buildRecentActivityItems([])).toEqual([]);
  });
});
