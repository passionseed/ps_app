# Career Simulator — Design Guidelines

This document serves as the canonical reference for the visual design tokens, layout mathematics, and "Premium Glass & Glow" effects established in the `Career Simulator` redesign. It can be used as a blueprint when building matching screens across the application.

## 1. Global Themes & Backgrounds

- **Page Background (`my-paths.tsx`)**: `#F3F4F6`
  - _Rationale_: A structured, cool grey that significantly contrasts against brilliant white cards, simulating physical depth.

- **Primary Text Colors**:
  - Headers / Titles: `#111827` (Deep Obsidian Slate)
  - Subtitles / Secondary: `#4B5563` (Cool Mid-Grey)
  - Details / Tertiary Text: `#6B7280`

## 2. The "Wow Effect" Master Card (`CareerPathCard.tsx`)

A seamless, expansive glassmorphic container that flows across the screen horizontally.

- **Background Gradient**: `LinearGradient(180deg, #FFFFFF 0%, #F9F5FF 50%, #EEF2FF 100%)`
  - _Effect_: A pristine white surface that subtly dissolves into atmospheric purple and blue tints towards the bottom, removing the need for harsh separator blocks.
- **Corner Radius**: `32px` (Ultra-soft, organic structural radius)
- **Border**: `1px solid rgb(206, 206, 206)`
- **Premium Shadow Physics**:
  - Emulates an optical inset/outset drop: `shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2`
- **Internal Padding**: `24px`

## 3. "Glass & Glow" Roadmap Components (`PathStepCard.tsx`)

Timeline components representing distinct phases. These steer away from generic styling by applying dedicated, soft-glow lighting.

### Base Component Structure

- **Container**: `borderRadius: 20px` with `18px` internal padding.
- **Gaps**: `gap: 16px` structural spacing for high legibility.
- **Highlights**: `1px` absolute top highlight `rgba(255,255,255,0.7)` mimicking crisp glass reflection.

### Component Color Tokens

Each step type uses an ultra-light gradient background paired with a deep accent color, and importantly, an _accent-tinted_ shadow glow:

**A. Education (`university`)**

- Shadow Glow: `rgba(139, 92, 246, 0.25)`
- Gradient (`Start` to `End`): `#FFFFFF` ➔ `#FDFCFF`
- Accent / Borders: `#8B5CF6` / `rgba(139, 92, 246, 0.15)`

**B. Experience (`internship`)**

- Shadow Glow: `rgba(59, 130, 246, 0.25)`
- Gradient (`Start` to `End`): `#FFFFFF` ➔ `#FCFDFF`
- Accent / Borders: `#3B82F6` / `rgba(59, 130, 246, 0.15)`

**C. Destination (`job`)**

- Shadow Glow: `rgba(16, 185, 129, 0.25)`
- Gradient (`Start` to `End`): `#FFFFFF` ➔ `#FCFEFD`
- Accent / Borders: `#10B981` / `rgba(16, 185, 129, 0.15)`

## 4. Spacing & Pacing Mathematics

- **Screen Header Top Padding**: `48px` (Allows the cards to dominate the viewport immediately).
- **Master Carousel Gaps**: `16px` between swipeable full-width cards.
- **Roadmap Vertical Breathing Room**: `marginBottom: 16px` between individual roadmap steps.

---

_Use these extracted styles when mapping out further features (like specific job views, analytics dashboards, or education planners) to guarantee a cohesive, polished "YC Startup" aesthetic._
