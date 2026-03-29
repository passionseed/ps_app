# Career Simulator — Design Guidelines

This document serves as the canonical reference for the visual design tokens, layout mathematics, and restrained premium glass styling established in the `Career Simulator` redesign.s

## 1. Global Themes & Colors

The design uses a clean, multi-layered aesthetic with high contrast and semantic accenting.

### Backgrounds
- **Primary Page Background**: `#F3F4F6` (Cool Grey)
  - *Rationale*: Simulates physical depth by contrasting against brilliant white cards.
- **Glass Surface**: `#FFFFFF` (Pure White) with variable opacity.

### Semantic Accent Colors
| Category | Color (HEX) | Use Case |
| :--- | :--- | :--- |
| **Brand / Primary CTA** | `#BFFF00` | Primary buttons, active switches, brand moments. |
| **Education** | `#8B5CF6` | University steps, academic achievements. |
| **Experience** | `#3B82F6` | Internship steps, work history. |
| **Destination** | `#10B981` | Job steps, success states, completion. |
| **Passion/Energy** | `#F97316` | Metrics, motivation indicators. |
| **Alert/Error** | `#EF4444` | High risk, low confidence, errors. |
| **Warning** | `#F59E0B` | In-progress, neutral warnings. |

### Text Hierarchy
- **Primary**: `#111827` (Deep Obsidian Slate) - Headers, titles, primary labels.
- **Secondary**: `#4B5563` (Cool Mid-Grey) - Subtitles, body text.
- **Tertiary**: `#6B7280` (Slate Grey) - Details, captions.
- **Muted**: `#9CA3AF` (Light Grey) - Disabled states, hints.

## 2. Typography

We use a dual-font system to ensure premium clarity for both English and Thai scripts.

- **English Font**: `Libre Franklin` (Variable)
- **Thai Font**: `Bai Jamjuree` (Variable)

### Semantic Presets
| Preset | Size | Weight | Color | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Header** | 28pt | 700 (Bold) | `Text.primary` | Main screen titles. |
| **Title** | 22pt | 800 (Extra) | `Text.primary` | Card titles, section headers. |
| **Subtitle** | 18pt | 700 (Bold) | `Text.primary` | Secondary headings. |
| **Body** | 16pt | 400 (Regular) | `Text.secondary` | General content. |
| **Label** | 12pt | 700 (Bold) | `Text.tertiary` | Uppercase, 0.8 tracking. |
| **Caption** | 11pt | 600 (Semi) | `Text.tertiary` | Metadata, small details. |

## 3. The "Premium Glass" Recipe

Glassmorphism in Career Simulator is achieved through a specific layering of gradients, highlights, and restrained shadows.

### A. The Master Gradient
Used for high-priority containers like `CareerPathCard`.
- **Colors**: `LinearGradient(180deg, #FFFFFF 0%, #F9F5FF 50%, #EEF2FF 100%)`
- **Effect**: Subtle shift from white to atmospheric purple and blue.
- **Do not use**: Decorative color circles, floating orb backgrounds, or halo effects behind content.

### B. Glass Physics
- **Border**: `1px` solid `rgb(206, 206, 206)` or semantic accent at `0.15` opacity.
- **Top Highlight**: `1px` absolute line at `top: 0` using `rgba(255, 255, 255, 0.7)`.
- **Corner Radius**:
  - Master Cards: `32px` (`Radius."2xl"`)
  - Standard Cards: `24px` (`Radius.xl`)
  - Components: `20px` (`Radius.lg`)

### C. Shadow Systems
- **Neutral Card**: `shadowOpacity: 0.06, shadowRadius: 4, elevation: 2`
- **Deep Card**: `shadowOpacity: 0.08, shadowRadius: 12, elevation: 4`
- **Colored shadows**: Avoid accent-tinted glows. Keep shadows neutral and structural.
- **CTA treatment**: Use color, contrast, and shape for emphasis instead of extra glow.

## 4. Interactive Components

### Buttons (`GlassButton.tsx`)
- **Primary**: High-saturation Lime treatment (`#BFFF00` ➔ `#9FE800`) without extra glow.
- **Ghost**: `50%` white background with `30%` white border.
- **Micro-interactions**:
  - `PressIn`: Scale to `0.96`, spring tension `300`.
  - `PressOut`: Scale back to `1.0`.

### States
- **Disabled**: `opacity: 0.4`.
- **Loading**: Replaces text with a tinted `ActivityIndicator`.

## 5. Layout & Spacing

We adhere to an **8pt Grid System** for all layout decisions.

- **Screen Header Top Padding**: `48px` (`Space."5xl"`)
- **Standard Padding**: `24px` (`Space."2xl"`)
- **Inter-component Gap**: `16px` (`Space.lg`)
- **Small Element Spacing**: `8px` (`Space.sm`)

---

*Use these guidelines as a blueprint for all new features. When in doubt, refer to [lib/theme.ts](file:///Users/bunyasit/dev/ps_app/lib/theme.ts) for the exact code implementation of these tokens.*
