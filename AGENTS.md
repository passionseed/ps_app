# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project-local skills

Skills with repo-specific guidance live under `.claude/skills/<name>/SKILL.md`. For **`@shopify/react-native-skia`** (Canvas, shaders, jank-safe animation with Reanimated), use **`react-native-skia`** — path: `.claude/skills/react-native-skia/SKILL.md`.

## Versioning Rule

- On every shipped app update, bump `expo.version` in `app.json`.
- Do not hardcode version text in UI. Read it from Expo config (`Constants.expoConfig.version`).
- Keep the Profile screen footer version label present and accurate.
