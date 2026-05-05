// types/jobs.ts
// Shared JobRow type — used by career-builder, plans hub, and jobs directory

export type JobRow = {
  id: string;
  rank: number | null;
  title: string;
  category: string | null;
  demand_trend: string | null;
  automation_risk: number | null;
  growth_rate: string | null;
  viability_score: number | null;
  salary_range_thb: any | null;
};
