// lib/jobUtils.ts
// Shared helpers for rendering job market data

export function aiRiskColor(risk: number | null): string {
  if (risk == null) return "#9CA3AF";
  if (risk <= 0.25) return "#10B981";
  if (risk <= 0.45) return "#F59E0B";
  if (risk <= 0.65) return "#F97316";
  return "#EF4444";
}

export function trendIcon(trend: string | null): string {
  if (trend === "growing") return "▲";
  if (trend === "declining") return "▼";
  return "─";
}

export function trendColor(trend: string | null): string {
  if (trend === "growing") return "#10B981";
  if (trend === "declining") return "#EF4444";
  return "#9CA3AF";
}
