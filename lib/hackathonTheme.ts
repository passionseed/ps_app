/** Shared hackathon design tokens — see docs/hackathon-design-system.md */

export const HACK_COLORS = {
  bgDeep: "#03050a",
  bgCard: "#0d1219",
  bgElevated: "#1a2530",
  cyan: "#91C4E3",
  blue: "#65ABFC",
  purpleLight: "#A594BA",
  purpleMuted: "#9D81AC",
  borderLight: "#7aa4c4",
  borderMuted: "#5a7a94",
  white: "#FFFFFF",
  amber: "#F59E0B",
} as const;

export const HACK_ALPHA = {
  cyanBorder: "rgba(145,196,227,0.15)",
  cyanBorderStrong: "rgba(145,196,227,0.3)",
  cyanFill: "rgba(145,196,227,0.05)",
  glassBorder: "rgba(255,255,255,0.06)",
  divider: "rgba(255,255,255,0.05)",
  white75: "rgba(255,255,255,0.75)",
  white55: "rgba(255,255,255,0.55)",
  white35: "rgba(255,255,255,0.35)",
  white12: "rgba(255,255,255,0.12)",
  white04: "rgba(255,255,255,0.04)",
  amberBorder: "rgba(245, 158, 11, 0.3)",
  amberFill: "rgba(245, 158, 11, 0.08)",
  blueBorder: "rgba(101,171,252,0.28)",
  blueFill: "rgba(101,171,252,0.14)",
} as const;

export const HACK_GLASS_GRADIENT = {
  default: ["rgba(20, 28, 41, 0.9)", "rgba(8, 14, 22, 0.95)"] as const,
  subtle: ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"] as const,
  admin: ["rgba(101, 171, 252, 0.14)", "rgba(145, 196, 227, 0.04)"] as const,
};

export const HACK_SHADOW = {
  purpleCta: {
    shadowColor: HACK_COLORS.purpleMuted,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
};
