# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project-local skills

Skills with repo-specific guidance live under `.claude/skills/<name>/SKILL.md`.

- **`webtoon-cutter`** — Cut long webtoon images into chunks, upload to Supabase storage, generate DB-ready metadata. Path: `.claude/skills/webtoon-cutter/SKILL.md`.
- **`react-native-skia`** — Canvas, shaders, jank-safe animation with Reanimated. Path: `.claude/skills/react-native-skia/SKILL.md`.
- **`prebuild-native`** — Fast iOS/Android native pre-build gate before EAS preview or production builds. Path: `.claude/skills/prebuild-native/SKILL.md`.

## Versioning Rule

- On every shipped app update, bump `expo.version` in `app.config.js`.
- Do not hardcode version text in UI. Read it from Expo config (`Constants.expoConfig.version`).
- Keep the Profile screen footer version label present and accurate.
