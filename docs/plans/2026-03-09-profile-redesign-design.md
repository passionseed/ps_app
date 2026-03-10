# Profile Page "Vision Board" Redesign

## Goal

Redesign the `/app/(tabs)/profile.tsx` screen to immediately engage teenagers and align with the "Premium Glass & Glow" design guidelines established by the `Career Simulator`.

## Architecture & Layout

The page will be vertically separated into three distinct visual tiers:

### 1. The Vision Board Master Header (The "Wow" Element)

- Replaces the basic name header.
- Uses a `LinearGradient` container (white to soft purple/blue `LinearGradient(180deg, #FFFFFF 0%, #F9F5FF 50%, #EEF2FF 100%)`) with a 32px border radius.
- Contains a dynamic layout of the user's top aspirations:
  - **Dream Careers:** Chips with an Emerald Green (`#10B981`) tinted glow.
  - **Top Interests:** Chips with a Purple (`#8B5CF6`) tinted glow.
- If data is absent, high-quality, aspirational mock data (e.g., "Game Developer", "Space Architect") will be injected to immediately show value.

### 2. Journey Activity Timeline

- Located below the header, serving as a vertical timeline of recent user actions.
- Uses the `PathStepCard` component styling.
- Cards are crisp white (`#FFFFFF`) with a 20px radius.
- Soft-glow drop shadows indicate activity type (Blue for learning/experience, Green for reaching milestones).
- Uses mock activity nodes ("Joined Beta", "Set Dream Job") if real activity history is absent.

### 3. Supporting Info, Stats & Settings

- **Stats Dashboard:** A simple row on the grey background (`#F3F4F6`) showing "Paths Explored", "Tasks Done", and "Streak" separated by 1px dividers.
- **Details:** Education and Language preferences are displayed as subtle pill-shaped chips rather than static table rows.
- **Utility:** The settings gear floats near the top right of the master header. The "Sign Out" button anchors the bottom of the page as a heavily muted ghost button. The existing "Coming Soon" banner remains.

## Data Strategy

- Keep fetching real data `getProfile`, `user_interests`, and `career_goals`.
- Wrap the rendering logic to immediately fallback to rich mock lists if `interests.length === 0` or `careers.length === 0`.
- Mock activity data will be hardcoded until an activity feed backend exists.
