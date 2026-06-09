# iOS Todo Widget — Design Spec

**Date:** 2026-06-09
**Status:** Approved

## Overview

A native iOS WidgetKit extension for the Passion Seed app that displays a todo task list. Tasks are shown as plain text; tapping a task toggles its strikethrough (done/undone) state. iOS 17+ only, using AppIntent for interactivity.

## Requirements

- iOS 17+ minimum (required for interactive widget buttons via AppIntent)
- Three widget sizes: small, medium, large
- Tapping a task toggles it between pending and completed (strikethrough)
- State persists across widget reloads via App Group shared UserDefaults
- Initial hardcoded tasks for testing; architecture ready for real data later

## Hardcoded Tasks (Initial State)

| # | Title | Initial State |
|---|-------|--------------|
| 1 | Write YouTube video script | Pending |
| 2 | Write blog post | Pending |
| 3 | Record interactive demo | Pending |
| 4 | Create a Notion template | Pending |
| 5 | Plan content calendar | Done (strikethrough) |
| 6 | Publish weekly newsletter | Done (strikethrough) |

## Widget Sizes

| Size | Content |
|------|---------|
| Small | App name header + first 2 tasks |
| Medium | App name header + first 4 tasks |
| Large | App name header + all 6 tasks |

## Visual Design

- Background: white / system background
- Font: SF Pro (system font), matching the clean reference design
- Pending tasks: dark text, no decoration
- Completed tasks: gray text + strikethrough
- App name "Passion Seed" as a small header at the top
- Minimal, clean layout — no icons, borders, or extra decoration

## Architecture

### Data Layer

- **App Group ID:** `group.com.passionseed.app`
- Task state (which tasks are done) stored in App Group shared `UserDefaults` under key `"todoWidgetTasks"`
- Encoded as JSON array of `{id, title, isDone}` objects
- On first launch, defaults are seeded from the hardcoded list above

### Widget Extension

- **Bundle ID:** `com.passionseed.app.TodoWidget`
- **Target name:** `TodoWidget`
- **Minimum deployment target:** iOS 17.0
- **Entry point:** `TodoWidget.swift` — single file containing all widget code

### AppIntent (Toggle Action)

```swift
struct ToggleTaskIntent: AppIntent {
    @Parameter var taskId: Int
    func perform() async throws -> some IntentResult
}
```

Reads current task list from shared UserDefaults, toggles the matching task's `isDone`, writes back, and calls `WidgetCenter.shared.reloadAllTimelines()`.

### Timeline Provider

- `TimelineProvider` returns a single `.atEnd` entry (static, refreshed on intent)
- Entry contains the full task array read from shared UserDefaults

### SwiftUI Views

- `TodoWidgetEntryView` — root view, switches on `widgetFamily`
- `TaskRowView` — single task row: `Button(intent:)` wrapping styled `Text`
- Three layout variants (`SmallView`, `MediumView`, `LargeView`) control how many tasks are shown

## Files to Create

| File | Purpose |
|------|---------|
| `ios/TodoWidget/TodoWidget.swift` | All widget Swift/SwiftUI code |
| `ios/TodoWidget/Info.plist` | Widget extension Info.plist |
| `ios/TodoWidget/TodoWidget.entitlements` | App Group entitlement |
| `app/config-plugins/withTodoWidget.js` | Expo config plugin — wires widget into Xcode project |

## Expo Config Plugin

The plugin (`withTodoWidget.js`) does the following during `expo prebuild`:

1. Copies `ios/TodoWidget/` source files into the Xcode project directory
2. Adds a new App Extension target to `project.pbxproj` for the widget
3. Adds App Group entitlement to the main app target (`PassionSeed.entitlements`)
4. Sets deployment target to iOS 17.0 for the widget target
5. Adds the plugin to `app.config.js` plugin list

## App Group Entitlement

Both the main app and the widget extension need:

```xml
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.passionseed.app</string>
</array>
```

## Future: Real Data Integration

When the web feature ships tasks from Supabase:

1. Main RN app fetches tasks and writes them to App Group shared UserDefaults
2. Widget reads from the same key — no widget code changes needed
3. Toggle intent writes back to shared storage; app syncs to Supabase on next foreground

## Out of Scope (This Spec)

- Android widgets
- Real Supabase data fetching in the widget
- Adding tasks from within the widget
- Widget configuration (user-configurable settings)
