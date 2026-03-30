/**
 * Shared design tokens for the "Career Simulator" design system.
 * Source of truth extracted from docs/design_guidelines.md
 */

// Page Backgrounds
export const PageBg = {
  default: "#F8F9FA", // Clean off-white/light grey
  offWhite: "#F3F4F6", // Slightly cooler alternative
};

// Text Colors
export const Text = {
  primary: "#111827", // Deep Obsidian Slate - headers/titles
  secondary: "#4B5563", // Cool Mid-Grey - subtitles
  tertiary: "#9CA3AF", // Details/tertiary, icons
  muted: "#D1D5DB", // Disabled/hints
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
  black: "#111827", // Action Pills
};

// Gradients (Deprecated - keeping flat for cleaner look, but leaving constants to not break builds)
export const Gradient = {
  // Master card gradient
  masterCard: ["#FFFFFF", "#FFFFFF", "#FFFFFF"] as const,
  // Semantic step gradients
  education: ["#FFFFFF", "#FFFFFF"] as const,
  experience: ["#FFFFFF", "#FFFFFF"] as const,
  destination: ["#FFFFFF", "#FFFFFF"] as const,
  // CTA gradient
  primaryCta: ["#BFFF00", "#BFFF00"] as const,
};

// Semantic step themes (used by PathStepCard)
export const StepThemes = {
  university: {
    bgStart: "#FFFFFF",
    bgEnd: "#FFFFFF",
    border: "transparent",
    accent: "#8B5CF6",
    accentLight: "rgba(139, 92, 246, 0.1)",
    shadow: "transparent",
  },
  internship: {
    bgStart: "#FFFFFF",
    bgEnd: "#FFFFFF",
    border: "transparent",
    accent: "#3B82F6",
    accentLight: "rgba(59, 130, 246, 0.1)",
    shadow: "transparent",
  },
  job: {
    bgStart: "#FFFFFF",
    bgEnd: "#FFFFFF",
    border: "transparent",
    accent: "#10B981",
    accentLight: "rgba(16, 185, 129, 0.1)",
    shadow: "transparent",
  },
} as const;

// Border Colors
export const Border = {
  default: "transparent",
  light: "transparent",
  subtle: "transparent",
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
  // Neutral card shadow (soft)
  neutral: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  // Card with depth
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  // Floating element (tab bar, modals)
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  // Accent glow shadows (semantic) - removed colored glows for flatter design
  glow: (color: string) => ({
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  }),
  // CTA glow - removed for flatter design
  ctaGlow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
