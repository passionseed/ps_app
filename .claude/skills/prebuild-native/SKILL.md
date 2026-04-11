---
name: prebuild-native
description: Fast native pre-build gate for this Expo app before expensive EAS preview or production builds. Use when asked to prebuild, smoke build iOS or Android, run fast local native checks, validate native compilation, or prepare for EAS builds.
---

# Prebuild Native

Run this before EAS `preview` or `production` builds to catch native/config failures quickly.

## Goal

Answer one question: "Will this app generate and compile native projects for iOS and Android?"

This is a local confidence gate, not a release build:

- Do not submit to stores.
- Do not bump app versions.
- Do not commit generated `ios/` or `android/` folders unless the user explicitly asks.
- Prefer a temporary git worktree so native generation cannot dirty the main repo.

## Fast Path

From the repo root:

```bash
git status --short --branch
pnpm install --frozen-lockfile
pnpm test
pnpm dlx expo-doctor@latest
pnpm exec expo config --type public
```

Then create an isolated native-check worktree:

```bash
TS=$(date +%Y%m%d-%H%M%S)
ROOT=$(git rev-parse --show-toplevel)
CHECK_DIR="${ROOT%/*}/ps_app-native-check-$TS"
git worktree add --detach "$CHECK_DIR" HEAD
cd "$CHECK_DIR"
pnpm install --frozen-lockfile
```

If Android uses `google-services.json` and the file is ignored in git, pass it from the main checkout instead of copying it:

```bash
GOOGLE_SERVICES_JSON="$ROOT/google-services.json"
test -f "$GOOGLE_SERVICES_JSON"
```

Run native project generation first:

```bash
GOOGLE_SERVICES_JSON="$GOOGLE_SERVICES_JSON" pnpm exec expo prebuild --clean --platform all --no-install
```

## iOS Fast Compile

Use this on macOS with Xcode installed:

```bash
cd ios
pod install
cd ..
GOOGLE_SERVICES_JSON="$GOOGLE_SERVICES_JSON" pnpm exec expo run:ios --configuration Debug --no-install --no-bundler
```

If the build succeeds but the command exits because Metro port `8081` is busy, count iOS compile as passed and report the port issue separately.

If no simulator is booted, list and boot one:

```bash
xcrun simctl list devices available
open -a Simulator
```

If the compile fails, inspect the first real `xcodebuild` error, not the final Expo summary.

## Android Fast Compile

Use this when Android SDK and JDK are available:

```bash
GOOGLE_SERVICES_JSON="$GOOGLE_SERVICES_JSON" pnpm exec expo run:android --variant debug --no-install --no-bundler
```

If no emulator is running, compile without install from the generated Android project:

```bash
cd android
./gradlew :app:assembleDebug
```

If `google-services.json` is missing, stop and report that Android native compile needs it. Do not invent Firebase config.

## EAS Dry Run

Only after the fast local gate passes, check EAS config:

```bash
pnpm dlx eas-cli@latest build -p android --profile preview --local --non-interactive
```

For iOS local EAS builds, use only if Apple/Xcode signing is already configured:

```bash
pnpm dlx eas-cli@latest build -p ios --profile simulator --local --non-interactive
```

Do not run production or store-submitting builds unless the user explicitly asks.

## Cleanup

After reporting results:

```bash
cd "$ROOT"
git worktree remove "$CHECK_DIR"
```

If cleanup fails because a process is still using the folder, report the path and leave it intact.

## Report Format

Report:

- `DONE` if JS tests, Expo config, prebuild, iOS compile, and Android compile passed.
- `DONE_WITH_CONCERNS` if one platform was skipped due to missing local tooling or credentials.
- `BLOCKED` if native generation or compile failed.

Always include:

- Branch and commit checked.
- Commands run.
- Pass/fail per gate: JS tests, Expo doctor, config, iOS, Android.
- The first actionable error for any failed gate.
- Whether the temporary worktree was removed.
