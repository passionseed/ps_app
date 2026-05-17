# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

**Passion Seed** is an AI-driven career path simulation and exploration platform built as a mobile-first React Native app. It helps students and early-career professionals discover and navigate ideal career paths through gamified, daily tasks (quizzes, videos, activities), reflections, and university roadmap planning.

The app is a cross-platform Expo application targeting iOS, Android, and Web. It shares a Supabase PostgreSQL database with a companion web project. Key feature areas include:

- **PathLab** — Self-paced multi-day career exploration paths with daily tasks and reflections.
- **Hackathon** — An immersive team-based program experience with phases, modules, submissions, and mentor bookings.
- **Career & University** — Career simulation, job market data, and university/TCAS program discovery.
- **Direction Finder** — AI-powered career guidance conversations.
- **Portfolio / Fit** — Portfolio building and career fit assessment tools.

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo SDK ~55.0.15 (React Native 0.83.4, React 19.2.0) |
| **Language** | TypeScript 5.9 (strict mode enabled) |
| **Routing** | Expo Router v4 (file-based routing) |
| **Bundler** | Metro (iOS, Android, and Web) |
| **Package Manager** | pnpm 10.30.2 |
| **State Management** | TanStack Query (server state) + React Context (auth only) |
| **Database** | Supabase (PostgreSQL) |
| **Backend Compute** | Supabase Edge Functions (Deno runtime) |
| **Auth** | Supabase Auth (OAuth / ID tokens) + Custom hackathon auth (scrypt) |
| **Storage / CDN** | Backblaze B2 + Cloudflare |
| **Styling** | React Native `StyleSheet` + plain JS design tokens (no Tailwind or CSS-in-JS library) |
| **Graphics** | React Native Skia + Reanimated 4.2.1 |
| **Crash Reporting** | Sentry |
| **Testing** | Vitest 4.1.0 |
| **Web Deploy** | Cloudflare Pages via Wrangler |
| **CI/CD** | GitHub Actions |

## Build and Test Commands

All commands use **pnpm**. Do not use npm or yarn.

```bash
# Development
pnpm start          # Start Expo dev server
pnpm ios            # Run on iOS simulator (requires Xcode)
pnpm android        # Run on Android emulator
pnpm web            # Run in browser

# Testing
pnpm test           # Run Vitest suite once (vitest run)
pnpm test:watch     # Run Vitest in watch mode

# Local native builds
pnpm build:android-local   # EAS local build, Android preview APK
pnpm build:ios-local       # EAS local build, iOS production (Sentry disabled)

# Web export & deploy
pnpm export:web            # Static web export via Metro
pnpm deploy:cf             # Export + deploy to Cloudflare Pages (production)
pnpm deploy:cf:preview     # Export + deploy to Cloudflare Pages (preview branch)

# Data generation
pnpm generate:pathlab       # Generate AI career path content
pnpm generate:pathlab:batch # Batch generate pathlab content
```

### Entry Point

`index.js` installs the `expo-sqlite/localStorage` polyfill first, then imports `expo-router/entry`.

## Code Organization

```
app/           # Expo Router screens (file-based routing)
  (tabs)/      # Main tab navigation (Discover, My Paths, Profile)
  (hackathon)/ # Hackathon immersive experience routes
  api/         # Expo Router API routes (+api.ts files)
  _layout.tsx  # Root Stack layout with auth-driven redirects
assets/        # Images, fonts, sounds, icons, static media
components/    # React components organized by feature domain
  Glass/       # Reusable glass-morphism primitives (GlassCard, GlassButton)
  Hackathon/   # Hackathon-specific UI
  JourneyBoard/# PathLab / journey UI
  Wrapped/     # Year-in-review feature
  AppText.tsx  # Typography component enforcing font families
lib/           # Business logic, hooks, API clients, auth, theme (80+ files)
  hooks/       # Feature-specific data hooks
  auth.tsx     # AuthProvider context (Supabase + guest + hackathon modes)
  theme.ts     # Design token constants
  supabase.ts  # Supabase client setup
  queryClient.ts # TanStack Query client + query key factory
  hackathon*.ts  # Hackathon domain logic
  pathlab.ts   # PathLab domain logic
  prefetch.ts  # Prefetch helpers for React Query
types/         # Shared TypeScript types per domain
scripts/       # CLI tools, generators, scrapers, migrations, backfills
supabase/      # Edge functions, migrations, seed data, config
  functions/   # 18+ Deno edge functions (AI chat, auth, uploads, push, etc.)
  migrations/  # 390+ SQL migration files
  seed/        # Seed SQL/JS for career data
  config.toml  # Local Supabase CLI settings
tests/         # Vitest test suite (55+ test files)
android/ / ios/# Native prebuild folders managed by Expo prebuild
```

### Routing Conventions

- **File name = route path**: `app/career/[name].tsx` → `/career/:name`
- **Route groups** for layout scoping: `(tabs)/`, `(hackathon)/`
- **Dynamic routes**: `[activityId].tsx`, `[nodeId].tsx`, `[planId]/`
- **API routes**: Files ending in `+api.ts` under `app/api/` (e.g., `app/api/hackathon/home-bundle+api.ts`)
- **Platform variants**: Use `.web.tsx` suffix for web-specific component implementations.

### State & Data Fetching Conventions

- **Server state** must go through **TanStack Query**. Do not use raw `useEffect` + `fetch` or raw Supabase calls in components. See `docs/OPTIMIZATION_GUIDE.md` for migration patterns.
- **Query keys** are centralized in `lib/queryClient.ts` via a `queryKeys` factory.
- **Stale time presets**: Reference data = 30 min, user data = 2 min.
- **Auth state** lives in `lib/auth.tsx` React Context. Do not use Redux, Zustand, or MobX.
- **Prefetch** on user intent (hover / long-press) before navigation when possible.
- **Invalidate caches** after mutations using `queryClient.invalidateQueries()`.

## Code Style Guidelines

There is **no ESLint, Prettier, or Biome** configured. Style is enforced by TypeScript strict mode and team convention.

### TypeScript

- `tsconfig.json` extends `expo/tsconfig.base` with `"strict": true`.
- Custom types live in `types/` and are included via `typeRoots`.
- Use `satisfies` for type-level assertions on fixtures and constants.

### Styling

- Use `StyleSheet.create()` at the bottom of screen files.
- Import design tokens from `lib/theme.ts` rather than hardcoding colors or spacing.
- Use `AppText` or explicit `fontFamily` with explicit `fontWeight` for typography.
- **Fonts**: Libre Franklin (Latin UI), Bai Jamjuree (Thai text). See `components/AppText.tsx` for automatic Thai detection.

### Component Conventions

- One default-export function component per screen file.
- Feature-based folders in `components/` and `lib/`.
- Use `.web.tsx` variants when web behavior differs from native.

### Naming

- Screen files: PascalCase or kebab-case matching the route.
- Lib files: camelCase, named by domain (`hackathonScreenData.ts`, `pathlab.ts`).
- Types file: One file per domain in `types/`, using PascalCase interfaces.

## Testing Instructions

**Test runner**: Vitest v4.1.0 configured in `vitest.config.ts`.

- **Test glob**: `tests/**/*.test.ts`, `lib/**/*.test.ts`
- **Excluded**: `tests/pathlab.test.ts`
- **Setup file**: `tests/setup.ts` (global mocks for Sentry, React Native, Expo FileSystem)

### Testing Patterns

- **Unit tests only** — no React Testing Library or DOM testing.
- **Heavy mocking** — mock `@sentry/react-native`, `react-native`, `expo-file-system` via `vi.mock()`.
- **Supabase mocks** — manually build mock chains (`.from().select().eq().maybeSingle()`) rather than using a mock server.
- **Factory helpers** — use builder functions like `makeModule(overrides)` for typed fixtures.
- **Reset state** — use `beforeEach` to reset shared mock state between tests.
- **Dynamic imports** — some tests dynamically import the module under test inside the test body to ensure mocks are registered first.

### Running Tests

```bash
pnpm test       # Run once
pnpm test:watch # Watch mode
```

## Security Considerations

### Secrets & Leak Prevention

- A **pre-commit hook** runs `gitleaks` to scan staged files for leaked secrets.
  - Install: `git config core.hooksPath .git-hooks`
  - If gitleaks is not installed, the hook skips silently.
- `.gitleaks.toml` contains allowlist rules (e.g., Resend API keys, Supabase publishable keys).
- **Do not commit `.env`** — it contains live keys and service role credentials.

### Authentication

- **Supabase Auth** (primary): OAuth (Google, Apple) and ID token sign-in. Profile rows are created via DB trigger on `auth.users` insertion.
- **Hackathon Auth** (separate): Custom email/password with **scrypt** hashing in the `hackathon-login` edge function. Uses custom session tokens stored in `hackathon_sessions`. Completely isolated from Supabase Auth.
- **Row Level Security (RLS)** is heavily used. Many migrations are dedicated to RLS fixes. Always verify RLS policies when adding new tables or changing access patterns.

### Environment Variables

Runtime env vars must be prefixed with `EXPO_PUBLIC_` to be accessible in the app bundle.

Required variables (defined in `.env` / `.env.local`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_PROJECT_ID=...
EXPO_PUBLIC_CLOUDFLARE_DOMAIN=...
```

Backend / edge function secrets (server-side only):
- `SUPABASE_SERVICE_ROLE_KEY`
- `SENTRY_AUTH_TOKEN`
- `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY` / `B2_BUCKET_ID`
- LLM API keys (OpenAI, Gemini, DeepSeek, MiniMax)

### Storage

- File uploads go to **Backblaze B2** via the `b2-upload` Supabase edge function.
- Public assets are served through **Cloudflare**.

## Deployment Process

### Mobile (iOS / Android)

- Builds run through **EAS (Expo Application Services)**.
- Profiles defined in `eas.json`:
  - `development` — dev client, internal distribution
  - `simulator` — iOS simulator dev client
  - `preview` — release APK, internal distribution
  - `production` — release build with auto-increment
- **Versioning rule**: On every shipped app update, bump `expo.version` in `app.config.js`. Do not hardcode version text in UI; read it from `Constants.expoConfig.version`. Keep the Profile screen footer version label present and accurate.
- Sentry sourcemap upload is disabled for local iOS builds via `SENTRY_DISABLE_PLUGIN=1`.

### Web

- **GitHub Actions** (`.github/workflows/deploy.yml`) auto-deploys on push to `main`:
  1. `pnpm install --frozen-lockfile`
  2. `pnpm expo export -p web`
  3. SPA routing fix (`cp _cf_routes.json dist/_routes.json`, merge server/client output)
  4. Deploy to **Cloudflare Pages** (`ps-app` project)
- Manual deploy: `pnpm deploy:cf` or `pnpm deploy:cf:preview`

### Wrangler

- `wrangler.toml` configures Cloudflare Pages deployment.
- Build output directory: `./dist`
- Compatibility date: `2025-04-17`, `nodejs_compat` flag enabled.

## Project-local Skills

Skills with repo-specific guidance live under `.claude/skills/<name>/SKILL.md`.

- **`webtoon-cutter`** — Cut long webtoon images into chunks, upload to Supabase storage, generate DB-ready metadata. Path: `.claude/skills/webtoon-cutter/SKILL.md`.
- **`react-native-skia`** — Canvas, shaders, jank-safe animation with Reanimated. Path: `.claude/skills/react-native-skia/SKILL.md`.
- **`prebuild-native`** — Fast iOS/Android native pre-build gate before EAS preview or production builds. Path: `.claude/skills/prebuild-native/SKILL.md`.

## Native Prebuild Notes

- `android/` and `ios/` are managed by Expo prebuild.
- `@shopify/react-native-skia` is a native module; run prebuild after changes that affect native code.
- Custom Metro config wraps `@sentry/react-native/metro` and `react-native-reanimated/metro-config`.
- Custom Expo config plugins:
  - `withHighMemoryGradle` — increases Gradle heap to 8GB.
  - `withStableIosBundleEntry` — fixes iOS ENTRY_FILE issue.

## Key Dependencies to Know

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based routing |
| `@supabase/supabase-js` | Database / auth client |
| `@tanstack/react-query` | Server state caching |
| `@shopify/react-native-skia` | GPU Canvas, shaders, image filters |
| `react-native-reanimated` | Jank-safe animations |
| `react-native-gesture-handler` | Touch gestures |
| `expo-apple-authentication` | Apple Sign-In |
| `expo-auth-session` / `expo-web-browser` | OAuth flows |
| `expo-sqlite` | Local storage / auth persistence |
| `expo-image` | Optimized image rendering |
| `expo-audio` | Audio playback |
| `@sentry/react-native` | Crash reporting |

## Additional Documentation

- `docs/DESIGN.md` — Design system tokens (colors, typography, spacing, shadows).
- `docs/design_guidelines.md` — Canonical visual rules and component patterns.
- `docs/hackathon-design-system.md` — Bioluminescent dark theme for hackathon UI.
- `docs/PRODUCT.md` — Product purpose and brand personality.
- `docs/OPTIMIZATION_GUIDE.md` — Performance and data-fetching optimization patterns.
- `docs/EAS_HOSTING_ENV_SETUP.md` — EAS environment setup instructions.
- `docs/sentry-monitoring.md` — Sentry configuration notes.
