/**
 * Passion Seed design tokens (v4.1 "Depth", keys 2026-10-15; v4 2026-10-14; v3 2026-10-12).
 * Layered lavender canvas with soft orbs, glass cards, one raised hero card per screen,
 * glowing progress, and keycaps for every action (one violet Shift key per screen). One violet
 * accent. See docs/DESIGN.md.
 * Contrast is WCAG-measured: body >= 7:1, secondary >= 4.5:1, controls >= 3:1, and it holds on
 * every canvas layer (wash and orbs included); text on glass measures as on white.
 * Legacy names (Accent.yellow, StepThemes, Gradient) are kept as aliases so
 * existing screens keep compiling; new code should use Violet / Ink / Surface and the
 * v4 tokens at the end of this file (Canvas, Wash, Orb, Glass, Hero, Gem, Glow, Keycap, Depth).
 */
import { Platform } from "react-native";

// Core palette
export const Violet = {
  50: "#F1ECFF", // tag + selected backgrounds
  100: "#E4DEF7", // progress tracks, quiet fills
  200: "#D9CCFF", // legacy CTA fill (dark text 12.3:1)
  300: "#C4B3FF", // pressed fill (dark text 9.8:1)
  400: "#8B6BFF", // gem gradient top
  600: "#6D3FF0", // accent: progress, selected, white text 5.8:1
  700: "#5B2FD6", // accent text, links, tags (7.4:1 on white)
};

export const Ink = {
  primary: "#14112A", // 16.6:1 on canvas
  secondary: "#45405E", // 9.8:1 on white
  // v4: #625C7D -> #5B5576 so metadata stays >= 4.5:1 on the top-right wash (was 4.46:1 there).
  tertiary: "#5B5576", // 7.0:1 on white, 6.3:1 on canvas, 5.0:1 on the wash
};

export const Surface = {
  canvas: "#F4F2FB",
  wash: "#ECE6FF", // top-right radial wash on canvas
  card: "#FFFFFF",
  line: "#E7E2F4", // dividers only, never card borders
  control: "#8E86AE", // input/control borders, 3.4:1
};

export const Status = {
  success: "#0F7A4D",
  successBg: "#E8F6EF",
  warning: "#8A4B00",
  warningBg: "#FFF3E0",
  error: "#B91C1C",
  errorBg: "#FDECEC",
};

// Page Backgrounds
export const PageBg = {
  default: Surface.canvas,
  offWhite: "#EEEAF8",
};

// Text Colors
export const Text = {
  primary: Ink.primary,
  secondary: Ink.secondary,
  tertiary: Ink.tertiary, // was #9CA3AF (2.5:1), now 7.0:1
  muted: Surface.control, // disabled/hints only, never body copy
};

// Accent Colors. Violet is the only brand accent; blue/green/orange are semantic
// legacy colors for career screens, darkened to pass text contrast.
export const Accent = {
  purple: Violet[600],
  blue: "#2563EB", // experience/internship (5.2:1)
  green: Status.success, // destination/job, success
  yellow: Violet[200], // LEGACY name: primary CTA fill, was #BFFF00
  yellowDark: Violet[300], // LEGACY name: CTA pressed
  yellowLight: "rgba(109, 63, 240, 0.12)", // LEGACY name: tint for switches/backgrounds
  orange: "#C2410C", // passion metric (5.2:1)
  red: "#DC2626",
  errorStrong: Status.error,
  amber: "#B45309", // warning/in-progress (4.8:1)
  black: Ink.primary, // action pills
};

// Gradients: subtle, never loud. Surfaces fade white -> faint lavender.
export const Gradient = {
  canvas: [Surface.wash, Surface.canvas] as const,
  masterCard: ["#FFFFFF", "#FFFFFF", "#FAF8FF"] as const,
  education: ["#FFFFFF", "#FAF8FF"] as const,
  experience: ["#FFFFFF", "#F7F9FF"] as const,
  destination: ["#FFFFFF", "#F6FBF8"] as const,
  // Legacy CTA fill (PathLab screens); SHIFT screens use Keycap.
  primaryCta: ["#FFFFFF", Violet[50]] as const,
  gem: [Violet[400], Violet[600]] as const,
};

// Semantic step themes (used by PathStepCard)
export const StepThemes = {
  university: {
    bgStart: "#FFFFFF",
    bgEnd: "#FAF8FF",
    border: "transparent",
    accent: Violet[600],
    accentLight: Violet[50],
    shadow: "transparent",
  },
  internship: {
    bgStart: "#FFFFFF",
    bgEnd: "#F7F9FF",
    border: "transparent",
    accent: "#2563EB",
    accentLight: "rgba(37, 99, 235, 0.10)",
    shadow: "transparent",
  },
  job: {
    bgStart: "#FFFFFF",
    bgEnd: "#F6FBF8",
    border: "transparent",
    accent: Status.success,
    accentLight: Status.successBg,
    shadow: "transparent",
  },
} as const;

// Border Colors. Cards use tone + shadow, not borders.
export const Border = {
  default: "transparent",
  light: "transparent",
  subtle: "transparent",
  line: Surface.line,
  control: Surface.control,
};

// Border Radius
export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  full: 999,
};

// Legacy shadows (PathLab screens): one soft level for surfaces, a violet-tinted CTA glow.
const softShadow = {
  shadowColor: Ink.primary,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 24,
  elevation: 2,
};
export const Shadow = {
  neutral: softShadow,
  card: softShadow,
  floating: {
    shadowColor: Ink.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: (_color: string) => softShadow,
  ctaGlow: {
    shadowColor: Violet[600],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
};

// Spacing
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
};

// Typography presets (font sizes + weights)
export const Type = {
  header: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Text.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Text.primary,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Text.primary,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    color: Text.secondary,
  },
  label: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Text.tertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  caption: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Text.tertiary,
  },
  small: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Text.tertiary, // muted fails text contrast
  },
};

// Helper to create glass card style (renamed conceptually but kept for compatibility)
export const glassCard = ({
  radius = Radius.xl,
  padding = Space.xl,
}: { radius?: number; padding?: number } = {}) => ({
  backgroundColor: "#fff",
  borderRadius: radius,
  padding,
  borderWidth: 0,
  ...Shadow.card,
});

// Helper to create master card wrapper style
export const masterCard = ({
  radius = Radius["2xl"],
  padding = Space["2xl"],
}: { radius?: number; padding?: number } = {}) => ({
  backgroundColor: "#fff",
  borderRadius: radius,
  padding,
  borderWidth: 0,
  marginRight: Space.sm,
  ...Shadow.neutral,
});

// Section label style (uppercase, muted, tracking)
export const sectionLabel = {
  fontSize: Type.label.fontSize,
  fontWeight: Type.label.fontWeight,
  color: Type.label.color,
  textTransform: Type.label.textTransform,
  letterSpacing: Type.label.letterSpacing,
  marginBottom: Space.md,
};

export const CompanionSurface = { field: Surface.card, line: Surface.line };

// ---------------------------------------------------------------------------------------------
// v4 "Depth" tokens (DESIGN.md v4.1). Glass is where you are; keys are what you do.
// ---------------------------------------------------------------------------------------------

/** Page canvas: vertical lavender gradient (top -> mid -> bottom). */
export const Canvas = {
  top: "#F1ECFF",
  mid: "#F4F2FB",
  bottom: "#F7F5FC",
  colors: ["#F1ECFF", "#F4F2FB", "#F7F5FC"] as const,
  locations: [0, 0.42, 1] as const,
};

/** Soft radial washes laid over the canvas (top-right violet, left pink-lilac). */
export const Wash = {
  topRight: "#E0D3FF", // ellipse 120% x 55% at the top-right corner, fades out at 62%
  left: "#F7EAFF", // ellipse 70% x 40% at the left edge, 34% down, fades out at 72%
};

/** Orbs: blurred circles behind content (drawn as radial-gradient discs, never a blur filter). */
export const Orb = {
  violet: "#DCCBFF",
  pink: "#FBE3FF",
  lilac: "#E6DAFF",
  opacity: 0.75,
};

/** Glass: translucent white surfaces with a bright rim. Text on glass measures as on white. */
export const Glass = {
  fill: "rgba(255,255,255,0.66)",
  /** Rows, chips and the tab bar sit a little more opaque. */
  fillStrong: "rgba(255,255,255,0.8)",
  /** Android has no backdrop blur and draws elevation under translucent fills; go more opaque. */
  fillAndroid: "rgba(255,255,255,0.88)",
  border: "rgba(255,255,255,0.95)",
  radius: 22,
};

/** Hero card: the one raised surface per screen. */
export const Hero = {
  colors: ["#FFFFFF", "#FBF9FF", "#F1EBFF"] as const,
  locations: [0, 0.55, 1] as const,
  /** 160deg in CSS: from top-left-ish to bottom-right-ish. */
  start: { x: 0.33, y: 0 },
  end: { x: 0.67, y: 1 },
  radius: 26,
  numeral: ["rgba(139,107,255,0.18)", "rgba(139,107,255,0)"] as const,
};

/**
 * Gems: glossy violet. `face` carries white text (>= 5:1 where text sits), `tile` holds icons
 * only, `orb` is the radial gem behind GemIcon icons (centre 35% / 30%).
 */
export const Gem = {
  face: ["#7E5CFA", "#5F31E3"] as const,
  tile: ["#8B6BFF", "#5B2FD6"] as const,
  orb: ["#C9B8FF", "#8B6BFF", "#5B2FD6"] as const,
  orbLocations: [0, 0.4, 1] as const,
  highlight: "rgba(255,255,255,0.35)",
  ring: "rgba(139,107,255,0.16)",
  /** Avatar gems; white initials stay >= 4.9:1 at the middle of each gradient. */
  avatars: [
    ["#8A6AFF", "#5B2FD6"],
    ["#7E5CFA", "#5F31E3"],
    ["#9478FF", "#5B2FD6"],
  ] as const,
  ink: ["#3A3357", "#14112A"] as const,
};

/** Glowing progress: violet gradient fill with a soft glow on a recessed track. */
export const Glow = {
  fill: ["#A48BFF", "#6D3FF0"] as const,
  track: "rgba(109,63,240,0.12)",
  color: "rgba(109,63,240,0.55)",
};

/**
 * Keys (DESIGN.md section 6): every action you commit is a keycap. Glass is where you are; keys
 * are what you do. A key is a dished face (bright top bevel, a shaded band under it, lighter
 * toward a bright front lip), a front wall whose height is the travel, a 1pt contact shadow and
 * a tight ambient pool under it, never a halo. Text contrast is measured where the label sits
 * (between the 34% and 70% dish stops).
 */
export type KeyTone = "shift" | "porcelain" | "ink" | "danger";

export type KeyPalette = {
  /** Face, top to bottom at `KeyDish` stops. */
  dish: readonly [string, string, string, string];
  /** Face edges: lit top, shaded sides, the front lip catching light. */
  bevel: { top: string; side: string; lip: string };
  /** Front wall, top to bottom (darkens near the surface). */
  wall: readonly [string, string];
  label: string;
  icon: string;
  /** 1pt legend shadow on coloured faces. */
  legendShadow?: string;
  /** Contact shadow right under the wall. */
  contact: string;
  /** Ambient pool (CSS box-shadow, iOS and web); fades out while pressed. Empty = none. */
  ambient: string;
  /** Pressed-face overlay. */
  shade: string;
  /** Unlit radio LED ring. */
  ledOff: string;
};

export const Keycap: Record<KeyTone | "off", KeyPalette> = {
  /** The Shift key: violet, white legend 6.3:1 where it sits. One per screen. */
  shift: {
    dish: ["#7B55FA", "#6338EC", "#6A41F0", "#7550F6"],
    bevel: { top: "rgba(255,255,255,0.55)", side: "rgba(42,14,140,0.28)", lip: "rgba(205,190,255,0.55)" },
    wall: ["#4626BE", "#2E1484"],
    label: "#FFFFFF",
    icon: "#FFFFFF",
    legendShadow: "rgba(36,10,120,0.4)",
    contact: "rgba(26,8,84,0.4)",
    ambient: "0px 12px 16px -10px rgba(52,22,160,0.6)",
    shade: "rgba(20,6,80,0.10)",
    ledOff: "rgba(255,255,255,0.55)",
  },
  /** Secondary: white keycap, ink legend (16:1), violet icon. */
  porcelain: {
    dish: ["#FFFFFF", "#F2EEFD", "#F7F5FE", "#FFFFFF"],
    bevel: { top: "#FFFFFF", side: "#DCD4F3", lip: "#FFFFFF" },
    wall: ["#D9D0F4", "#BFB2E6"],
    label: Ink.primary,
    icon: Violet[700],
    contact: "rgba(40,20,120,0.18)",
    ambient: "0px 10px 14px -10px rgba(76,40,200,0.42)",
    shade: "rgba(76,40,200,0.05)",
    ledOff: "#B9B0D9",
  },
  /** Dark keycap (Apple fallback). */
  ink: {
    dish: ["#3A3358", "#221D38", "#272140", "#302A4C"],
    bevel: { top: "rgba(255,255,255,0.28)", side: "rgba(0,0,0,0.3)", lip: "rgba(255,255,255,0.14)" },
    wall: ["#13101F", "#05040C"],
    label: "#F1ECFF",
    icon: "#F1ECFF",
    contact: "rgba(0,0,0,0.45)",
    ambient: "0px 12px 16px -10px rgba(20,17,42,0.6)",
    shade: "rgba(0,0,0,0.12)",
    ledOff: "rgba(241,236,255,0.5)",
  },
  /** Destructive commits: ruby keycap, white legend 5.1:1 where it sits. */
  danger: {
    dish: ["#E8494F", "#CB2F35", "#D0353B", "#DA4046"],
    bevel: { top: "rgba(255,255,255,0.5)", side: "rgba(110,10,16,0.3)", lip: "rgba(255,200,202,0.55)" },
    wall: ["#9A1B21", "#6E1015"],
    label: "#FFFFFF",
    icon: "#FFFFFF",
    legendShadow: "rgba(100,10,14,0.4)",
    contact: "rgba(80,8,12,0.4)",
    ambient: "0px 12px 16px -10px rgba(140,20,26,0.5)",
    shade: "rgba(60,0,0,0.10)",
    ledOff: "rgba(255,255,255,0.55)",
  },
  /** Disabled: an unlit key (wall kept, no ambient), ink-3 legend 5.6:1. */
  off: {
    dish: ["#EEEBF7", "#E8E4F4", "#E8E4F4", "#E6E2F3"],
    bevel: { top: "rgba(255,255,255,0.7)", side: "rgba(255,255,255,0)", lip: "rgba(255,255,255,0.5)" },
    wall: ["#D6D0E8", "#CCC5E0"],
    label: Ink.tertiary,
    icon: Ink.tertiary,
    contact: "rgba(40,20,120,0.08)",
    ambient: "",
    shade: "rgba(0,0,0,0)",
    ledOff: "#B9B0D9",
  },
};

/** Dish stops for `KeyPalette.dish`. */
export const KeyDish = [0, 0.34, 0.7, 1] as const;

/**
 * Key sizes. `travel` is the wall height and how far the face moves (it stops 1pt short so the
 * edge stays crisp). Radii stay key-like (about a quarter of the face), not pills.
 */
export const KeySize = {
  lg: { face: 53, travel: 5, radius: 14, font: 17, icon: 19, pad: 18, gap: 10, round: 66, roundIcon: 28 },
  md: { face: 44, travel: 4, radius: 13, font: 16, icon: 18, pad: 16, gap: 8, round: 44, roundIcon: 20 },
  sm: { face: 36, travel: 3, radius: 11, font: 14, icon: 15, pad: 13, gap: 7, round: 38, roundIcon: 17 },
} as const;

export type KeySizeName = keyof typeof KeySize;

/** Dark surfaces (Apple button, DM card): ink gradient with a soft top highlight. */
export const Dark = {
  colors: ["#2A2540", "#14112A"] as const,
  text: "#F1ECFF", // 12.6:1 on #2A2540
};

type DepthStyle = { boxShadow: string } | { elevation: number; shadowColor: string };

/**
 * Platform shadow: CSS box-shadow on iOS and web (exact mockup values, negative spread, never
 * drawn under translucent glass), plain `elevation` on Android (cheap; colour-tinted on API 28+).
 */
export function depth(css: string, elevation: number, androidColor: string = Violet[600]): DepthStyle {
  return Platform.OS === "android" ? { elevation, shadowColor: androidColor } : { boxShadow: css };
}

export const Depth = {
  /** Glass cards. */
  glass: depth("0px 10px 26px -14px rgba(109,63,240,0.35)", 3),
  /** Glass list rows (steps, feed, evidence). */
  row: depth("0px 6px 16px -12px rgba(109,63,240,0.45)", 2),
  /** Raised row (current step) and pressed hero. */
  raised: depth("0px 12px 26px -12px rgba(109,63,240,0.55)", 6),
  /** Hero card. */
  hero: depth("0px 18px 40px -12px rgba(109,63,240,0.28), 0px 2px 6px rgba(20,17,42,0.05)", 8),
  /** Round gem icons. */
  gem: depth("0px 3px 8px rgba(91,47,214,0.5)", 4, Violet[700]),
  /** Square gem tiles (session, calendar). */
  tile: depth("0px 8px 16px -6px rgba(91,47,214,0.6)", 5, Violet[700]),
  /** Selected and done gem surfaces (today cell, selected chip, done slot). */
  glow: depth("0px 8px 18px -6px rgba(109,63,240,0.6)", 5),
  /** Progress ring halo. */
  ring: depth("0px 6px 14px -6px rgba(109,63,240,0.6)", 4),
  /** Glass pills (tags). */
  pill: depth("0px 2px 8px rgba(109,63,240,0.10)", 1),
  /** Floating glass chips (sign-in orb). */
  float: depth("0px 10px 24px -10px rgba(109,63,240,0.45)", 4),
  /** Small glossy controls (icon buttons, pill actions). */
  control: depth("0px 4px 10px rgba(109,63,240,0.2)", 3),
  /** Glass navigation buttons (back, close): a contact line plus a tight pool, no halo. */
  nav: depth("0px 1px 2px rgba(20,17,42,0.08), 0px 6px 14px -8px rgba(76,40,200,0.4)", 2),
  /** Avatar gems. */
  avatar: depth("0px 3px 8px rgba(20,17,42,0.15)", 2, Ink.primary),
  /** Floating tab bar. */
  tab: depth("0px 10px 30px -10px rgba(20,17,42,0.25)", 10, Ink.primary),
  /** Dark buttons and the DM card. */
  dark: depth("0px 8px 18px -8px rgba(20,17,42,0.6)", 6, Ink.primary),
  /** The big SHIFT orb. */
  orb: depth("0px 30px 60px -20px rgba(109,63,240,0.6)", 12),
  /** Focus ring for inputs (outline glow, no offset). */
  focus: depth("0px 0px 0px 4px rgba(139,107,255,0.18)", 0),
};
