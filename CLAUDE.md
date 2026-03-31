# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Passion Seed** — a mobile app to help students discover career paths before committing. Users explore paths through 30-min daily tasks (quizzes, videos, activities), reflect on their experience, and after 4-5 days decide if they want to deep dive with university roadmaps.

This app connects to the same Supabase database as the web project at `/Documents/pseed`.

## Commands

```bash
pnpm start          # Start Expo dev server (scan QR or use simulator)
pnpm ios            # Run on iOS simulator (requires Xcode)
pnpm android        # Run on Android emulator
pnpm web            # Run in browser
```

Package manager: **pnpm** (not npm or yarn).

## Architecture

**Expo Router v6** with file-based routing. Entry point is `expo-router/entry`. All screens live under `app/`.

### Route Structure

- `app/_layout.tsx` — root Stack layout, handles auth-based routing
- `app/index.tsx` — landing/login page
- `app/(tabs)/` — main tab navigation (authenticated users)
  - `discover.tsx` — browse available PathLab seeds (career paths)
  - `my-paths.tsx` — user's active and completed enrollments
  - `profile.tsx` — user profile, stats, sign out
- `app/seed/[id].tsx` — seed detail and enrollment screen
- `app/path/[enrollmentId].tsx` — daily task view with node list
- `app/reflection/[enrollmentId].tsx` — daily reflection modal

### Design System
See `docs/design_guidelines.md` for canonical tokens and `lib/theme.ts` for the code implementation.
- Latin UI: **Libre Franklin** (`LibreFranklin_400Regular` / `LibreFranklin_700Bold`), loaded via `useFonts` and `expo-font` in `app.config.js`
- Thai: **Bai Jamjuree** when text contains Thai (see `components/AppText.tsx`)
- Prefer `AppText` or explicit `fontFamily` with explicit `fontWeight` where needed

### Key dependencies
- `expo-router` — navigation
- `@supabase/supabase-js` — database client
- `expo-web-browser` — OAuth flow
- `react-native-svg` — SVG rendering
- `@shopify/react-native-skia` — GPU-backed Canvas, shaders, image filters (native module; run prebuild after changes)
- `expo-sqlite` — local storage for auth persistence

### Skia work
For Canvas, shaders, Reanimated integration, and performance rules, read **`.claude/skills/react-native-skia/SKILL.md`** and the [official Skia docs](https://shopify.github.io/react-native-skia/docs/getting-started/installation) before writing code (do not guess APIs).

## Database (Shared with pseed)

Uses the same Supabase database as the web project. Key tables:

### PathLab System
- `seeds` — career paths (e.g., "Software Engineering")
- `paths` — multi-day journey for a seed
- `path_days` — daily content with node_ids
- `path_enrollments` — user enrollment in a path
- `path_reflections` — daily reflection data
- `path_exit_reflections` — when user quits
- `path_end_reflections` — when user completes

### Learning Maps
- `learning_maps` — maps containing nodes
- `map_nodes` — individual tasks (quiz, video, text, file_upload, project)
- `student_node_progress` — user progress on nodes

## Key Files

### Types (`types/`)
- `pathlab.ts` — PathLab types (Path, PathDay, PathEnrollment, PathReflection, etc.)
- `seeds.ts` — Seed and SeedCategory types
- `map.ts` — MapNode, NodeContent, StudentNodeProgress types

### Lib (`lib/`)
- `supabase.ts` — Supabase client setup
- `auth.tsx` — AuthProvider context with Google OAuth
- `pathlab.ts` — PathLab API functions (seeds, enrollment, progress, reflections)

## Environment Variables

In `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

For production, update these to your Supabase project URL.

## User Flow

1. **Landing** → Sign in with Google
2. **Discover** → Browse PathLab seeds (career paths)
3. **Seed Detail** → Read about path, optionally add "why joined"
4. **Enroll** → Start path, redirected to daily tasks
5. **Daily Tasks** → Complete tasks for the day (quizzes, videos, etc.)
6. **Reflection** → Rate energy/confusion/interest, write thoughts, choose next action
7. **Decision** → Continue tomorrow, continue now, pause, quit, or complete path
8. **My Paths** → View active/completed enrollments
9. **Profile** → See stats, Direction Finder (coming soon), sign out

## Development Notes

- Auth uses the same Supabase users as the web project
- Start local Supabase in pseed project: `npx supabase start`
- Seeds must have `seed_type = 'pathlab'` to appear in the app
- Node types: `text`, `video`, `quiz`, `assessment`, `project`, `file_upload`, `end`

## Versioning Policy (For AI Agents)

- On every shipped app update, bump `expo.version` in `app.json`.
- Keep the Profile footer version label sourced from Expo config (`Constants.expoConfig.version`), not hardcoded.
