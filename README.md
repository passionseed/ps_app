# Passion Seed

AI-driven career path simulation and exploration platform for students and early-career professionals.

## What is it?

Passion Seed helps the next generation discover and navigate ideal career paths through a gamified, mobile-first experience. It grounds simulations in real job market data and university programs to make career choices feel actionable and real.

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) ~55 (React Native 0.83)
- **Language**: TypeScript
- **Backend**: [Supabase](https://supabase.com/)
- **State**: TanStack Query
- **Styling**: React Native + Custom Design System
- **Graphics**: React Native Skia + Reanimated

## Getting Started

### Prerequisites

- Node.js (see `.node-version` for exact version)
- pnpm (`packageManager: pnpm@10.30.2`)
- Expo CLI (`npm install -g eas-cli`)

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` with:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

### Run Locally

```bash
# Start dev server
pnpm start

# iOS
pnpm ios

# Android
pnpm android

# Web
pnpm web
```

### Run Tests

```bash
pnpm test
```

## Building

### Local Builds

```bash
# Android (preview APK)
pnpm build:android-local

# iOS (production, local)
pnpm build:ios-local
```

### EAS Build (Cloud)

```bash
eas build --platform android --profile preview
eas build --platform ios --profile production
```

## Deploy Web

```bash
# Production
pnpm deploy:cf

# Preview branch
pnpm deploy:cf:preview
```

## Project Structure

```
app/           # Expo Router screens
assets/        # Images, fonts, sounds
components/    # Reusable UI components
lib/           # Utilities, hooks, API clients
scripts/       # Admin and data scripts
docs/          # Design docs, specs, planning
tests/         # Vitest test suite
```

## Scripts

| Script | Description |
|--------|-------------|
| `generate:pathlab` | Generate AI career path content |
| `generate:pathlab:batch` | Batch generate pathlab content |
| `build:android-local` | Local Android preview build |
| `build:ios-local` | Local iOS production build |
| `export:web` | Export static web build |
| `deploy:cf` | Deploy to Cloudflare Pages |

## Design

See [`docs/DESIGN.md`](docs/DESIGN.md) for the full design system including colors, typography, and spacing tokens.

## Documentation

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Product overview and design principles
- [`docs/OPTIMIZATION_GUIDE.md`](docs/OPTIMIZATION_GUIDE.md) — Performance guidelines
- [`docs/EAS_HOSTING_ENV_SETUP.md`](docs/EAS_HOSTING_ENV_SETUP.md) — Environment setup

## License

Private — All rights reserved.
