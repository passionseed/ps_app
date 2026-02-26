# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Passion Seed** — a React Native app built with Expo.

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

- `app/_layout.tsx` — root Stack layout (headerShown: false globally)
- `app/index.tsx` — landing page
- `app/(tabs)/` — tab navigation with three screens: Home, Explore, Profile

**New Architecture** is enabled (`newArchEnabled: true` in app.json).

### Design System
- Background: `#FDFFF5` (off-white)
- Text: `#111`
- Accent: `#BFFF00` / `#9FE800` (yellow-green)
- Font: **Orbit_400Regular** loaded from `assets/Orbit_400Regular.ttf` via `expo-font`
- All text uses `fontFamily: "Orbit_400Regular"` with explicit `fontWeight`

### Routing conventions
Expo Router maps `app/` files to routes. Tab navigation goes inside `app/(tabs)/` with `app/(tabs)/_layout.tsx` as the tab bar config.

### Key dependencies
- `expo-router` — navigation
- `react-native-svg` — SVG rendering
- `react-native-safe-area-context` + `react-native-screens` — required by Expo Router
- `@expo-google-fonts/orbit` — font package (font file also bundled locally in assets)

## Supabase setup

Client lives in `lib/supabase.ts`. Auth session context in `lib/auth.tsx` — use `useAuth()` anywhere to get `{ session, user, loading }`.

Env vars (in `.env.local`, gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Session is persisted via `AsyncStorage`.

## Getting Started

1. Install dependencies: `pnpm install`
2. Configure `.env.local` with your Supabase credentials (optional)
3. Start development server: `pnpm start`
4. Scan QR code with Expo Go app or press `i` for iOS simulator / `a` for Android
