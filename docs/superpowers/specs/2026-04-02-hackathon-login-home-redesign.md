# Hackathon Login & Home Redesign

**Date:** 2026-04-02
**Status:** Approved
**Scope:** `app/hackathon-login.tsx`, `app/(hackathon)/home.tsx`

---

## Design Theme: Bioluminescent Ocean (Direction A — Deep Glow)

The hackathon uses a distinct visual identity separate from the main PassionSeed app. The theme is an immersive underwater, bioluminescent experience — deep dark backgrounds, soft cyan/purple glow orbs, glass cards, star particles, and SVG creature accents.

**Approved design decisions:**
- Direction A (Deep Glow) for both screens
- Login: Option B layout — left-aligned, atmospheric, jellyfish SVG accent top-right
- Home: Phase cards with SVG node graph inside (connected dots representing activities)

---

## Design Tokens

All screens use these constants (not the main app's `#00F0FF` cyan):

```ts
const BG         = "#03050a"          // deepest ocean
const CARD_BG    = "rgba(13,18,25,0.95)"
const CARD_BG2   = "rgba(18,28,41,0.85)"
const CYAN       = "#91C4E3"          // hack-cyan (primary accent)
const BLUE       = "#65ABFC"          // hack-blue (links, back button)
const PURPLE     = "#9D81AC"          // hack-purple-muted (CTA button)
const BORDER     = "rgba(74,107,130,0.35)"   // hack-border-dark
const BORDER_MID = "rgba(90,122,148,0.35)"   // hack-border-muted
const WHITE      = "#FFFFFF"
const WHITE75    = "rgba(255,255,255,0.75)"
const WHITE45    = "rgba(255,255,255,0.45)"
const WHITE28    = "rgba(255,255,255,0.28)"
```

---

## 1. Login Screen (`app/hackathon-login.tsx`)

### Layout
- Full-screen dark background (`#03050a`)
- Left-aligned content, vertically spaced with safe area top padding
- Jellyfish SVG floating top-right (absolute positioned, `opacity: 0.45`)
- 3 ambient glow orbs (absolute, `blur: 50-60px`): cyan top-left, purple bottom-right, blue center-fade
- 5–6 small star particles scattered across the background

### Header
- **Back button**: `‹ Back` in `#65ABFC`, top-left
- **Eyebrow**: "NEXT DECADE HACKATHON" — `10px`, `letter-spacing: 0.28em`, uppercase, `rgba(145,196,227,0.45)`
- **Title**: "Sign in to\nyour journey" — `30px bold`, white, `text-shadow: 0 0 30px rgba(145,196,227,0.3)`
- **Subtitle**: "Use your registered hackathon email and password." — `13px`, `rgba(255,255,255,0.4)`

### Form Fields
- Background: `rgba(26,37,48,0.75)`
- Border: `1.5px solid rgba(90,122,148,0.35)`, `border-radius: 14px`
- Field label: `9px`, `letter-spacing: 0.22em`, uppercase, `rgba(145,196,227,0.55)`
- Input text: `16px`, white

### CTA Button
- Background: `#9D81AC` (purple)
- `border-radius: 40px` (pill shape)
- `box-shadow: 0 0 40px rgba(157,129,172,0.55)`
- Text: `15px bold`, white, "Sign In →"
- Disabled state: `opacity: 0.5`

### Footer
- "Forgot password? Contact your coordinator." — `11px`, `rgba(255,255,255,0.25)`, "Contact your coordinator" in `rgba(145,196,227,0.5)`

### Jellyfish SVG
- Positioned absolute: `right: 18px`, `top: 60px` (below safe area)
- `width: 64px`, `height: 80px`, `opacity: 0.45`
- Bell: ellipse with `rgba(145,196,227,0.07)` fill, `rgba(145,196,227,0.3)` stroke
- 5 tentacle paths curving downward in `rgba(145,196,227,0.2–0.3)`
- Inner glow ellipse + core ellipse

---

## 2. Home Screen (`app/(hackathon)/home.tsx`)

### Layout
- `ScrollView` with `#03050a` background
- Safe area top padding
- 2 ambient glow orbs (cyan top-left, purple bottom-right)
- Sections: Header → Preview Banner (if needed) → Phase Carousel → Team Card

### Header
- **Eyebrow**: program title (e.g. "EPIC SPRINT") — `10px`, `letter-spacing: 0.25em`, `rgba(145,196,227,0.5)`
- **Title**: "Your Journey" — `26px bold`, white, `text-shadow: 0 0 30px rgba(145,196,227,0.25)`

### Preview Banner
- When `isPreview = true`: amber-tinted glass card with dot + "Preview Mode" + subtitle
- Colors unchanged from current implementation

### Phase Card (carousel item)
Each phase gets one card. Card uses glass morphism styling:
- Background: `linear-gradient(135deg, rgba(13,18,25,0.95), rgba(18,28,41,0.85))`
- Border: `1px solid rgba(74,107,130,0.35)`, `border-radius: 20px`
- `box-shadow: 0 0 30px rgba(74,107,130,0.12)`
- Small glow orb inside card (top-left, `rgba(145,196,227,0.07)`)

**Card Header:**
- Phase label: "PHASE 1" — `9px`, uppercase, `rgba(145,196,227,0.45)`
- Phase name: `15px bold`, white
- % complete: `11px`, `rgba(145,196,227,0.6)` (e.g. "25% complete")
- Due date: top-right, `11px`, `rgba(255,255,255,0.3)` (e.g. "8/4")

**Node Graph (SVG, `height: 90px`):**
Rendered as an inline SVG spanning the card width. One node per activity, connected left-to-right by dashed lines.

Node states:
- **Completed**: filled `#91C4E3` circle, checkmark icon, dashed connector to next node
- **Current**: double-ring (outer dashed pulse ring + solid inner ring), small center dot, connector to next in dimmer style
- **Upcoming**: dim outline circle `rgba(255,255,255,0.12)` fill, no connector glow

Node labels: activity title below each node, `7.5px`, matching opacity to node state.

**Progress Bar:**
- `height: 2px`, `rgba(255,255,255,0.07)` track
- Fill: `#91C4E3` with `box-shadow: 0 0 6px rgba(145,196,227,0.6)`
- Width: `(completedCount / totalCount) * 100%`

**Card Footer:**
- Left: "N activities" — `10px`, `rgba(255,255,255,0.28)`
- Right: "Tap to open →" — `10px`, `#65ABFC`

### Carousel
- Horizontal `ScrollView` (scroll disabled, chevron-controlled)
- Left/right chevrons in `#91C4E3`
- Peek of next card visible on right
- Dot indicators below carousel, active dot in `#91C4E3` with glow

### Team Card
- Glass card matching phase card style (slightly smaller border-radius: `16px`)
- "TEAM" eyebrow label
- Team name `16px bold`
- Team ID right-aligned `rgba(255,255,255,0.25)`

---

## Node Graph — Data Mapping

For phases with `hackathon_phase_activities`:
- Each activity = one node
- Progress from `hackathon_activity_individual_submissions` (or preview: all 0%)
- In preview mode: node 1 = completed, node 2 = current, rest = upcoming (illustrative)

For phases with legacy `hackathon_phase_modules` (playlist-based):
- Keep existing `JourneyNodeGraph` component or adapt similarly

---

## Files to Change

| File | Change |
|------|--------|
| `app/hackathon-login.tsx` | Full redesign per spec above |
| `app/(hackathon)/home.tsx` | Replace phase card with node graph card |

No new components needed — SVG rendered inline inside the phase card.
