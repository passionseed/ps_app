# Wrapped UI Behavioral Assertions

> Generated: 2026-05-05
> Feature: PassionSeed Hackathon "Wrapped" (Spotify Wrapped–style year-in-review)
> Screens under test: Hackathon Home (`app/(hackathon)/home.tsx`), Wrapped Modal (TBD route)

---

## 1. Home Screen CTA — Visibility States

### VAL-UI-001: CTA hidden when no phases are completed
When the user has completed zero phases, the Wrapped CTA card MUST NOT be rendered in the home screen ScrollView. Verify the card element is absent from the render tree (not just opacity:0).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-002: CTA hidden when only Phase 0 (pre-phase) exists
If the user's hackathon data contains only a pre-phase/onboarding entry but no completed Phase 1+, the CTA MUST NOT appear.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-003: CTA appears after completing Phase 1
When the user has completed at least Phase 1, the Wrapped CTA card MUST be visible in the home screen ScrollView, positioned between the Team Impact section and the Mentor Guides card.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-004: CTA card follows existing placeholder card styling
The CTA card MUST use the same `placeholderCard` style as other home screen cards: `backgroundColor: "rgba(145,196,227,0.05)"`, `borderRadius: 16`, `borderWidth: 1`, `borderColor: "rgba(145,196,227,0.1)"`, `padding: Space.lg`.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-005: CTA card text uses correct typography
The CTA card text MUST use Bai Jamjuree font for UI labels and Reenie Beanie if any handwritten accent is used. The eyebrow label (if present) MUST use `fontSize: 10-11`, `color: #91C4E3`, `letterSpacing: 2`, `textTransform: "uppercase"`.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-006: CTA card updates dynamically on phase completion
If the user completes Phase 1 while on the home screen (via background data refresh or navigation back from reflection), the CTA card MUST appear without requiring a manual reload.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-007: CTA card visible during loading state if cached data indicates completion
If the cached home bundle already indicates Phase 1 completion, the CTA card MUST be visible even while fresh data is loading (stale-while-revalidate pattern matching existing home screen behavior).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

---

## 2. Home Screen CTA — Interaction States

### VAL-UI-008: Tapping CTA opens full-screen Wrapped modal
When the user taps the Wrapped CTA card, a full-screen modal MUST open that covers the entire screen (including the custom tab bar), presenting the Wrapped experience.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-009: CTA card provides haptic feedback on press
Tapping the CTA card MUST trigger haptic feedback (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`) to match the pattern used by other interactive elements in the hackathon UI.
**Tool:** agent-browser
**Evidence:** console-errors (verify no haptics errors)

### VAL-UI-010: CTA card has press-in/out visual feedback
The CTA card MUST show visual feedback on press (e.g., scale animation or border glow color change) using `Pressable` and `react-native-reanimated`, consistent with other home screen cards.
**Tool:** agent-browser
**Evidence:** screenshot

---

## 3. Wrapped Modal — Lifecycle

### VAL-UI-011: Modal opens with entrance animation
When the Wrapped modal opens, it MUST animate in with a smooth transition (slide-up or fade-in, not an abrupt appearance). Animation duration should be 400-500ms matching the existing `animationDuration: 400` pattern.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-012: Modal renders full-screen with correct background
The modal MUST render at full screen dimensions with background color `#03050a` (the deep ocean background token from HACK_COLORS), obscuring the home screen and custom tab bar completely.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-013: Modal can be dismissed / closed
The user MUST be able to dismiss the Wrapped modal. If a close button (✕) is provided, it MUST be visible and tappable. If back gesture is supported, it MUST work.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-014: Closing modal returns to home screen
When the Wrapped modal is dismissed, the home screen MUST be restored to its previous scroll position and state. No data loss or UI corruption.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-015: Modal backdrop covers system status bar
The modal MUST render behind the system status bar area (using `statusBarTranslucent` on Android or equivalent), so the bioluminescent dark background fills the entire display.
**Tool:** agent-browser
**Evidence:** screenshot

---

## 4. Progress Indicator

### VAL-UI-016: Progress indicator visible at top of modal
A progress indicator (dot indicators or a horizontal bar) MUST be visible at the top of the Wrapped modal, showing the user's position in the flow.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-017: Progress indicator shows correct step count
The indicator MUST display the correct total number of steps (5 prompts + intro/outro cards). The current step dot/segment MUST be visually distinct from completed and upcoming steps.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-018: Progress indicator updates on card advance
When the user advances from one prompt to the next, the progress indicator MUST animate to the new position smoothly (using `withTiming` with ~300ms duration), with the completed dot changing to the completed color (`#91C4E3`) and the active dot scaling up (using `withSpring`).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-019: Progress indicator colors match design tokens
Active step MUST use cyan (`#91C4E3`), completed steps MUST use cyan, upcoming steps MUST use muted color (`rgba(90,122,148,0.4)`). No hardcoded colors deviating from HACK_COLORS.
**Tool:** agent-browser
**Evidence:** screenshot

---

## 5. Prompt 1 — Slider (e.g., Energy Level)

### VAL-UI-020: Prompt 1 card renders with staggered text reveal
The prompt card MUST render with staggered text animation: title fades in first, subtitle after 300ms delay, then the slider control after 700ms delay. Use `FadeInUp.duration(600).delay(n)` pattern.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-021: Slider control is interactive
The slider MUST respond to touch/pan gestures, with the thumb position tracking the user's finger. The track fill MUST animate smoothly as the user drags.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-022: Slider has bioluminescent glow on interaction
The slider thumb MUST show a glow effect (using `shadowColor: #91C4E3`, `shadowRadius` scaling with value) when the user interacts with it. The track fill color MUST interpolate from muted to cyan to purple as the value increases.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-023: Slider shows current value label
The slider MUST display the current value as a label (e.g., percentage or descriptive text like "Low / Medium / High") near or on the thumb.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-024: User can advance from Prompt 1 to Prompt 2
After interacting with the slider, the user MUST be able to advance to the next prompt. Advancement MUST trigger a card transition animation (slide-up + fade).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-025: Slider value is persisted for archetype calculation
The slider value chosen by the user MUST be captured and stored for later use in archetype determination. No value should be lost between prompts.
**Tool:** agent-browser
**Evidence:** console-errors (log captured value)

---

## 6. Prompt 2 — Slider (e.g., Collaboration Style)

### VAL-UI-026: Prompt 2 card renders with staggered text reveal
Same staggered reveal pattern as Prompt 1. The card enters with slide-up animation, then text elements appear sequentially.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-027: Second slider functions independently
The second slider MUST operate independently from the first slider. Values do not carry over between prompts.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-028: Prompt 2 has distinct prompt text
The prompt text, subtitle, and slider labels MUST be different from Prompt 1, representing a different question in the assessment flow.
**Tool:** agent-browser
**Evidence:** screenshot

---

## 7. Prompt 3 — Multi-Select (e.g., Skills/Traits)

### VAL-UI-029: Prompt 3 renders with staggered text reveal
Same staggered pattern. Title appears first, then instruction text, then the multi-select chip group.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-030: Multi-select chips render as glowing chip buttons
Each selectable option MUST render as a chip/button with the following inactive state: `backgroundColor: "rgba(26,37,48,0.8)"`, `borderColor: "rgba(90,122,148,0.4)"`, `borderRadius: 20`.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-031: Tapping a chip toggles selection with animation
Tapping a chip MUST toggle its selection state. On selection: background transitions to `#9D81AC` (purple CTA color), border transitions to `#A594BA`, and a scale bounce (`withSpring` to 1.05) is applied.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-032: Multiple chips can be selected simultaneously
The user MUST be able to select multiple chips at once. Selecting one chip does NOT deselect others. There MUST be a visual indication (e.g., count label) of how many are selected.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-033: Deselecting a chip animates back to inactive state
When a selected chip is tapped again, it MUST animate smoothly back to the inactive state (border color, background, scale all revert).
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-034: Multi-select state is persisted
All selected chip values MUST be captured and stored for archetype calculation. No selections should be lost between prompts.
**Tool:** agent-browser
**Evidence:** console-errors

### VAL-UI-035: User can advance with zero selections
The user MUST be able to advance to the next prompt even if no chips are selected (multi-select is optional, not a required field).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

---

## 8. Prompt 4 — Drag-to-Rank

### VAL-UI-036: Prompt 4 renders with staggered text reveal
Same staggered pattern as other prompts. Title, instruction text, then the rankable list appear sequentially.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-037: Items render as a vertical list with drag handles
Rankable items MUST render as a vertical list. Each item MUST have a visual drag handle (e.g., ≡ icon or grip lines) indicating it can be reordered.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-038: Long-press initiates drag
The user MUST be able to long-press an item to initiate dragging. During drag, the item MUST visually lift (scale up slightly, add glow/shadow).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-039: Dragging reorders items with smooth animation
As the user drags an item, other items MUST smoothly animate out of the way to make room (using `withSpring`). The dragged item tracks the user's finger position.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-040: Drop completes reorder
When the user releases (drops) an item, it MUST snap into its new position with a spring animation. The new order MUST be preserved and reflected in the list.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-041: Final rank order is persisted
The final item order after all drag operations MUST be captured and stored for archetype calculation. Only the final order matters.
**Tool:** agent-browser
**Evidence:** console-errors

### VAL-UI-042: Haptic feedback on drag start and drop
Dragging MUST trigger haptic feedback on drag start and drop (`Haptics.impactAsync`), matching the pattern used throughout the hackathon UI.
**Tool:** agent-browser
**Evidence:** console-errors

---

## 9. Prompt 5 — Text Input (e.g., "One word to describe your journey")

### VAL-UI-043: Prompt 5 renders with staggered text reveal
Same staggered pattern. Title appears first, subtitle/instruction text second, then the text input field.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-044: Text input field is focusable
The text input MUST be tappable to focus. On focus, the border MUST animate from `rgba(90,122,148,0.4)` to `#7aa4c4` (active focus ring color per design system).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-045: Text input uses correct theme styling
The text input MUST use: `backgroundColor: "rgba(26,37,48,0.8)"`, `color: "#FFFFFF"`, `borderWidth: 2`, `borderRadius: 12`, `paddingHorizontal: 16`, `paddingVertical: 12`, matching the hackathon form input pattern.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-046: Keyboard appears on focus
On iOS/Android, tapping the text input MUST open the native keyboard. The modal content MUST adjust to remain visible above the keyboard (avoiding keyboard occlusion).
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-047: Text input value is persisted
The entered text MUST be captured and stored for use in the archetype reveal / summary card. Text persists if the user navigates back and forward between prompts.
**Tool:** agent-browser
**Evidence:** console-errors

### VAL-UI-048: User can advance with empty text input
The user MUST be able to advance to the next card even if the text input is empty (field is optional).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-049: "Submit" or "Done" CTA advances to processing/reveal
An explicit CTA button (e.g., "See My Results" with purple styling: `backgroundColor: #9D81AC`, `borderRadius: 40`, `paddingVertical: 14`, glow shadow) MUST be present. Tapping it advances to the archetype processing/reveal screen.
**Tool:** agent-browser
**Evidence:** screenshot

---

## 10. Animation — Text Stagger

### VAL-UI-050: All prompt cards use staggered text reveal
Every prompt card (1-5) MUST stagger its text elements: the first element appears at 0ms, second at ~300ms, third at ~700ms, using `FadeInUp.duration(600).delay(n)` or equivalent imperative `withDelay` pattern.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-051: Staggered animation plays on first render only
When a card is rendered for the first time, the staggered reveal animation MUST play. If the user navigates back to a previously viewed card, the animation MUST play again (fresh mount, driven by key change).
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-052: No jank or frame drops during stagger
The staggered animations MUST run at 60fps on the UI thread (driven by `react-native-reanimated` shared values or entering animations, not JS thread `setState`). Verify via performance profiling — no frames dropped during stagger sequence.
**Tool:** agent-browser
**Evidence:** console-errors (performance warnings)

---

## 11. Animation — Card Transitions

### VAL-UI-053: Cards transition with slide-up + fade
When advancing from one prompt to the next, the new card MUST slide up from the bottom of the screen (translateY: SCREEN_HEIGHT → 0) while fading in (opacity: 0 → 1). The old card MUST fade out (opacity: 1 → 0).
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-054: Card transitions use spring physics
The slide-up transition MUST use spring physics (`withSpring` with damping: 15, stiffness: 100) for a natural, physical feel matching the underwater theme, not linear timing.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-055: Transition duration is 400-500ms
Each card transition MUST complete in 400-500ms total, matching the existing `animationDuration: 400` pattern from the root stack layout. Not too fast (jarring) and not too slow (frustrating).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-056: No visible flash/blink between cards
During card transition, there MUST be no visible flash of the background or white screen between cards. The dark background (`#03050a`) MUST remain continuously visible.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-057: Transition works for both forward and backward navigation
If the user navigates back to a previous prompt, the transition MUST animate correctly (slide-down exit for current card, fade-in for previous card).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

---

## 12. Bioluminescent Dark Theme

### VAL-UI-058: All screens use #03050a deep background
Every card in the Wrapped flow MUST use `backgroundColor: "#03050a"` (or transparent over the modal's `#03050a` background). No light/white backgrounds.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-059: Cyan accent (#91C4E3) used for active elements
Active UI elements (slider fill, progress dots, selected chips) MUST use cyan `#91C4E3` as the primary accent color, matching `HACK_COLORS.cyan`.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-060: Purple accent (#9D81AC/#A594BA) used for CTAs
Primary CTA buttons (e.g., "See My Results", "Share") MUST use purple `#9D81AC` with glow shadow, matching the existing login/CTA button pattern.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-061: Bai Jamjuree font used for all UI text
All UI text (headings, body, labels, buttons) in the Wrapped flow MUST use Bai Jamjuree font family (700Bold for headings/CTAs, 500Medium for subtext, 400Regular for body). The `AppText` component (which auto-switches Thai/Latin) MUST be used where text may contain Thai characters.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-062: No accent bar anti-pattern
Per the hackathon design system anti-patterns, the Wrapped UI MUST NOT use thick colored left-border accent bars on cards or feedback elements.
**Tool:** agent-browser
**Evidence:** screenshot

---

## 13. Archetype Reveal

### VAL-UI-063: Processing/loading state shown before reveal
After the user submits Prompt 5, a processing/loading state MUST be shown for at least 800ms (e.g., particles animation, shimmer text, or jellyfish loader) before the archetype is revealed.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-064: Archetype name reveals with dramatic animation
The archetype name (e.g., "TRAILBLAZER") MUST appear with a dramatic reveal animation: scale spring from 0.5 to 1.0 with overshoot, text glow using `textShadowColor: '#91C4E3'`, `textShadowRadius: 20`.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-065: Archetype description fades in after name reveal
After the archetype name is revealed (~1200ms), the archetype description paragraph(s) MUST fade in using staggered `FadeInUp` with increasing delays over ~2000ms total.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-066: Archetype colors match defined mapping
Each archetype MUST use its assigned color from the Wrapped theme mapping (e.g., Trailblazer → `#91C4E3`, Harmonizer → `#A594BA`, Architect → `#65ABFC`, Luminary → `#FFD700`, Sentinel → `#10B981`). The wrong color for an archetype is a bug.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-067: Visual flourish after reveal (particle burst or glow)
After the archetype reveal completes (~1500ms after name appears), a visual flourish (Skia particle burst, expanding glow orb, or bioluminescent ring expanding from center) MUST render. This provides the "celebration" moment.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-068: Correct archetype calculated from prompt responses
The archetype displayed MUST be the correct one based on the mathematical mapping of the 5 prompt responses. If the same responses always produce the same archetype, the calculation is deterministic. If multiple archetypes, verify consistent selection logic.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors (log calculated archetype)

---

## 14. Summary / Share Card

### VAL-UI-069: Summary card slides up after archetype reveal
After the visual flourish (~800ms after it completes), a summary/share card MUST slide up from the bottom of the screen (slide-up transition, ~800ms).
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-070: Summary card displays archetype name and icon
The summary card MUST display the archetype name and any associated icon/emoji in the correct archetype color.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-071: Summary card displays user's trait breakdown
The summary card MUST display a breakdown of the user's traits/responses from the 5 prompts (e.g., energy level, collaboration style, selected skills, ranked priorities, one-word descriptor).
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-072: Summary card displays correct user data
All data shown on the summary card (stats, traits, archetype) MUST match what was collected during the prompt flow. No placeholder or default data.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-073: Share button is present and tappable
A share button (or "Share Your Results") MUST be visible on or near the summary card. Tapping it must trigger the native share sheet or a custom share flow.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-074: "Done" or "Close" button dismisses modal
A "Done" or "Close" button MUST be present on or near the summary card. Tapping it dismisses the Wrapped modal and returns to the home screen.
**Tool:** agent-browser
**Evidence:** screenshot

---

## 15. Edge Cases — Interaction

### VAL-UI-075: Rapid double-tap on CTA opens only one modal
If the user rapidly double-taps the Wrapped CTA, only ONE instance of the Wrapped modal MUST open. No duplicate modals or navigation stack corruption.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-076: Rapid tap on advance button does not skip cards
If the user rapidly taps the advance/next button, cards MUST NOT be skipped. Each tap advances exactly one card, and the card MUST fully render before the next advance is accepted (debounce or guard).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-077: Closing modal mid-flow and reopening starts fresh
If the user closes the Wrapped modal after completing Prompt 2, then reopens it, the experience MUST start from the beginning (Prompt 1). No partial state is carried over.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-078: Closing modal mid-flow and reopening — CTA remains visible
After closing the modal mid-flow, the Wrapped CTA on the home screen MUST remain visible (the user is still eligible — they completed Phase 1). The CTA should not disappear because the user didn't finish the Wrapped flow.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-079: Back navigation within Wrapped flow works correctly
If the Wrapped flow supports backward navigation (e.g., a back arrow or swipe-back gesture), navigating back to a previous prompt MUST:
- Show the correct prompt card with the previously entered data still visible
- Not reset the user's responses
- Update the progress indicator to reflect the current position
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-080: System back button (Android) dismisses modal
On Android, pressing the system back button while on the first Wrapped card MUST dismiss the modal and return to the home screen. On subsequent cards, it should navigate back to the previous card (if backward navigation is supported).
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-081: Device rotation does not crash or corrupt state
If the device is rotated (portrait ↔ landscape) during the Wrapped experience, the UI MUST re-layout correctly without crashing or losing entered data.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-082: App backgrounding and foregrounding preserves state
If the user backgrounds the app (switches to another app) mid-flow and returns, the Wrapped modal MUST still be open at the same prompt with the same data.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-083: Low-memory conditions do not crash
If the device experiences memory pressure while the Wrapped modal is open (especially with Skia canvas rendering), the app MUST NOT crash. At minimum, the Skia canvas should degrade gracefully.
**Tool:** agent-browser
**Evidence:** console-errors

---

## 16. Edge Cases — Data & State

### VAL-UI-084: User with exactly one completed phase sees CTA
A user who has completed exactly Phase 1 (and no other phases) MUST see the Wrapped CTA. The CTA should not require multiple phase completions.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-085: User who completed Wrapped before sees CTA again
If a user completed the Wrapped experience previously, the CTA MUST still appear, allowing them to go through it again. (Unless there's an explicit "already viewed" state management decision — this should be confirmed with product requirements.)
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-086: Archetype calculation handles all-response-edge-cases
Edge case combinations of prompt responses (e.g., all minimum values, all maximum values, empty multi-select, empty text input) MUST produce a valid archetype. No "undefined" or "null" archetype.
**Tool:** agent-browser
**Evidence:** console-errors

### VAL-UI-087: Wrapped modal does not interfere with existing modals
If the Score Breakdown modal or Enable Notifications modal is open when the user taps the Wrapped CTA, the Wrapped modal MUST NOT open on top of it (or if it does, only one modal at a time is visible). No z-index conflicts.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

---

## 17. Error States

### VAL-UI-088: Error loading archetype calculation — graceful fallback
If the archetype calculation fails (e.g., API error, logic error), the Wrapped flow MUST show a graceful error state rather than crashing. An error message like "Something went wrong. Please try again." with a retry button should appear.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-089: Network error during data fetch — handled gracefully
If any network request during the Wrapped flow fails (e.g., fetching hackathon stats for the summary card), the UI MUST show a fallback state (e.g., "Unable to load stats" with a retry option) rather than a blank screen or crash.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-090: Skia Canvas failure — fallback to plain View
If `@shopify/react-native-skia` fails to initialize the Canvas (e.g., on a device without GPU support), the background MUST fall back to a plain `View` with the `#03050a` background color. No white screen or crash.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

### VAL-UI-091: Missing font — fallback to system font
If Bai Jamjuree font fails to load, text MUST fall back to the system default sans-serif font. Text MUST remain readable, not invisible.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-092: Invalid prompt response data — handled gracefully
If a prompt stores NaN, null, or undefined as a response value, the Wrapped flow MUST handle it gracefully (treat as default/neutral value) rather than throwing an error or crashing during archetype calculation.
**Tool:** agent-browser
**Evidence:** console-errors

---

## 18. Accessibility

### VAL-UI-093: All interactive elements have sufficient touch targets
All tappable elements (buttons, chips, slider thumbs, drag handles) MUST have a minimum touch target of 44×44 points (iOS HIG) / 48×48dp (Material Design).
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-094: Color contrast meets WCAG AA minimum
Text against background MUST meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text). White `#FFFFFF` on `#03050a` passes. Muted text (`rgba(255,255,255,0.45)` on `#03050a`) MUST be verified.
**Tool:** agent-browser
**Evidence:** screenshot

### VAL-UI-095: Animations respect reduced-motion preference
If the device has "Reduce Motion" accessibility setting enabled, animations MUST be disabled or reduced to simple fades. No spring physics, no staggered reveals, no particle effects.
**Tool:** agent-browser
**Evidence:** screenshot, console-errors

---

## Summary

| Category | Assertion Count |
|----------|----------------|
| Home Screen CTA — Visibility | 7 (VAL-UI-001 to 007) |
| Home Screen CTA — Interaction | 3 (VAL-UI-008 to 010) |
| Modal Lifecycle | 5 (VAL-UI-011 to 015) |
| Progress Indicator | 4 (VAL-UI-016 to 019) |
| Prompt 1 (Slider) | 6 (VAL-UI-020 to 025) |
| Prompt 2 (Slider) | 3 (VAL-UI-026 to 028) |
| Prompt 3 (Multi-Select) | 7 (VAL-UI-029 to 035) |
| Prompt 4 (Drag-to-Rank) | 7 (VAL-UI-036 to 042) |
| Prompt 5 (Text Input) | 7 (VAL-UI-043 to 049) |
| Text Stagger Animation | 3 (VAL-UI-050 to 052) |
| Card Transitions | 5 (VAL-UI-053 to 057) |
| Bioluminescent Theme | 5 (VAL-UI-058 to 062) |
| Archetype Reveal | 6 (VAL-UI-063 to 068) |
| Summary/Share Card | 6 (VAL-UI-069 to 074) |
| Edge Cases — Interaction | 9 (VAL-UI-075 to 083) |
| Edge Cases — Data & State | 4 (VAL-UI-084 to 087) |
| Error States | 5 (VAL-UI-088 to 092) |
| Accessibility | 3 (VAL-UI-093 to 095) |
| **Total** | **95 assertions** |
