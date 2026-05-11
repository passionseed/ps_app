---
name: Passion Seed
description: AI-driven career path simulation and exploration platform
colors:
  primary: "#BFFF00"
  secondary: "#8B5CF6"
  tertiary: "#3B82F6"
  neutral-bg: "#F8F9FA"
  surface: "#FFFFFF"
  text-primary: "#111827"
typography:
  display:
    fontFamily: "Charm, Chonburi, serif"
    fontSize: "28pt"
    fontWeight: "normal"
  title:
    fontFamily: "Bai Jamjuree, sans-serif"
    fontSize: "20pt"
    fontWeight: "bold"
  body:
    fontFamily: "Bai Jamjuree, sans-serif"
    fontSize: "16pt"
    fontWeight: "normal"
  label:
    fontFamily: "Bai Jamjuree, sans-serif"
    fontSize: "12pt"
    fontWeight: "bold"
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  full: "999px"
spacing:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    padding: "16px 24px"
  card-standard:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Passion Seed

## 1. Overview

**Creative North Star: "The Clear Path Accelerator"**

The system balances a clean, innovative, and data-grounded aesthetic with subtle tactile interactions. It provides a bright, high-contrast default environment designed to make career simulations feel accessible and actionable. For specialized contexts, like the Hackathon, the platform shifts to a deeply immersive, bioluminescent dual-theme. The system explicitly rejects rigid enterprise UI patterns.

**Key Characteristics:**
- High-contrast, clean surfaces prioritizing legibility.
- Semantic, vibrant accents that guide the user.
- Tonal layering over heavy shadows.
- Distinct immersive sub-themes for special experiences.

## 2. Colors

The palette uses bright, clear semantic accents against deep obsidian text and off-white backgrounds to guide attention efficiently.

### Primary
- **Passion Neon** (#BFFF00): The main action color, driving the primary CTAs and active states. It demands attention and signals progress.

### Secondary
- **Amethyst Glimpse** (#8B5CF6): Used semantically for education and academic progression markers.

### Tertiary
- **Experience Blue** (#3B82F6): Used semantically for internship steps, work history, and day timeline nodes.

### Neutral
- **Obsidian Slate** (#111827): The deep, grounded color for primary text and high-contrast action pills.
- **Off-White Canvas** (#F8F9FA): Provides subtle contrast behind pure white cards to make content pop without heaviness.

### Named Rules
**The Dual-Thematic Rule.** The primary app remains bright and clean. Deep, dark backgrounds (#03050a) and glowing borders are reserved exclusively for immersive experiences like the Hackathon.

## 3. Typography

**Display Font:** Charm or Chonburi (with serif fallbacks)
**Body Font:** Bai Jamjuree (with sans-serif fallbacks)

**Character:** A modern, clean Thai sans-serif for high utility, contrasted with elegant, expressive serifs for major section headers to add a premium feel.

### Hierarchy
- **Display** (normal, 24-28pt): Premium editorial headers (e.g., "ไทม์ไลน์ของคุณ").
- **Headline** (bold, 18-20pt): Main entity names and card titles.
- **Title** (bold, 16-18pt): Emphasized text and CTA button text.
- **Body** (normal, 14-16pt): Subtitles, company names, and timeline descriptions.
- **Label** (bold, 10-12pt, uppercase): Tags and badges inside cards.

## 4. Elevation

The system relies heavily on tonal layering. Surfaces are completely flat by default, with depth and hierarchy established through subtle background contrast (pure white on off-white) rather than heavy shadows.

### Shadow Vocabulary
- **Subtle Lift** (`elevation: 2`, `opacity: 0.05`): Used very sparingly to separate main content cards from the background canvas.

### Named Rules
**The Tonal Layering Rule.** Avoid heavy or layered shadows. Distinct cards should be recognizable through color contrast and generous internal padding.

## 5. Components

Components feel clean, innovative, and subtly tactile, relying on large touch targets and subtle inflation/lift.

### Buttons
- **Shape:** Fully rounded pill (999px).
- **Primary:** Passion Neon with Obsidian Slate text. High visibility, large full-width touch areas.
- **Action Pills:** Obsidian Slate with pure white text, used for secondary top-level actions.

### Cards / Containers
- **Corner Style:** Large rounded corners (24px to 32px).
- **Background:** Pure white (#FFFFFF).
- **Shadow Strategy:** Flat by default, subtle lift if required.
- **Border:** Transparent or none.
- **Internal Padding:** Generous (16px to 24px).

### Tags / Badges
- **Style:** Soft tinted background of the semantic color (e.g., 10% opacity) with fully saturated text. Fully rounded corners.
- **State:** Bold, uppercase typography with heavy tracking.

### Navigation / Timelines
- Vertical connecting lines are thin (1-2px). Active nodes are circular, filled with semantic colors (Amethyst Glimpse or Experience Blue).

## 6. Do's and Don'ts

### Do:
- **Do** use large, generous touch targets and padding.
- **Do** leverage pure white cards on off-white backgrounds to create structure.
- **Do** use Passion Neon (#BFFF00) for primary, forward-moving actions.

### Don't:
- **Don't** use Microsoft-style corporate, dry, or rigid enterprise UI patterns.
- **Don't** use heavy drop shadows or glassmorphism as a default outside of immersive hackathon contexts.
- **Don't** use side-stripe borders (border-left or border-right greater than 1px) as colored accents.
- **Don't** use modal dialogs as the first thought; rely on inline or progressive alternatives.