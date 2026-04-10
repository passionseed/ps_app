---
name: adb-qa
description: Test the Passion Seed app on a running Android emulator via ADB. Take screenshots, navigate screens, capture logcat, detect crashes, and verify flows end-to-end. Use when you need to QA the app on device, verify a feature works on the emulator, or capture visual evidence of bugs.
---

# ADB QA — Android Device Testing

## Overview

Automate testing of the Passion Seed React Native app on a running Android emulator using ADB commands. Take screenshots, navigate UI, watch for crashes, and capture visual evidence.

## Prerequisites

- ADB installed (`~/Library/Android/sdk/platform-tools/adb`)
- Android emulator running (`adb devices` shows `emulator-5554`)
- App installed (`com.passionseed.app`)
- `adb` in PATH or use full path

## Constants

| Key | Value |
|-----|-------|
| Package | `com.passionseed.app` |
| Activity | `com.passionseed.app/.MainActivity` |
| Default emulator | `emulator-5554` |
| Screen size | 1080x2280 |
| Screenshot dir | `.gstack/screenshots/` |
| Logcat tag | `adb-qa` |

## Workflow

### 1. Preflight Check

Verify emulator is running and app is installed:

```bash
adb devices
adb -s emulator-5554 shell pm list packages | grep passionseed
adb -s emulator-5554 shell dumpsys window | grep mCurrentFocus
```

If no emulator, ask user to start one:
```bash
# List available AVDs
$HOME/Library/Android/sdk/emulator/emulator -list-avds
# Start emulator (headless)
$HOME/Library/Android/sdk/emulator/emulator -avd <name> -no-window &

# Or with UI
$HOME/Library/Android/sdk/emulator/emulator -avd <name> &
```

### 2. Screenshot Capture

Take a screenshot and pull it to local machine:

```bash
mkdir -p .gstack/screenshots
adb -s emulator-5554 exec-out screencap -p > .gstack/screenshots/<label>.png
```

Naming convention: `<label>-<timestamp>.png` (e.g., `home-2026-04-10-120000.png`)

### 3. App Launch / Restart

Force-stop and relaunch the app fresh:

```bash
adb -s emulator-5554 shell am force-stop com.passionseed.app
adb -s emulator-5554 shell am start -n com.passionseed.app/.MainActivity
```

### 4. UI Navigation

Use `input` commands to interact with the emulator:

#### Tap (click at coordinates)
```bash
adb -s emulator-5554 shell input tap <x> <y>
```

Coordinate system: 0,0 is top-left. Screen is 1080x2280.

#### Swipe
```bash
# Swipe down (scroll up)
adb -s emulator-5554 shell input swipe 540 1800 540 800 300

# Swipe up (scroll down)
adb -s emulator-5554 shell input swipe 540 800 540 1800 300

# Swipe left (go back / next)
adb -s emulator-5554 shell input swipe 800 1140 200 1140 300
```

#### Press back button
```bash
adb -s emulator-5554 shell input keyevent KEYCODE_BACK
```

#### Press home
```bash
adb -s emulator-5554 shell input keyevent KEYCODE_HOME
```

#### Type text (into focused input)
```bash
adb -s emulator-5554 shell input text "hello%sthere"  # %s = space
```

### 5. Logcat Monitoring

#### Watch for errors and crashes
```bash
# React Native errors
adb -s emulator-5554 logcat -s ReactNativeJS:* ReactNative:* -d | tail -50

# App crashes (fatal exceptions)
adb -s emulator-5554 logcat -s AndroidRuntime:* -d | tail -20

# Supabase / network errors
adb -s emulator-5554 logcat -s ReactNativeJS:* -d | grep -iE "error|fail|exception|supabase" | tail -30

# Edge function calls (ai-chat)
adb -s emulator-5554 logcat -s ReactNativeJS:* -d | grep -i "ai-chat\|gemini\|edge.function" | tail -20
```

#### Live logcat (while testing)
```bash
# Clear old logs first
adb -s emulator-5554 logcat -c
# Then capture live during test (use timeout)
adb -s emulator-5554 logcat -s ReactNativeJS:* AndroidRuntime:* -d -t 500
```

### 6. Crash Detection

Check if app crashed:

```bash
# Check for recent fatal exceptions
adb -s emulator-5554 logcat -s AndroidRuntime:* -d -t 20

# Check if app is still in foreground
adb -s emulator-5554 shell dumpsys window | grep mCurrentFocus
```

If mCurrentFocus no longer shows `com.passionseed.app`, the app crashed.

### 7. Specific Test Flows

#### Test AI Chat (Edge Function)

This tests the `ai-chat` edge function that replaced client-side Gemini calls.

1. Launch app → navigate to an activity with AI chat
2. Clear logcat, screenshot before
3. Trigger AI greeting (the `sendInitialGreeting` function)
4. Watch logcat for fetch errors
5. Screenshot after — verify Thai greeting appears
6. Check for `429` rate limit or `503` service unavailable

```bash
# Before
adb -s emulator-5554 logcat -c
adb -s emulator-5554 exec-out screencap -p > .gstack/screenshots/ai-chat-before.png

# Navigate to activity (requires knowing screen coordinates — use screenshots to find)

# After
sleep 5
adb -s emulator-5554 exec-out screencap -p > .gstack/screenshots/ai-chat-after.png
adb -s emulator-5554 logcat -s ReactNativeJS:* -d | grep -i "ai-chat\|fetch\|error" | tail -20
```

#### Test Login Flow

1. Force stop app
2. Launch app
3. Screenshot landing page
4. Tap "Sign in with Google"
5. Watch for auth redirect
6. Screenshot post-login

#### Test Navigation (Tab Bar)

Tab bar is typically at bottom of screen. Approximate coordinates for 1080x2280:
- Tab 1 (Discover): ~180, 2200
- Tab 2 (My Paths): ~540, 2200
- Tab 3 (Profile): ~900, 2200

```bash
adb -s emulator-5554 shell input tap 180 2200  # Discover tab
adb -s emulator-5554 shell input tap 540 2200  # My Paths tab
adb -s emulator-5554 shell input tap 900 2200  # Profile tab
```

**IMPORTANT**: These are approximations. Always take a screenshot first to verify layout before tapping.

### 8. Coordinate Discovery

To find exact tap coordinates for UI elements:

1. Take a screenshot
2. View the screenshot image (use Read tool on the .png file)
3. Estimate x,y coordinates from the visual layout
4. Tap and verify with another screenshot

For precision, enable developer pointer:
```bash
adb -s emulator-5554 shell settings put system pointer_location 1
# After testing, disable:
adb -s emulator-5554 shell settings put system pointer_location 0
```

### 9. Reporting

After testing, create a report in `.gstack/adb-reports/`:

```markdown
# ADB QA Report — <date>

## Test Environment
- Device: emulator-5554
- Screen: 1080x2280
- App: com.passionseed.app
- Branch: <current branch>

## Test Results
| Flow | Status | Evidence |
|------|--------|----------|
| ...  | PASS/FAIL | screenshot path |

## Crashes
- (none found / details)

## Errors from Logcat
- (filtered list)

## Screenshots
- `.gstack/screenshots/<name>.png`
```

## Failure Modes

| Problem | Solution |
|---------|----------|
| No emulator running | Start AVD with `emulator -avd <name>` |
| App not installed | Build and install: `pnpm android` or `adb install <apk>` |
| Screenshots black | App may be in secure mode; try `screencap` without `-p` |
| Tap misses target | Take screenshot first, verify coordinates |
| Logcat empty | Clear with `-c` first, then reproduce |
| App crash on launch | Check `adb logcat -s AndroidRuntime:*` for stack trace |
| Edge function 503 | GEMINI_API_KEY not set in Supabase secrets |
| Edge function 429 | Rate limit hit (20 req/min); wait 60 seconds |
| Edge function 401 | Auth token missing or expired |

## Key ADB Commands Reference

```bash
# Device management
adb devices                           # List connected devices
adb -s emulator-5554 shell ...        # Target specific device

# App control
adb shell am start -n <pkg>/<act>     # Launch app
adb shell am force-stop <pkg>         # Kill app
adb shell pm list packages | grep x   # Check installed

# Screenshots
adb exec-out screencap -p > file.png # Screenshot to file

# Input
adb shell input tap x y              # Tap
adb shell input swipe x1 y1 x2 y2 ms # Swipe
adb shell input text "text"          # Type (use %s for space)
adb shell input keyevent KEYCODE_BACK # Back button
adb shell input keyevent KEYCODE_HOME # Home button

# Logcat
adb logcat -c                         # Clear logs
adb logcat -s TAG:* -d               # Dump specific tag
adb logcat -s TAG:* -d -t N          # Last N lines
adb logcat -s AndroidRuntime:* -d    # Crashes only
```
