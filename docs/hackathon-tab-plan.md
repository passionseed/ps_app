# Hackathon App Execution Plan: Custom Bottom Tabs & Screens

This plan divides the implementation of the custom bottom tab bar and its three main sections (Home, Journey, You) into two parallel tracks.

## Overview
- **Track 1 (Big):** Learning Engine & Content Operations
- **Track 2 (Angpao):** Core UI, Navigation, Social, & Mechanics

---

## Track 1: Big (Learning & Content)
*Focus: Everything related to the learning journey, activities, and educational content.*

### 1. Journey Tab (`/hackathon/(tabs)/journey`)
- **Learning Journey Canvas:** Build the main scrollable timeline/path UI for the hackathon learning phases.
- **Activity Nodes:** Implement the individual activity cards/nodes on the journey path.
- **Content Integration:** Connect the UI to Supabase content tables (`path_activities`, `path_content`, `node_content`).
- **Activity Handlers:** Build the transition screens when a user clicks into a specific learning activity.

### 2. Home Tab: "Go to Learning" Component
- **Active Task Card:** Build the contextual "Next Up" or "Continue Learning" widget for the Home tab.
- **Deep Linking:** Ensure the CTA smoothly routes the user deeply into their current active learning node in the Journey tab.

### 3. You Tab: "What You Learned" Component
- **Knowledge Vault:** Build the UI section within the Profile showcasing completed activities, reflections, and generated ideas.
- **Learning Summaries:** Implement the data fetching to show qualitative insights (skills learned, persona developments).

---

## Track 2: Angpao (Core UI & Mechanics)
*Focus: The custom tab bar shell, routing, gamification, and social/profile components.*

### 1. Custom Tab Bar Navigation System
- **Tab Layout (`app/hackathon/(tabs)/_layout.tsx`):** Implement the custom React Navigation `tabBar` component overrides.
- **Glassmorphic UI:** Style the bottom tab bar with `BlurView`, custom SVGs, and the Bioluminescent active/inactive indicators.
- **Routing:** Set up the three primary endpoints: `home`, `journey`, and `you`.

### 2. Home Tab (`/hackathon/(tabs)/home`)
- **Hackathon Timeline:** Build the master schedule and current event status UI.
- **Global Progress Widget:** Implement the progress bar tracking the team's overall hackathon completion %.
- **Booking Mentor UI:** Build the interface for scheduling or requesting help from mentors.
- **Leaderboard Widget:** Develop the real-time ranking widget showing top teams and the user's current placement.

### 3. You Tab (`/hackathon/(tabs)/you`)
- **Your Profile:** Build the user's identity card (avatar, info, role).
- **Team Roster:** Build the "Your Team" section, displaying teammates and team details.
- **Point Mechanics Engine:** Implement the point calculation UI, showing the breakdown of earned points (e.g., from challenges, attendance, speed) and the user's/team's current total score.

---

## Integration Points & Dependencies
1. **Home Tab Assembly:** Angpao owns the Home tab layout, but Big must supply the "Go to Learning" component to drop into the layout.
2. **You Tab Assembly:** Angpao owns the You tab layout, but Big must supply the "What You Learned" section block.
3. **Data Parity:** Both developers must agree on the Supabase typing for the `hackathon_participants` and `team` payloads so profile and learning data associate correctly.
