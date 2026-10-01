---
name: ui-worker
description: Handles React Native UI screens, navigation, and integration wiring
---

# UI Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving:
- React Native screen creation (Expo Router)
- UI component development
- Navigation wiring and integration between screens
- Modifying existing screens to add new entry points

## Work Procedure

### Screen Development

1. **Read design system** in `AGENTS.md` for colors, spacing, card styles, pressed states, and font conventions.

2. **Read existing screen patterns.** Before writing any code:
   - Read `app/university/[key].tsx` for the established screen pattern (hero section, LinearGradient, sections, safe area)
   - Read `app/(tabs)/profile.tsx` if modifying profile screen (understand section layout)
   - Read `components/AppText.tsx` to understand the Thai-aware text component
   - Read `lib/universityInsights.ts` for client library usage patterns

3. **Write tests first** (TDD). Create test file(s) in `tests/` that verify:
   - Component renders without crashing
   - Key UI elements are present (titles, buttons, cards)
   - User interactions work (tap handlers, navigation)
   - Loading and empty states render correctly
   - Error states are handled

4. **Implement the screen:**
   - Use `AppText as Text` from `../../components/AppText` for all text
   - Use `useSafeAreaInsets()` for safe area padding
   - Use `LinearGradient` from `expo-linear-gradient` for hero sections
   - Use `useLocalSearchParams` for route params
   - Use `router.push/back` from `expo-router` for navigation
   - Follow design system strictly (colors, borderRadius, fonts)
   - All text content in Thai
   - Include loading states (ActivityIndicator)
   - Include empty states with CTAs
   - Include error handling (try/catch in data fetching)
   - Use `RefreshControl` for pull-to-refresh where appropriate
   - Use `FlatList` for long scrollable lists (not ScrollView)

5. **Verify with agent-browser.** Start the dev server (`pnpm web`) and use agent-browser to:
   - Navigate to the new screen
   - Verify visual layout matches design system
   - Test all interactive elements (buttons, tabs, navigation)
   - Check loading states
   - Take screenshots for handoff evidence
   - Stop the dev server when done

6. **Run tests**: `npx vitest run` — all tests must pass

7. **Run typecheck**: `npx tsc --noEmit` — must pass

8. **Commit** with a descriptive message

### Integration/Wiring Features

1. **Read the target screen** thoroughly before making any changes
2. **Identify the exact insertion point** — match existing section patterns
3. **Add navigation imports** if not already present (`router` from `expo-router`)
4. **Add new rows/sections** matching the existing visual style exactly
5. **Verify navigation works** — agent-browser tap test from source to destination
6. **Verify existing functionality** is not broken — quick check that unmodified sections still render

## Example Handoff

```json
{
  "salientSummary": "Built portfolio builder screens: list (app/portfolio/index.tsx) with item cards showing emoji+title+type+tags+delete, and add form (app/portfolio/add.tsx) with type picker pills, title/description inputs with char counters, tag input. Verified with agent-browser: empty state renders, added an item via the form, item appeared in list, deleted item successfully.",
  "whatWasImplemented": "Portfolio list screen with: header (back + title + add button), loading spinner, empty state with Thai message and CTA, card list showing type emoji + title + type label + description preview + tag pills + delete button with loading state. Pull-to-refresh via RefreshControl. Auto-reload on focus via useFocusEffect. Add form screen with: KeyboardAvoidingView, horizontal ScrollView type picker (5 pills with active state), title TextInput with 200 char counter, multiline description TextInput with 2000 char counter, comma-separated tags input, validation error display, save button with loading state.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx vitest run", "exitCode": 0, "observation": "All tests passing" },
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "No type errors" }
    ],
    "interactiveChecks": [
      { "action": "Navigated to /portfolio in web browser", "observed": "Empty state shown with Thai message and CTA button" },
      { "action": "Tapped + เพิ่ม button", "observed": "Add form opened with type picker defaulting to project" },
      { "action": "Selected award type, entered title 'AI Chatbot', description, tags 'Python, AI'", "observed": "Form filled, char counters updated, award pill highlighted purple" },
      { "action": "Tapped บันทึก", "observed": "Navigated back to list, new item appeared with 🏆 emoji and tags" },
      { "action": "Tapped ลบ on the item", "observed": "Item removed from list, empty state shown again" }
    ]
  },
  "tests": {
    "added": [
      { "file": "tests/portfolio-screens.test.ts", "cases": [
        { "name": "portfolio list renders empty state", "verifies": "empty portfolio shows CTA" },
        { "name": "portfolio list renders items", "verifies": "items display with correct fields" },
        { "name": "add form validates empty title", "verifies": "validation error shown" },
        { "name": "add form submits valid item", "verifies": "item saved and navigates back" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Required client library functions (lib/portfolioFit.ts) don't exist yet
- Navigation routes conflict with existing routes
- AppText component or design system dependencies are missing
- Auth context is unavailable (useAuth hook fails)
- Edge function is not deployed (fit scores return errors)
