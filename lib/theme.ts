/**
 * Passion Seed design tokens (v3, 2026-10-12).
 * Lavender canvas, white surfaces, one violet accent. See docs/DESIGN.md.
 * Contrast is WCAG-measured: body >= 7:1, secondary >= 4.5:1, controls >= 3:1.
 * Legacy names (Accent.yellow, StepThemes, Gradient) are kept as aliases so
 * existing screens keep compiling; new code should use Violet / Ink / Surface.
 */

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
  tertiary: "#625C7D", // 6.3:1 on white, 5.7:1 on canvas
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
  tertiary: Ink.tertiary, // was #9CA3AF (2.5:1), now 6.3:1
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
  // Pillow button: white -> violet-50, violet text, gem icon
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
  pillow: "#D9CFFF",
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

// Shadows: one soft level for surfaces, a violet-tinted one for the Pillow button.
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
