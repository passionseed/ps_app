---
name: Passion Seed
description: SHIFT app. Students run real-world projects in 7-day shifts (SHIFT[N]) with a squad and a mentor.
version: 4
codename: Depth
updated: 2026-10-14
colors:
  canvas-top: "#F1ECFF"
  canvas: "#F4F2FB"
  canvas-bottom: "#F7F5FC"
  wash: "#E0D3FF"
  wash-left: "#F7EAFF"
  orb-violet: "#DCCBFF"
  orb-pink: "#FBE3FF"
  glass: "rgba(255,255,255,0.66)"
  glass-rim: "rgba(255,255,255,0.95)"
  surface: "#FFFFFF"
  ink: "#14112A"
  ink-2: "#45405E"
  ink-3: "#5B5576"
  violet-50: "#F1ECFF"
  violet-100: "#E4DEF7"
  violet-200: "#D9CCFF"
  violet-300: "#C4B3FF"
  violet-400: "#8B6BFF"
  violet-600: "#6D3FF0"
  violet-700: "#5B2FD6"
  gem-face: "linear #7E5CFA -> #5F31E3"
  gem-tile: "linear #8B6BFF -> #5B2FD6"
  gem-orb: "radial at 35% 30%: #C9B8FF 0%, #8B6BFF 40%, #5B2FD6 100%"
  glow: "linear 90deg #A48BFF -> #6D3FF0"
  line: "#E7E2F4"
  control: "#8E86AE"
  success: "#0F7A4D"
  success-bg: "#E8F6EF"
  warning: "#8A4B00"
  warning-bg: "#FFF3E0"
  error: "#B91C1C"
typography:
  display:
    fontFamily: "Bai Jamjuree"
    fontSize: "30pt"
    fontWeight: "500 (700 for hero headlines)"
    lineHeight: 1.25
  title:
    fontFamily: "Bai Jamjuree"
    fontSize: "22pt"
    fontWeight: "700"
  body:
    fontFamily: "Bai Jamjuree"
    fontSize: "15pt"
    fontWeight: "400"
    lineHeight: 1.55
  meta:
    fontFamily: "Bai Jamjuree"
    fontSize: "13pt"
    fontWeight: "500"
  latin-and-numbers:
    fontFamily: "Libre Franklin"
    note: "Latin words, tags, numerals (tabular figures) and the SHIFT wordmark"
rounded:
  tag: "999px (glass pill)"
  control: "14px"
  row: "18px"
  card: "22px (glass)"
  hero: "26px"
  sheet: "32px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-pillow:
    background: "linear-gradient(180deg, #FFFFFF 0%, #F6F2FF 60%, #EDE5FF 100%)"
    textColor: "{colors.violet-700}"
    border: "1px #D9CFFF"
    rounded: "{rounded.full}"
    height: "58px"
    gem: "32px radial {colors.gem-orb}, white icon, highlight rim"
    shadow: "inset 0 2px 0 #FFF, inset 0 -3px 8px rgba(139,107,255,.18), 0 12px 26px -8px rgba(109,63,240,.45), 0 2px 4px rgba(20,17,42,.06)"
    pressed: "sinks 2px, shadow tightens, light haptic"
  glass-card:
    background: "{colors.glass}"
    border: "1px {colors.glass-rim}"
    rounded: "{rounded.card}"
    shadow: "0 10px 26px -14px rgba(109,63,240,.35)"
  hero-card:
    background: "linear-gradient(160deg, #FFFFFF 0%, #FBF9FF 55%, #F1EBFF 100%)"
    rounded: "{rounded.hero}"
    shadow: "inset 0 1px 0 #FFF, 0 18px 40px -12px rgba(109,63,240,.28), 0 2px 6px rgba(20,17,42,.05)"
    watermark: "Libre Franklin 700 128pt numeral, rgba(139,107,255,.2) -> transparent"
  tag:
    background: "rgba(255,255,255,.72) glass pill, 1px rim, 0 2px 8px rgba(109,63,240,.10)"
    textColor: "{colors.violet-700}"
    rounded: "{rounded.tag}"
---

# Design System: Passion Seed (v4 "Depth")

Code: `lib/theme.ts` (`Violet`, `Ink`, `Surface`, `Status`, plus the v4 tokens `Canvas`, `Wash`,
`Orb`, `Glass`, `Hero`, `Gem`, `Glow`, `Pillow`, `Dark` and the `Depth` shadows; legacy aliases
stay). Kit: `components/round/*`. Reference mockups:
`~/.gstack/projects/passionseed-ps_app/designs/season-home-20261012/depth-v4.html` (sign-in,
depth language) and `shift-app-v5.html` (home states, steps, guide).

Why v4: the v3 screens were built exactly as v3 said ("flat, calm surfaces everywhere else") and
read as flat white boxes on flat lavender. v4 keeps the v3 palette, type and contrast rules and
adds depth: a layered canvas, glass, one raised hero, glowing progress and a glossier Pillow.

## 1. Principles

1. **One accent, one job.** Violet means "act" and "progress". Green, amber and red only carry
   state (done, attention, error), never decoration. Colour is never the only signal: every
   state also has an icon or a word.
2. **Thai-first contrast.** Thai strokes are thin. Body text at least 7:1, secondary at least
   4.5:1, nothing readable below 4.5:1, on every canvas layer (wash and orbs included). Never
   grey on lavender. Text on glass measures as on white.
3. **Depth in layers.** Canvas (gradient, washes, orbs) -> glass cards -> one raised hero. Light
   comes from the top: rims and highlights are white, shadows are soft violet and sit under the
   card. A white rim is a highlight, not a border; never put a grey or coloured border on a card
   that has a shadow. Real borders belong to inputs and controls (at least 3:1).
4. **One hero, one Pillow.** Each screen has at most one raised hero card and exactly one
   Pillow button (the next step). Everything else is glass and quieter.
5. **Readable rhythm.** Body 15pt, line-height 1.55 for Thai, metadata at least 13pt, weights
   400/500/700. Touch targets at least 44pt. Dynamic Type safe.
6. **Depth everywhere, gloss where you press.** Every surface has depth (canvas, glass, hero,
   glow). Gloss (highlights, gems, gradients you can feel) is for things you press: the Pillow,
   gems, selected chips, pill actions, the tab pill. No emoji as icons or navigation.

## 2. Colour and contrast

Measured WCAG contrast (unchanged rules; ink-3 darkened in v4 so it holds on the wash):

| Token | Use | Contrast |
|---|---|---|
| ink `#14112A` | titles, body | 16.6:1 on canvas, 13.1:1 on the wash |
| ink-2 `#45405E` | secondary text | 9.8:1 on white, 8.8:1 on canvas, 6.9:1 on the wash |
| ink-3 `#5B5576` | metadata, placeholders | 7.0:1 on white, 6.3:1 on canvas, 5.0:1 on the wash |
| violet-700 `#5B2FD6` | tags, links, accent text | 7.4:1 on white, 6.4:1 on violet-50, 5.3:1 on the wash |
| violet-600 `#6D3FF0` | progress, focus | white text 5.8:1 |
| gem-face `#7E5CFA -> #5F31E3` | selected chip, today cell, gem numbers | white text 5.0:1 at 30%, 5.5:1 at the middle |
| control `#8E86AE` | input and control borders | 3.4:1 on white |
| success `#0F7A4D` on `#E8F6EF` | done, success | 4.8:1 |
| warning `#8A4B00` on `#FFF3E0` | rejected, attention | 6.2:1 |
| `#F1ECFF` on dark `#2A2540` | DM card, dark button | 12.6:1 |

- Glass over the canvas composites to `#F4F0FF`-`#FBFBFE`, so text on glass measures as on
  white: ink-3 6.2-6.7:1, ink-2 8.7-9.3:1, violet-700 6.6-7.1:1 (lowest values over the wash).
- v4 moved ink-3 from `#625C7D` (4.46:1 on the wash, a fail) to `#5B5576`. Legacy
  `Text.tertiary` follows.
- White on the light end of a gem (`#8B6BFF`, 3.7:1) is for icons only (graphics need 3:1).
  Text on a gem uses gem-face and sits mid-gradient.
- The SHIFT wordmark on the orb is a logo (white with a violet glow); the subtitle under it is
  deep violet `#3D1FA8` (7.1:1 or more on the sphere).

The dark immersive hackathon theme (`lib/hackathonTheme.ts`) stays separate and is only for
hackathon screens.

## 3. Depth tokens

| Token | Value | Where |
|---|---|---|
| Canvas | vertical `#F1ECFF -> #F4F2FB (42%) -> #F7F5FC` | every SHIFT screen (`RoundShell`) |
| Wash (top right) | `#E0D3FF`, ellipse 120% x 55% at the top-right corner, gone at 62% | canvas |
| Wash (left) | `#F7EAFF`, ellipse 70% x 40% at the left edge 34% down, gone at 72% | canvas |
| Orbs | `#DCCBFF` off the top-right, `#FBE3FF` on the left; 75% opacity | canvas (`orbs`, default on) |
| Glass | `rgba(255,255,255,.66)` + 1pt `rgba(255,255,255,.95)` rim, radius 22 | cards, rows, chips |
| Hero | `#FFFFFF -> #FBF9FF -> #F1EBFF` at 160deg, top highlight, radius 26, faded numeral | one per screen |
| Gem | face / tile / radial orb gradients + white top highlight | icons, numbers, selections |
| Glow | `#A48BFF -> #6D3FF0` fill, `0 0 12px rgba(109,63,240,.55)`, recessed track `rgba(109,63,240,.12)` | progress |
| Pillow | `#FFFFFF -> #F6F2FF -> #EDE5FF`, `#D9CFFF` rim, inner top highlight, inner bottom violet glow | the one button |
| Dark | `#2A2540 -> #14112A` with a faint top highlight | Apple button, DM card |

Shadows (`Depth` in `lib/theme.ts`): CSS `boxShadow` on iOS and web (exact mockup values,
negative spread, drawn only outside the card so translucent glass never shows a shadow through
it); plain `elevation` on Android (cheap, violet-tinted on API 28+).

| Depth | iOS / web | Android |
|---|---|---|
| glass | `0 10px 26px -14px rgba(109,63,240,.35)` | 3 |
| row | `0 6px 16px -12px rgba(109,63,240,.45)` | 2 |
| raised (current step) | `0 12px 26px -12px rgba(109,63,240,.55)` | 6 |
| hero | `0 18px 40px -12px rgba(109,63,240,.28), 0 2px 6px rgba(20,17,42,.05)` | 8 |
| pillow / pressed | `0 12px 26px -8px rgba(109,63,240,.45), 0 2px 4px rgba(20,17,42,.06)` / tighter | 8 / 3 |
| gem / tile | `0 3px 8px rgba(91,47,214,.5)` / `0 8px 16px -6px rgba(91,47,214,.6)` | 4 / 5 |
| glow (today, selected, done slot) | `0 8px 18px -6px rgba(109,63,240,.6)` | 5 |
| pill (tags) | `0 2px 8px rgba(109,63,240,.10)` | 1 |
| float (orb chips, toast) | `0 10px 24px -10px rgba(109,63,240,.45)` | 4 |
| tab bar | `0 10px 30px -10px rgba(20,17,42,.25)` | 10 |
| orb | `0 30px 60px -20px rgba(109,63,240,.6)` | 12 |

Inner highlights and glows are real views (a 1-2pt white top rim, a bottom gradient), not inset
shadows, so they look the same on every platform.

## 4. Typography

- Thai and UI: **Bai Jamjuree** (400/500/700). Latin words, tags, numbers and the wordmark:
  **Libre Franklin** with tabular figures. Use `RText` (`components/round/RText.tsx`); it picks
  the family per string and keeps Thai line height at 1.5x or more.
- Large Thai titles use weight 500; hero headlines (sign-in, home title) may use 700.
- Break long Thai titles by hand at phrase boundaries; Thai has no spaces.
- Tags in English may be uppercase with 0.06em tracking; never uppercase-track Thai.

## 5. Components (kit)

Props are the public API; lane screens code against these names.

| Component | Props | Look |
|---|---|---|
| `RoundShell` | `children, dock?, scroll?, refreshing?, onRefresh?, bottomInset?, keyboard?, orbs? = true, customOrbs?, center?, fill?` | canvas + washes + orbs, 560pt column, docked Pillow over a fade, toast host. `bottomInset > 0` reserves the floating tab bar |
| `GlassCard` | `children, style?, onPress?, accessibilityLabel?, padding? = 16` | glass, radius 22; pressable sinks 1pt |
| `HeroCard` | `children, watermark?, style?, padding? = 18, onPress?` | raised gradient, top highlight, faded numeral |
| `PillowButton` | `label, icon?, onPress, disabled?, busy?, style?` | the one glossy button, gem icon, sinks 2pt with haptic |
| `SoftButton` | `label, onPress, icon?, disabled?, busy?, tone? = glass \| dark` | full-width secondary (glass) or dark (Apple) pill |
| `IconButton` | `icon, label, onPress, size? = 44` | small glossy white -> violet-50 circle |
| `TextButton` | `label, onPress, icon?, tone?` | violet-700 text, 44pt, wraps |
| `Tag` / `StatusTag` | `label, tone?` / `kind, label` | glass pill (violet) or tinted state pill |
| `ChipPicker` | `chips, value, onChange` | white chips; selected = glowing gem-face gradient |
| `Checkbox` | `checked, label, onChange` | white box; checked = gem-face with a glow |
| `RTextInput`, `Field` | TextInput props + `invalid?` | white, control border, violet border + 4pt glow on focus |
| `Banner` / `NeedsAttention` | tone + text (+ action) | violet = glass with an info icon; states tinted with icon and words |
| `DayStrip` | `days: {day, label, state, session}[], onPress?(day)` | 7 cells, today = glowing gem, done = violet-50 + check, session dot |
| `SessionCard` | `state, title, subtitle, actionLabel?, onAction?` | glass row, 42pt gem tile, pill action; `live` pulses |
| `ProgressRing` | `value, total, size? = 46` | gradient arc on a faint track, white centre |
| `GlowProgress` | `value 0..1, height?, style?` | glowing fill on a recessed track |
| `StepChip` | `label, state: done \| progress \| todo` | success / violet-50 / white chips |
| `StepRow` | `n, title, state: done \| current \| todo, trailing, onPress?` | glass rows; current raised with a gem number |
| `GemIcon` | `icon, size? = 30, shape? = circle \| tile` | glossy gem, white icon |
| `AvatarStack` / `AvatarGem` | `people: {label, tone?}[]` | gradient gems with white rings, overlapping |
| `ShiftOrb` | `size?, subtitle?, chips?` | the lit SHIFT sphere with floating glass chips |
| `ShiftTabBar` | `tabs, activeName, onSelect` | floating frosted glass, sliding pill, line icons + labels |
| `MissionTrail`, `NextMissionCard`, `SquadCard`, `EvidenceRow` | unchanged APIs | trail with gem node; hero with slots; glass rows |
| `SkeletonBlock`, `HomeSkeleton`, `ListSkeleton` | sizes | lavender blocks with a shimmer sweep |
| `useToast()` | returns `show(text)` (also callable) | small glass pill above the dock |

## 6. Motion

- Pillow sinks 2pt (shadow tightens) with a light haptic; cards and rows sink 1pt.
- Tab pill springs between tabs; `SessionCard` live ring pulses; orb chips float 3pt; skeletons
  shimmer; the toast fades in from below.
- Every animation checks `useReducedMotion()` and becomes still (or instant) when it is on.

## 7. Platform notes

- **Blur:** only the floating tab bar uses `expo-blur` (iOS and web). Android gets an opaque white
  glass instead (no blur cost). Orbs are radial-gradient discs, never a blur filter. No blur on
  lists.
- **Android:** glass fills are more opaque (`Glass.fillAndroid`) because elevation shadows draw
  under translucent fills; views that cast elevation get a background.
- **Web:** icons set `position: relative` so they paint above absolutely positioned gradient
  faces (DOM order = paint order, as on native); inputs replace the browser focus ring with the
  violet focus glow.
- **Screenshots:** headless Chrome's `--window-size` lays pages out at least 500pt wide and then
  crops the image, which makes text look like it runs off the edge at 390pt. Capture with real
  device metrics (e.g. Playwright `viewport: {width: 390, height: 844}, deviceScaleFactor: 2`).

## 8. Do's and Don'ts

- **Do** keep one Pillow and at most one hero card per screen.
- **Do** pair every colour state with an icon or word.
- **Do** put text on glass or white; on the bare canvas use ink or ink-2 for anything near the
  top-right wash.
- **Don't** build flat white boxes on flat lavender: cards are glass, the hero is raised.
- **Don't** use `#9CA3AF`-style light grey for readable text.
- **Don't** put coloured text on a tint of the same colour below 4.5:1.
- **Don't** add grey or coloured borders to cards that have a shadow (white rims are fine).
- **Don't** use emoji as icons, bullets or tab icons.
- **Don't** use side-stripe borders as coloured accents.

## 9. Migration notes

- v3 -> v4: `Card` is now glass (same API), `Tag` a glass pill, `NextMissionCard` a hero with a
  watermark, `ShiftTabBar` floats (screens keep `bottomInset`), `PillowButton` gained the inner
  highlight and glow, `ChipPicker` selection is a gem gradient, `Skeleton` shimmers. New kit
  files: `GlassCard`, `HeroCard`, `DayStrip`, `SessionCard`, `ProgressRing`, `StepChip`,
  `StepRow`, `GemIcon`, `GlowProgress`, `AvatarStack`, `ShiftOrb`, `SignInPanel`, `Toast`,
  `DepthCanvas`.
- v2 neon -> v3 lavender: `Accent.yellow` / `yellowDark` / `yellowLight` are legacy aliases
  mapped to violet; replace them with the Pillow screen by screen. Remaining hardcoded
  `#BFFF00` values in legacy screens are not migrated.
