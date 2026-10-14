---
name: Passion Seed
description: SHIFT app. Students run real-world projects in 7-day shifts (SHIFT[N]) with a squad and a mentor.
version: 4.2
codename: Depth (keys, calm palette)
updated: 2026-10-15
colors:
  canvas-top: "#F1EFFE"
  canvas: "#F4F2FB"
  canvas-bottom: "#F7F5FC"
  wash: "#E3E0FD"
  wash-left: "#FBECFB"
  orb-violet: "#DFDBFC"
  orb-pink: "#F9E8FA"
  glass: "rgba(255,255,255,0.66)"
  glass-rim: "rgba(255,255,255,0.95)"
  surface: "#FFFFFF"
  ink: "#2A2838"
  ink-2: "#474558"
  ink-3: "#646275"
  violet-50: "#EFEDFF"
  violet-100: "#E7E5FB"
  violet-200: "#D4CFF7"
  violet-300: "#BDB5EE"
  violet-400: "#9384D5"
  violet-600: "#725CBF"
  violet-700: "#634EA8"
  violet-800: "#493A7D"
  gem-face: "linear #8473CC -> #6A55B2"
  gem-tile: "linear #9384D5 -> #6752AD"
  gem-orb: "radial at 35% 30%: #D4CFF7 0%, #9384D5 40%, #6752AD 100%"
  glow: "linear 90deg #ABA1E0 -> #725CBF"
  shadow-tint: "rgb(78,64,132)"
  line: "#E6E5F0"
  control: "#8C89A0"
  success: "#0F7A4D"
  success-bg: "#E8F6EF"
  warning: "#8A4B00"
  warning-bg: "#FFF3E0"
  error: "#AF302B"
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
  key-shift:
    face: "dish 180deg #826FCA 0%, #7059BC 34%, #735DBF 70%, #7C68C7 100%"
    bevel: "1px top rgba(255,255,255,.5), 1px sides rgba(60,44,120,.22), 1.5px front lip rgba(222,216,250,.55)"
    wall: "5px, #5A4897 -> #493B7B (last 16%)"
    contact: "1px rgba(45,34,90,.3) under the wall"
    ambient: "0 10px 16px -10px rgba(78,64,132,.42), fades while pressed"
    legend: "white Bai Jamjuree 700 17pt, 0 1px 0 rgba(50,36,100,.32); white 2.4 icon"
    rounded: "14px continuous"
    height: "53px face + 5px wall"
    pressed: "face eases down 3.2px in 66ms (cubic), light haptic, pool keeps 20%; settles back (mass .5, stiffness 416, damping 20: ~0.16px overshoot, ~175ms)"
  key-porcelain:
    face: "dish #FFFFFF, #F1F0FA, #F5F5FC, #FFFFFF"
    bevel: "#FFFFFF top, #DFDDEE sides, #FFFFFF lip"
    wall: "#DCDAED -> #CCC9E3"
    legend: "{colors.ink}, violet-700 icon"
  glass-card:
    background: "{colors.glass}"
    border: "1px {colors.glass-rim}"
    rounded: "{rounded.card}"
    shadow: "0 10px 26px -14px rgba(78,64,132,.26)"
  hero-card:
    background: "linear-gradient(160deg, #FFFFFF 0%, #FAF9FE 55%, #F0EEFC 100%)"
    rounded: "{rounded.hero}"
    shadow: "inset 0 1px 0 #FFF, 0 18px 40px -12px rgba(78,64,132,.22), 0 2px 6px rgba(42,40,56,.05)"
    watermark: "Libre Franklin 700 128pt numeral, rgba(147,132,213,.2) -> transparent"
  tag:
    background: "rgba(255,255,255,.72) glass pill, 1px rim, 0 2px 8px rgba(78,64,132,.08)"
    textColor: "{colors.violet-700}"
    rounded: "{rounded.tag}"
---

# Design System: Passion Seed (v4 "Depth")

Code: `lib/theme.ts` (`Violet`, `Ink`, `Surface`, `Status`, plus the v4 tokens `Canvas`, `Wash`,
`Orb`, `Glass`, `Hero`, `Gem`, `Glow`, `Keycap`, `KeySize`, `Dark` and the `Depth` shadows;
legacy aliases stay). Kit: `components/round/*`. Reference mockups:
`~/.gstack/projects/passionseed-ps_app/designs/season-home-20261012/depth-v4.html` (sign-in,
depth language) and `shift-app-v5.html` (home states, steps, guide).

Why v4: the v3 screens were built exactly as v3 said ("flat, calm surfaces everywhere else") and
read as flat white boxes on flat lavender. v4 keeps the v3 palette, type and contrast rules and
adds depth: a layered canvas, glass, one raised hero, glowing progress.

Why v4.2 (calm palette): the keys landed, but the colours were "harsh on the eyes", and the
numbers agreed. The accent sat at OKLCH chroma 0.25 (the most saturated sRGB allows at that
hue; UI violets like Radix's sit near 0.18) and leaned blue (hue 286). Ink was near-black
(16.6:1). Every key had a navy wall (12:1 against the canvas), and shadows were bright violet
glows at 45-60% opacity. Saturated blue-violet is the hardest colour for the eye to focus
(it lands in front of the retina), so its edges against white seem to shimmer, and big
saturated areas leave afterimages. v4.2 keeps every structure and lowers the noise. On the
same screens, measured colourfulness fell 36-44%. Pixels above chroma 0.15 fell from about 7%
to 0, and near-black pixels from about 1.8% to 0.

Why v4.1 (keys): the v4 Pillow was a white-to-lavender pill with a violet glow. It was made of the
same soft material as the cards and tab bar (about 1.0:1 against the canvas, a 1.3:1 rim, a 26pt
halo and a 6% contact shadow), so it read as one more cloud, not as something to press. Buttons
are now keycaps: the one hard, engineered object in a soft world (section 6). SHIFT is a key.

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
4. **One hero, one Shift key.** Each screen has at most one raised hero card and exactly one
   violet Shift key (the next step). Everything else is glass, porcelain keys or text.
5. **Readable rhythm.** Body 15pt, line-height 1.55 for Thai, metadata at least 13pt, weights
   400/500/700. Touch targets at least 44pt. Dynamic Type safe.
6. **Glass is where you are; keys are what you do.** Surfaces, rows, navigation and the tab bar
   are glass (soft, translucent, diffuse shadows). Anything that commits (save, send, join,
   choose, cheer, record) is a key (opaque, crisp edges, a wall, travel, a click). If it is soft
   you read it; if it is solid you press it. No emoji as icons or navigation.

## 2. Colour and contrast

**Calm rules (v4.2).** The palette is designed in OKLCH (perceptual lightness, chroma, hue), and
`tests/round-palette.test.ts` enforces it:
- Accent chroma is at most 0.15 (fills, key faces, gems, progress). Tints and washes stay at
  0.06 or below. Hue is 291, a little warmer than the old 286.
- Legibility comes from lightness contrast, not saturation. Thresholds are unchanged (body
  7:1, secondary 4.5:1, controls 3:1, on every canvas layer).
- No near-black: ink sits at 12-14:1, not 16+.
- Shadows are a deep muted violet `rgb(78,64,132)`, never a bright glow. No halo above 0.45
  opacity; most are 0.25-0.4.
- One saturated area per screen: the Shift key. Everything else is tinted or glass.

Measured WCAG contrast:

| Token | Use | Contrast |
|---|---|---|
| ink `#2A2838` | titles, body | 13.0:1 on canvas, 11.2:1 on the wash, 14.4:1 on white |
| ink-2 `#474558` | secondary text | 9.3:1 on white, 8.4:1 on canvas, 7.2:1 on the wash |
| ink-3 `#646275` | metadata, placeholders | 5.9:1 on white, 5.3:1 on canvas, 4.6:1 on the wash |
| violet-700 `#634EA8` | tags, links, accent text | 6.6:1 on white, 5.7:1 on violet-50, 5.1:1 on the wash |
| violet-600 `#725CBF` | progress, focus | white text 5.3:1 |
| gem-face `#8473CC -> #6A55B2` | today cell, gem numbers | white text 4.5:1 at 30%, 4.8:1 at the middle |
| key-shift face | the Shift key legend | white 5.5:1 at 34%, 5.2:1 at 70% |
| control `#8C89A0` | input and control borders | 3.4:1 on white |
| success `#0F7A4D` on `#E8F6EF` | done, success | 4.8:1 |
| warning `#8A4B00` on `#FFF3E0` | rejected, attention | 6.2:1 |
| error `#AF302B` | errors | 6.4:1 on white, 5.6:1 on `#FDECEC` |
| `#F4F3FF` on dark `#3A3850` | DM card, dark button | 10.3:1 |

- Glass over the canvas composites to `#F4F0FF`-`#FBFBFE`, so text on glass measures as on
  white: ink-3 6.2-6.7:1, ink-2 8.7-9.3:1, violet-700 6.6-7.1:1 (lowest values over the wash).
- Legacy `Text.tertiary` follows ink-3.
- White on the light end of a gem (`#9384D5`, 3.2:1) is for icons only (graphics need 3:1).
  Text on a gem uses gem-face and sits mid-gradient.
- The SHIFT wordmark on the orb is a logo (white with a soft violet shadow); the subtitle
  under it is violet-800 `#493A7D` (5.4:1 or more on the sphere).

The dark immersive hackathon theme (`lib/hackathonTheme.ts`) stays separate and is only for
hackathon screens.

## 3. Depth tokens

| Token | Value | Where |
|---|---|---|
| Canvas | vertical `#F1EFFE -> #F4F2FB (42%) -> #F7F5FC` | every SHIFT screen (`RoundShell`) |
| Wash (top right) | `#E3E0FD`, ellipse 120% x 55% at the top-right corner, gone at 62% | canvas |
| Wash (left) | `#FBECFB`, ellipse 70% x 40% at the left edge 34% down, gone at 72% | canvas |
| Orbs | `#DFDBFC` off the top-right, `#F9E8FA` on the left; 60% opacity | canvas (`orbs`, default on) |
| Glass | `rgba(255,255,255,.66)` + 1pt `rgba(255,255,255,.95)` rim, radius 22 | cards, rows, chips |
| Hero | `#FFFFFF -> #FAF9FE -> #F0EEFC` at 160deg, top highlight, radius 26, faded numeral | one per screen |
| Gem | face / tile / radial orb gradients + white top highlight | icons, numbers, selections |
| Glow | `#ABA1E0 -> #725CBF` fill, `0 0 12px rgba(114,92,191,.35)`, recessed track `rgba(114,92,191,.12)` | progress |
| Keycap | dished face, bevels, a wall, contact + ambient shadow (section 6, `Keycap` / `KeySize`) | every action |
| Dark | `#3A3850 -> #2A2838` with a faint top highlight | Apple button, DM card |

Shadows (`Depth` in `lib/theme.ts`): CSS `boxShadow` on iOS and web (exact mockup values,
negative spread, drawn only outside the card so translucent glass never shows a shadow through
it); plain `elevation` on Android (cheap, violet-tinted on API 28+).

| Depth | iOS / web | Android |
|---|---|---|
All shadows use the muted tint `rgb(78,64,132)` (v4.2; it was bright violet `rgb(109,63,240)`).

| Depth | iOS / web | Android |
|---|---|---|
| glass | `0 10px 26px -14px rgba(78,64,132,.26)` | 3 |
| row | `0 6px 16px -12px rgba(78,64,132,.32)` | 2 |
| raised (current step) | `0 12px 26px -12px rgba(78,64,132,.4)` | 6 |
| hero | `0 18px 40px -12px rgba(78,64,132,.22), 0 2px 6px rgba(42,40,56,.05)` | 8 |
| nav (back, close) | `0 1px 2px rgba(42,40,56,.08), 0 6px 14px -8px rgba(78,64,132,.3)` | 2 |
| gem / tile | `0 3px 8px rgba(78,64,132,.35)` / `0 8px 16px -6px rgba(78,64,132,.4)` | 4 / 5 |
| glow (today, selected, done slot) | `0 8px 18px -6px rgba(78,64,132,.38)` | 5 |
| pill (tags) | `0 2px 8px rgba(78,64,132,.08)` | 1 |
| float (orb chips, toast) | `0 10px 24px -10px rgba(78,64,132,.32)` | 4 |
| tab bar | `0 10px 30px -10px rgba(42,40,56,.2)` | 10 |
| orb | `0 30px 60px -20px rgba(78,64,132,.45)` | 12 |

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
| `RoundShell` | `children, dock?, scroll?, refreshing?, onRefresh?, bottomInset?, keyboard?, orbs? = true, customOrbs?, center?, fill?` | canvas + washes + orbs, 560pt column, docked Shift key over a fade, toast host. `bottomInset > 0` reserves the floating tab bar |
| `GlassCard` | `children, style?, onPress?, accessibilityLabel?, padding? = 16` | glass, radius 22; pressable sinks 1pt |
| `HeroCard` | `children, watermark?, style?, padding? = 18, onPress?` | raised gradient, top highlight, faded numeral |
| `ShiftKey` | `label, icon? = check, onPress, disabled?, busy?, style?` | the one violet key per screen (`Key tone="shift" size="lg"`) |
| `Key` | `label, onPress, tone? = porcelain \| shift \| ink \| danger, size? = md \| lg \| sm, icon?, round?, down?, led?, busy?, disabled?, haptic?` | every keycap (section 6) |
| `IconButton` | `icon, label, onPress, size? = 44` | glass navigation circle (back, close), ink icon |
| `TextButton` | `label, onPress, icon?, tone?` | violet-700 text, 44pt, wraps |
| `Tag` / `StatusTag` | `label, tone?` / `kind, label` | glass pill (violet) or tinted state pill |
| `ChipPicker` | `chips, value, onChange` | radio keys: porcelain with an unlit LED; selected latches down, violet, LED lit |
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

## 6. Keys

SHIFT is a key: the one that changes what every other key does. Every action is a keycap, an
engineered object with a face, a wall, travel and a click. Code: `components/round/Key.tsx`
(`Key`, `ShiftKey`), tokens `Keycap`, `KeyDish`, `KeySize` in `lib/theme.ts`.

**Anatomy** (light from the top, as everywhere):

| Part | What it does | Shift key values |
|---|---|---|
| Face | Dished, not domed: bright top bevel, a shaded band under it, lighter toward the front. A pillow pushes back; a key takes your finger. | `#826FCA` 0%, `#7059BC` 34%, `#735DBF` 70%, `#7C68C7` 100% |
| Bevels | Crisp edges. The top catches light, the sides turn away, the front lip catches light again and splits face from wall. | top 1pt white 50%, sides 1pt `rgba(60,44,120,.22)`, lip 1.5pt `rgba(222,216,250,.55)` |
| Wall | The travel you can see. Darkens near the surface (8.6:1 against the canvas, not a navy 12:1). | 5pt, `#5A4897` -> `#493B7B` |
| Contact | A 1pt line right under the wall: what makes it sit instead of float. | `rgba(45,34,90,.3)` (a plain view, all platforms) |
| Ambient | A tight pool under the key, never a halo. Fades out while pressed. | `0 10px 16px -10px rgba(78,64,132,.42)` (iOS, web) |
| Legend | Printed on the face. Directional glyphs (arrow, chevron, external) follow the label; others lead. | white 700, 1pt legend shadow |

**Tones** (`Keycap`): `shift` calm violet, the one primary per screen (white legend 5.2:1 or
more where it sits); `porcelain` white keycap, ink legend, violet icon, for secondary actions
and options; `ink` dark keycap (Apple fallback); `danger` muted brick red for destructive
commits (4.8:1); `off` (any disabled key): unlit, wall kept, no ambient, ink-3 legend 4.7:1.
`tests/round-keys.test.ts` checks every legend at the 34% and 70% stops.

**Sizes** (`KeySize`, face + wall, radius about a quarter of the face, continuous corners):
`lg` 53 + 5, r14, 17pt (Shift key, sign-in); `md` 44 + 4, r13, 16pt (secondary); `sm` 36 + 3, r11,
14pt (options, small actions; 4pt hit slop makes 44pt). Round keys: 66 / 44 / 38 (record, play,
remove, cheer).

**Feel:**
- Press (v4.2.1, 20% softer than v4.1, which "did too much"): the face eases down 80% of
  `travel - 1` (3.2pt on a large key) in 66ms (ease-out cubic), so the wall never fully
  closes. The face darkens 8% (porcelain 4%), the ambient pool keeps 20%, and a light haptic
  (not rigid) marks the press.
- Release: a spring (mass 0.5, stiffness 416, damping 20, damping ratio 0.69), about 0.16pt of
  overshoot, so no visible bounce, settled within 0.1pt by ~175ms.
- Busy: the key stays down with three slow lights breathing (45-90% opacity, 1.08s cycle) in
  place of the icon until the work is done, then settles back.
- Radio keys (`ChipPicker`, idea pick): the selected key latches down, turns violet and lights
  its LED; pressing another pops it up, like preset buttons on a car radio. Selection ticks
  (`selectionAsync`), not clicks. They wait 80ms before springing back so a press that selects
  them stays down.
- One-way toggles (cheer): latch down and stay lit even when locked.
- Reduce Motion: positions change instantly; haptics stay.

**When to use what:** one `ShiftKey` per screen for the next step. Porcelain keys for other
actions. `TextButton` for tertiary links. Glass (`GlassCard` rows, `IconButton`, the tab bar) for
navigation. Brand buttons follow their brand: Google is a porcelain key with the full-colour G;
Apple uses the native black button with key-shaped corners (`KeySize.lg`).

## 7. Motion

- Keys ease down and settle as above; cards and rows sink 1pt.
- Tab pill springs between tabs; `SessionCard` live ring pulses; orb chips float 3pt; skeletons
  shimmer; the toast fades in from below.
- Every animation checks `useReducedMotion()` and becomes still (or instant) when it is on.

## 8. Platform notes

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

## 9. Do's and Don'ts

- **Do** keep one Shift key and at most one hero card per screen.
- **Do** make anything that commits a key, and anything that only navigates glass.
- **Do** pair every colour state with an icon or word.
- **Do** put text on glass or white; on the bare canvas use ink or ink-2 for anything near the
  top-right wash.
- **Don't** build flat white boxes on flat lavender: cards are glass, the hero is raised.
- **Don't** use `#9CA3AF`-style light grey for readable text.
- **Don't** put coloured text on a tint of the same colour below 4.5:1.
- **Don't** add grey or coloured borders to cards that have a shadow (white rims are fine).
- **Don't** use emoji as icons, bullets or tab icons.
- **Don't** use side-stripe borders as coloured accents.
- **Don't** build a button from the same soft material as the surface under it (a white pill on
  white glass with a violet glow). Buttons need value contrast, a crisp edge and a contact
  shadow.
- **Don't** give keys halos or pill radii; keep the shadow a tight pool and the radius key-like.

## 10. Migration notes

- v4.1 -> v4.2 (calm palette): same token names, new values (`Violet`, `Ink`, `Surface`,
  `Canvas`, `Wash`, `Orb`, `Hero`, `Gem`, `Glow`, `Keycap`, `Depth`, `Dark`, `Status.error`).
  `Violet[800]` is new. Hard-coded violets in components moved to the calm values. Keep new
  colours inside the calm rules (section 2); `tests/round-palette.test.ts` fails on chroma
  above 0.15 or near-black ink.

- v4 -> v4.1 (keys): `PillowButton` is now `ShiftKey` (same props); `SoftButton` is `Key`
  (`tone="porcelain"`, or `tone="ink"` for dark); `PillAction` is `Key size="sm"`; icon actions
  (play, remove, record, cheer) are round keys; `ChipPicker` is radio keys; `IconButton` stays
  for navigation and is glass with an ink icon. The `Pillow` token and `Depth.pillow` are gone.

- v3 -> v4: `Card` is now glass (same API), `Tag` a glass pill, `NextMissionCard` a hero with a
  watermark, `ShiftTabBar` floats (screens keep `bottomInset`), `PillowButton` gained the inner
  highlight and glow, `ChipPicker` selection is a gem gradient, `Skeleton` shimmers. New kit
  files: `GlassCard`, `HeroCard`, `DayStrip`, `SessionCard`, `ProgressRing`, `StepChip`,
  `StepRow`, `GemIcon`, `GlowProgress`, `AvatarStack`, `ShiftOrb`, `SignInPanel`, `Toast`,
  `DepthCanvas`.
- v2 neon -> v3 lavender: `Accent.yellow` / `yellowDark` / `yellowLight` are legacy aliases
  mapped to violet; replace them with keys screen by screen. Remaining hardcoded
  `#BFFF00` values in legacy screens are not migrated.
