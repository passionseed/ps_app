/**
 * Shared design tokens for the "Career Simulator" glass & glow system.
 * Source of truth extracted from my-paths.tsx, CareerPathCard, PathStepCard,
 * and docs/design_guidelines.md
 */

// Page Backgrounds
export const PageBg = {
  default: "#F3F4F6", // cool grey used by my-paths
  offWhite: "#FDFFF5", // legacy, prefer default
};

// Text Colors
export const Text = {
  primary: "#111827", // Deep Obsidian Slate - headers/titles
  secondary: "#4B5563", // Cool Mid-Grey - subtitles
  tertiary: "#6B7280", // Details/tertiary
  muted: "#9CA3AF", // Disabled/hints
};

// Semantic Accent Colors
export const Accent = {
  purple: "#8B5CF6", // Education/university
  blue: "#3B82F6", // Experience/internship
  green: "#10B981", // Destination/job, success
  yellow: "#BFFF00", // Primary CTA, brand
  yellowDark: "#9FE800", // CTA pressed
  yellowLight: "rgba(191, 255, 0, 0.2)", // Yellow tint for switches/backgrounds
  orange: "#F97316", // Passion metric
  red: "#EF4444", // Error/low confidence
  amber: "#F59E0B", // Warning/in-progress
};

// Gradients
export const Gradient = {
  // Master card gradient (white -> purple tint -> blue tint)
  masterCard: ["#FFFFFF", "#F9F5FF", "#EEF2FF"] as const,
  // Semantic step gradients
  education: ["#FFFFFF", "#FDFCFF"] as const, // ultra light purple
  experience: ["#FFFFFF", "#FCFDFF"] as const, // ultra light blue
  destination: ["#FFFFFF", "#FCFEFD"] as const, // ultra light green
  // CTA gradient
  primaryCta: ["#BFFF00", "#A3E600"] as const,
};

// Semantic step themes (used by PathStepCard)
export const StepThemes = {
  university: {
    bgStart: "#FFFFFF",
    bgEnd: "#FDFCFF",
    border: "rgba(139, 92, 246, 0.15)",
    accent: "#8B5CF6",
    accentLight: "rgba(139, 92, 246, 0.08)",
    shadow: "rgba(139, 92, 246, 0.25)",
  },
  internship: {
    bgStart: "#FFFFFF",
    bgEnd: "#FCFDFF",
    border: "rgba(59, 130, 246, 0.15)",
    accent: "#3B82F6",
    accentLight: "rgba(59, 130, 246, 0.08)",
    shadow: "rgba(59, 130, 246, 0.25)",
  },
  job: {
    bgStart: "#FFFFFF",
    bgEnd: "#FCFEFD",
    border: "rgba(16, 185, 129, 0.15)",
    accent: "#10B981",
    accentLight: "rgba(16, 185, 129, 0.08)",
    shadow: "rgba(16, 185, 129, 0.25)",
  },
} as const;

// Border Colors
export const Border = {
  default: "rgb(206, 206, 206)",
  light: "rgba(0,0,0,0.06)",
  subtle: "rgba(0,0,0,0.05)",
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

// Shadows
export const Shadow = {
  // Neutral card shadow (subtle)
  neutral: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // Card with depth
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // Floating element (tab bar, modals)
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  // Accent glow shadows (semantic)
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  }),
  // CTA glow
  ctaGlow: {
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
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
    color: Text.muted,
  },
};

// Helper to create glass card style
export const glassCard = ({
  radius = Radius.xl,
  padding = Space.xl,
}: { radius?: number; padding?: number } = {}) => ({
  backgroundColor: "#fff",
  borderRadius: radius,
  padding,
  borderWidth: 1,
  borderColor: Border.default,
  ...Shadow.card,
});

// Helper to create master card gradient wrapper style
export const masterCard = ({
  radius = Radius["2xl"],
  padding = Space["2xl"],
}: { radius?: number; padding?: number } = {}) => ({
  borderRadius: radius,
  padding,
  borderWidth: 1,
  borderColor: Border.default,
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
