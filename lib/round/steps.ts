/**
 * "9 ขั้นของ SHIFT" (scale spec D3, 4.1): the round's missions in config order (steps 1..n),
 * then the two computed habits, daily progress (n+1) and mentor sessions (n+2). Pure: the steps
 * screen, the Home ring card and the day chips all render what this returns.
 * Titles are the shared vocabulary (app, admin, certificates) and carry no counts; the trailing
 * counter shows progress, so a round that changes requirements keeps true titles.
 */
import { t } from "./copy";
import { missionProgress, missionTitle, orderedMissions } from "./missions";
import type { EvidenceType, Lang, Mission, MissionCounts, PlanDay } from "./types";

export type StepState = "done" | "current" | "todo";
export type StepKind = "mission" | "daily" | "sessions";

export type Step = {
  /** 1-based step number. */
  n: number;
  kind: StepKind;
  /** Mission key for mission steps. */
  missionKey: string | null;
  /** Evidence type to log for this step (first incomplete part for missions, `daily` for step n+1). */
  type: EvidenceType | null;
  /** Shared title (also the chip label). */
  title: string;
  state: StepState;
  trailing: string;
  have: number;
  need: number;
};

export type StepsContext = {
  lang: Lang;
  /** Current round day (null or < 1 before the round starts). */
  day: number | null;
};

function missionStep(lang: Lang, mission: Mission, n: number, current: boolean): Step {
  const { have, need } = missionProgress(mission);
  const part = mission.parts.find((p) => p.have < p.need) ?? mission.parts[0];
  const state: StepState = mission.complete ? "done" : current ? "current" : "todo";
  const trailing = mission.complete
    ? t(lang, "mission.done")
    : current || need > 1
      ? `${have}/${need}`
      : t(lang, "mission.not_yet");
  return {
    n,
    kind: "mission",
    missionKey: mission.key,
    type: part?.type ?? null,
    title: missionTitle(lang, mission),
    state,
    trailing,
    have,
    need,
  };
}

/**
 * Days that should have a log by now: every finished round day, plus today once it is logged.
 * Today never counts against the student before it ends.
 */
export function dailyDue(counts: Pick<MissionCounts, "daily">, day: number | null): number {
  const daily = counts.daily;
  if (!daily || day === null || day < 1) return 0;
  if (day > daily.need) return daily.need;
  return Math.max(1, Math.min(daily.need, day - 1 + (daily.today_logged ? 1 : 0)));
}

function dailyStep(lang: Lang, counts: MissionCounts | null | undefined, n: number, day: number | null): Step {
  const daily = counts?.daily ?? null;
  const base = {
    n,
    kind: "daily" as const,
    missionKey: null,
    type: "daily" as const,
    title: t(lang, "step.daily"),
  };
  if (!daily || day === null || day < 1) {
    return { ...base, state: "todo", trailing: t(lang, "mission.not_yet"), have: daily?.days ?? 0, need: daily?.need ?? 0 };
  }
  const due = dailyDue({ daily }, day);
  const have = Math.min(daily.days, daily.need);
  return { ...base, state: have >= due ? "done" : "todo", trailing: t(lang, "steps.days", { have, need: due }), have, need: due };
}

function sessionsStep(lang: Lang, counts: MissionCounts | null | undefined, n: number): Step {
  const s = counts?.sessions ?? null;
  const base = {
    n,
    kind: "sessions" as const,
    missionKey: null,
    type: null,
    title: t(lang, "step.sessions"),
  };
  if (!s || s.held < 1) {
    return { ...base, state: "todo", trailing: t(lang, "mission.not_yet"), have: s?.attended ?? 0, need: s?.held ?? 0 };
  }
  const have = Math.min(s.attended, s.held);
  return { ...base, state: have >= s.held ? "done" : "todo", trailing: t(lang, "steps.times", { have, need: s.held }), have, need: s.held };
}

/** All steps: missions 1..n (n = config length), then daily, then sessions. */
export function steps(counts: MissionCounts | null | undefined, ctx: StepsContext): Step[] {
  const missions = orderedMissions(counts);
  const currentKey = missions.find((m) => !m.complete)?.key ?? null;
  const out = missions.map((m, i) => missionStep(ctx.lang, m, i + 1, m.key === currentKey));
  out.push(dailyStep(ctx.lang, counts, missions.length + 1, ctx.day));
  out.push(sessionsStep(ctx.lang, counts, missions.length + 2));
  return out;
}

export function stepsDone(list: Step[]): number {
  return list.filter((s) => s.state === "done").length;
}

/** The current step (first incomplete mission), or null when every mission is complete. */
export function currentStep(list: Step[]): Step | null {
  return list.find((s) => s.state === "current") ?? null;
}

export type ChipState = "done" | "progress" | "todo";
export type DayChip = { n: number; label: string; state: ChipState };

/**
 * Step chips for a plan day (`plan.days[d].steps`, 1-based step numbers) mapped onto the steps
 * model. Unknown step numbers are skipped. `missionsOnly` keeps the habit steps out (Home hero).
 */
export function dayChips(day: Pick<PlanDay, "steps"> | null | undefined, list: Step[], opts: { missionsOnly?: boolean } = {}): DayChip[] {
  if (!day) return [];
  const chips: DayChip[] = [];
  const seen = new Set<number>();
  for (const n of day.steps) {
    const step = list.find((s) => s.n === n);
    if (!step || seen.has(n)) continue;
    if (opts.missionsOnly && step.kind !== "mission") continue;
    seen.add(n);
    const state: ChipState =
      step.state === "done" ? "done" : step.kind === "mission" && (step.have > 0 || step.state === "current") ? "progress" : "todo";
    const showCount = step.kind === "mission" && step.state !== "done" && step.need > 1;
    chips.push({ n, label: showCount ? `${step.title} ${step.have}/${step.need}` : step.title, state });
  }
  return chips;
}
