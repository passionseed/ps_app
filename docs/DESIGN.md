---
name: Passion Seed
description: SHIFT app. Students run real-world projects in rounds (SHIFT) made of Missions, with a squad and a mentor.
version: 3
updated: 2026-10-12
colors:
  canvas: "#F4F2FB"
  wash: "#ECE6FF"
  surface: "#FFFFFF"
  ink: "#14112A"
  ink-2: "#45405E"
  ink-3: "#625C7D"
  violet-50: "#F1ECFF"
  violet-100: "#E4DEF7"
  violet-200: "#D9CCFF"
  violet-400: "#8B6BFF"
  violet-600: "#6D3FF0"
  violet-700: "#5B2FD6"
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
    fontWeight: "500"
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
    note: "Latin words, tags and numerals (tabular figures)"
rounded:
  tag: "8px"
  control: "14px"
  card: "24px"
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
    background: "linear-gradient(#FFFFFF, {colors.violet-50})"
    textColor: "{colors.violet-700}"
    border: "1px #D9CFFF"
    rounded: "{rounded.full}"
    height: "58px"
    icon: "gem: 32px circle, gradient {colors.violet-400} -> {colors.violet-600}, white icon"
    shadow: "0 10px 24px rgba(109,63,240,.18), inner highlight"
    pressed: "sinks 2px, shadow tightens, light haptic"
  card:
    background: "{colors.surface}"
    rounded: "{rounded.card}"
    border: "none"
    shadow: "0 1px 2px rgba(20,17,42,.05), 0 8px 24px rgba(20,17,42,.06)"
  tag:
    background: "{colors.violet-50}"
    textColor: "{colors.violet-700}"
    rounded: "{rounded.tag}"
---

# Design System: Passion Seed (v3)

Code: `lib/theme.ts` (`Violet`, `Ink`, `Surface`, `Status`, plus legacy aliases).
Reference mockups: `~/.gstack/projects/passionseed-ps_app/designs/season-home-20261012/design-system-v3.html`.

## 1. Principles

1. **One accent, one job.** Violet means "act" and "progress". Blue, green and orange are
   only for legacy semantic meaning on career screens, never decoration. Colour is never
   the only signal: every state also has an icon or a word.
2. **Thai-first contrast.** Thai strokes are thin. Body text at least 7:1, secondary at
   least 4.5:1, nothing readable below 4.5:1. Never grey on lavender.
3. **Depth by tone.** Lavender canvas, white surfaces, one soft shadow. Never a border and a
   shadow on the same card. Borders only on inputs and controls (at least 3:1).
4. **One hero per screen.** Only the Pillow button is fun and tactile. Everything else stays
   quiet so the button reads as the next step.
5. **Readable rhythm.** Body 15pt, line-height 1.55 for Thai, metadata at least 13pt,
   weights 400/500/700. Touch targets at least 44pt.
6. **Warm, not childish.** Glossy and tactile only where you press. Flat, calm surfaces
   everywhere else. No emoji as icons or navigation.

## 2. Colour

Measured WCAG contrast:

| Token | Use | Contrast |
|---|---|---|
| ink `#14112A` | titles, body | 16.6:1 on canvas |
| ink-2 `#45405E` | secondary text | 9.8:1 on white, 8.8:1 on canvas |
| ink-3 `#625C7D` | metadata, placeholders | 6.3:1 on white, 5.7:1 on canvas |
| violet-700 `#5B2FD6` | tags, links, accent text | 7.4:1 on white, 6.4:1 on violet-50 |
| violet-600 `#6D3FF0` | progress, selected chip, current node | white text 5.8:1 |
| violet-200 `#D9CCFF` | legacy CTA fill | ink text 12.3:1 |
| control `#8E86AE` | input and control borders | 3.4:1 on white |
| success `#0F7A4D` on `#E8F6EF` | done, success | 4.8:1 |
| warning `#8A4B00` on `#FFF3E0` | rejected, attention | 6.2:1 |

Canvas: `#F4F2FB` with a soft radial wash of `#ECE6FF` from the top right. Surfaces fade
from white to `#FAF8FF` at most; gradients stay subtle.

The dark immersive hackathon theme (`lib/hackathonTheme.ts`) stays separate and is only
for hackathon screens.

## 3. Typography

- Thai and UI: **Bai Jamjuree**. Latin words, tags and numbers: **Libre Franklin** with
  tabular figures.
- Large Thai titles use weight 500, not 300: thin Thai at small sizes breaks up.
- Break long Thai titles by hand at phrase boundaries; Thai has no spaces.
- Tags in English may be uppercase with 0.06em tracking; never uppercase-track Thai.

## 4. Components

- **Pillow button** (primary action, one per screen): white to violet-50 pill, violet-700
  text, a glossy violet "gem" holding the icon, violet-tinted shadow, sinks 2pt on press
  with a light haptic.
- **Secondary actions:** text buttons in violet-700, or a 44pt icon button on violet-50.
- **Cards:** white, 24pt radius, one soft shadow, no border.
- **Tags:** violet-700 on violet-50, 8pt radius, 12pt bold.
- **Chips:** 40pt+ tall; unselected white with a `#CFC8E6` border; selected solid
  violet-600 with white text.
- **Inputs:** white, 1pt control border, 14pt radius, 48pt tall.
- **Progress:** violet-100 track, violet-600 fill.
- **Mission trail:** done = violet-50 circle with a violet-700 check; current = solid
  violet-600 with a ring; not yet = hollow with the control border. Each also says
  "เสร็จแล้ว" / count / "ยังไม่ถึง" in words.
- **Tab bar:** white, line pictogram icons with labels; active = violet-700 plus a 3pt
  top indicator.

## 5. Do's and Don'ts

- **Do** keep one Pillow button per screen.
- **Do** pair every colour state with an icon or word.
- **Don't** use `#9CA3AF`-style light grey for any readable text.
- **Don't** put coloured text on a tint of the same colour below 4.5:1 (the old 10%-tint
  tags failed at 3.3 to 3.8:1).
- **Don't** add borders to cards that already have a shadow.
- **Don't** use emoji as icons, bullets or tab icons.
- **Don't** use side-stripe borders as coloured accents.

## 6. Migration notes (v2 neon -> v3 lavender)

- `Accent.yellow` / `yellowDark` / `yellowLight` are legacy aliases now mapped to violet
  (CTA fill violet-200, pressed violet-300). Existing CTAs keep dark text, which stays
  readable at 12.3:1. Replace them with the Pillow button screen by screen.
- `Text.tertiary` moved from `#9CA3AF` (2.5:1) to ink-3 (6.3:1); every screen using it got
  more readable.
- Remaining hardcoded `#BFFF00` values in screens are not migrated yet.
