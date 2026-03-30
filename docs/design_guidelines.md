# Career Simulator — Design Guidelines

This document serves as the canonical reference for the visual design tokens, layout mathematics, and styling established in the `Career Simulator` app, based on the provided UI references.

## 1. Global Themes & Colors

The design uses a clean, bright aesthetic with high contrast, white cards on soft backgrounds, and vibrant semantic accenting.

### Backgrounds
- **Primary Page Background**: `#F8F9FA` or `#F3F4F6` (Very Light Cool Grey / Off-white)
  - *Rationale*: Provides a subtle contrast to make the pure white content cards pop without being heavy.
- **Surface**: `#FFFFFF` (Pure White) for cards and main content containers.

### Semantic Accent Colors
| Category | Color (HEX) | Use Case |
| :--- | :--- | :--- |
| **Brand / Primary CTA** | `#BFFF00` (Lime) | Main bottom CTA buttons (e.g., "เริ่มวัน 1"), active states. Text on this should be Black. |
| **Action Pill** | `#111827` (Black) | Secondary top-level actions (e.g., "บันทึก" Save button). Text is White. |
| **Education** | `#8B5CF6` (Purple) | University steps, academic badges, "Future" (Rocket) metric. |
| **Experience** | `#3B82F6` (Blue) | Internship steps, work history, Day timeline nodes. |
| **Alignment/Success** | `#10B981` (Green) | "Alignment" (Globe) metric, success states. |
| **Passion/Energy** | `#F97316` (Orange) | "Passion" (Fire) metric. |
| **Destructive** | `#EF4444` (Red) | Delete icons (Trash can). |

### Text Hierarchy
- **Primary**: `#111827` (Deep Slate / Black) - Headers, titles, primary labels.
- **Secondary**: `#4B5563` (Cool Mid-Grey) - Subtitles, body text, timeline descriptions.
- **Tertiary / Icons**: `#9CA3AF` (Light Grey) - Inactive timeline nodes, subtle metadata.

## 2. Typography

The app uses a mix of modern sans-serif for readability and an elegant serif for section headers to add character.

- **Primary Sans-Serif Font**: `Bai Jamjuree` (or similar modern Thai sans-serif) for body, buttons, and most UI elements.
- **Display Serif Font**: A Thai serif font (e.g., `Charm` or `Chonburi`) is used specifically for large, expressive section headers (like "ไทม์ไลน์ของคุณ").

### Semantic Presets
| Preset | Style | Color | Notes |
| :--- | :--- | :--- | :--- |
| **Section Header** | Serif, Large (e.g., 24-28pt) | `Text.primary` | E.g., "ไทม์ไลน์ของคุณ". Adds a premium, editorial feel. |
| **Card Title** | Sans, Bold, ~18-20pt | `Text.primary` | Main entity names (e.g., "Product Manager", Job Titles). |
| **Card Subtitle** | Sans, Regular, ~14-16pt | `Text.secondary` | Company names, locations. |
| **Tag/Badge** | Sans, Bold, ~10-12pt | Variable | Uppercase, heavy tracking. Used in tags like `EDUCATION`. |
| **Button Text** | Sans, Bold, ~16-18pt | Black/White | Centered, highly readable for CTAs. |

## 3. Cards & Containers

The UI relies heavily on clean, distinct cards rather than heavy glassmorphism.

### Card Styling
- **Background**: Solid `#FFFFFF`.
- **Border**: Very subtle or non-existent.
- **Corner Radius**:
  - Main Layout Cards: `24px` to `32px` (Large rounded corners).
  - Inner Elements / Badges: Fully rounded (pill shape) or `8px` to `12px`.
- **Shadow Systems**:
  - Cards use a very soft, diffused drop shadow to separate from the light grey background (e.g., `shadowOpacity: 0.05`, `shadowRadius: 10`, `elevation: 2`).

### Timelines
- Vertical connecting lines are thin (1-2px) and use a light grey or the color of the active node.
- Timeline nodes are circular. Active nodes are filled with a semantic color (e.g., Blue for Experience/Days, Purple for Education) and an icon. Inactive/future nodes are outlined or light grey.

## 4. Interactive Components

### Buttons
- **Primary Bottom CTA**: Large, full-width with heavy padding. Color: Lime (`#BFFF00`). Text: Black. High visibility.
- **Action Pills**: Small, fully rounded (`borderRadius: 999px`). Color: Black. Text: White. Used in headers (e.g., Save).
- **Ghost/Icon Actions**: Arrow icons for reordering, red trash icons for deletion. Minimal hit areas with no background.

### Tags / Badges
- Used inside cards (e.g., "PLAN B", "EDUCATION", "EXPERIENCE").
- Styling: Soft tinted background of the semantic color (e.g., 10-15% opacity Purple) with fully saturated text of the same hue. Fully rounded corners (pill shape).

## 5. Layout & Spacing

Adheres to a spacious layout system to ensure touch targets are large and content is readable.

- **Screen Edges**: Generous horizontal padding, usually `20px` to `24px`.
- **Card Padding**: Inner padding of cards is typically `16px` to `24px`.
- **Inter-card Gap**: Space between separate cards/sections is around `24px`.
- **Component Gap**: Space between elements within a card (e.g., Title and Subtitle) is tight, around `4px` to `8px`.

---

*Use these guidelines as a blueprint for all new features. When in doubt, refer to [lib/theme.ts](file:///Users/bunyasit/dev/ps_app/lib/theme.ts) for the exact code implementation of these tokens.*
