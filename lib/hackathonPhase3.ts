import { supabase } from "./supabase";
import type {
  HackathonPhase3Cycle,
  HackathonPhase3CycleStep,
  HackathonPhase3StepType,
  HackathonPhase3StepStatus,
  HackathonPhase3CycleStatus,
  HackathonPhase3TestSession,
  HackathonPhase3DailyCheckin,
  HackathonPhase3MidphaseSynthesis,
  HackathonPhase3RitualPost,
  HackathonPhase3ModuleProgress,
  HackathonPhase3VideoSubmission,
  Phase3Workspace,
  Phase3CycleTrackerEntry,
  Phase3WorkspaceStep,
  Phase3LeaderboardEntry,
  Phase3FunnelEntry,
  AICoachResponse,
} from "../types/hackathon-phase3";

function readStepText(
  data: Record<string, unknown> | null | undefined,
  snakeKey: string,
  camelKey: string
): string | null {
  if (!data) return null;
  const value = data[snakeKey] ?? data[camelKey];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// ============================================================
// Workspace Fetch
// ============================================================

export async function getPhase3Workspace(
  teamId: string,
  programPhaseId: string
): Promise<Phase3Workspace | null> {
  // Fetch all cycles for this team + phase
  const { data: cycles, error: cyclesError } = await supabase
    .from("hackathon_phase3_cycles")
    .select("*")
    .eq("team_id", teamId)
    .eq("program_phase_id", programPhaseId)
    .neq("status", "abandoned")
    .order("cycle_number", { ascending: true });

  if (cyclesError) {
    console.error("getPhase3Workspace: cycles error", cyclesError);
    return null;
  }

  // Get current (latest) cycle
  const currentCycle = cycles && cycles.length > 0
    ? cycles[cycles.length - 1]
    : null;

  // Fetch all cycle steps for all cycles to use as fallback for hypothesis
  const cycleIds = (cycles ?? []).map((c) => c.id);
  let allSteps: Record<string, Record<string, unknown> | null> = {};
  if (cycleIds.length > 0) {
    const { data: stepsData } = await supabase
      .from("hackathon_phase3_cycle_steps")
      .select("cycle_id, step_type, submission_data")
      .in("cycle_id", cycleIds)
      .eq("step_type", "hypothesis");

    for (const s of stepsData ?? []) {
      allSteps[s.cycle_id] = s.submission_data as Record<string, unknown> | null;
    }
  }

  // Build tracker from all cycles (with step data fallback for hypothesis)
  const tracker: Phase3CycleTrackerEntry[] = (cycles ?? []).map((c) => {
    const stepData = allSteps[c.id];
    // Prefer step submission_data.full (authoritative) over cycle column (can be stale)
    const rawFull = (stepData?.full as string | null) ?? c.hypothesis_full ?? null;
    const isGarbage = (s: string) => /^[\s]*will[\s]+because[\s]+measured by[\s]*$/.test(s.trim());
    let hypothesis = rawFull && rawFull.trim().length > 20 && !isGarbage(rawFull) ? rawFull : null;
    if (!hypothesis) {
      const who = readStepText(stepData, "who", "who") ?? c.hypothesis_who ?? null;
      const willDo = readStepText(stepData, "will_do", "willDo") ?? c.hypothesis_will_do ?? null;
      const because = readStepText(stepData, "because", "because") ?? c.hypothesis_because ?? null;
      const measuredBy = readStepText(stepData, "measured_by", "measuredBy") ?? c.hypothesis_measured_by ?? null;
      if (who && willDo && because && measuredBy) {
        hypothesis = `${who} will ${willDo} because ${because} measured by ${measuredBy}`;
      }
    }
    return {
      cycleNumber: c.cycle_number,
      hypothesis,
      result: c.synthesis_result,
      variableChanged: c.variable_changed,
      score: c.ai_score ? (c.ai_score as any).total ?? null : null,
      status: c.status,
    };
  });

  let activeStep: Phase3WorkspaceStep[] = [];

  if (currentCycle) {
    const { data: steps } = await supabase
      .from("hackathon_phase3_cycle_steps")
      .select("*")
      .eq("cycle_id", currentCycle.id)
      .order("step_type");

    activeStep = (steps ?? []).map((s) => ({
      stepId: s.id,
      stepType: s.step_type as HackathonPhase3StepType,
      status: s.status as HackathonPhase3StepStatus,
      content: [],
      assessments: [],
      aiFeedback: s.ai_feedback as AICoachResponse | null,
      submissionData: s.submission_data as Record<string, unknown> | null,
    }));
  }

  const stepOrder: HackathonPhase3StepType[] = ['hypothesis', 'pretotype', 'test_session', 'synthesis'];
  let currentStep: HackathonPhase3StepType = stepOrder[0];
  let currentStepStatus: HackathonPhase3StepStatus = 'draft';
  
  if (activeStep.length > 0) {
    const incompleteStep = activeStep.find(s => s.status === 'draft');
    
    if (incompleteStep) {
      currentStep = incompleteStep.stepType;
      currentStepStatus = incompleteStep.status;
    } else {
      const lastStep = activeStep[activeStep.length - 1];
      currentStep = lastStep?.stepType ?? stepOrder[0];
      currentStepStatus = lastStep?.status ?? 'draft';
    }
  }

  return {
    teamId,
    currentCycle: currentCycle
      ? {
          cycleNumber: currentCycle.cycle_number,
          status: currentCycle.status as HackathonPhase3CycleStatus,
          activeStep: currentStep as HackathonPhase3StepType,
          stepStatus: currentStepStatus as HackathonPhase3StepStatus,
        }
      : null,
    tracker,
    steps: activeStep,
  };
}

export async function getCycleWorkspaceSteps(cycleId: string): Promise<Phase3WorkspaceStep[]> {
  const { data: steps } = await supabase
    .from("hackathon_phase3_cycle_steps")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("step_type");

  return (steps ?? []).map((s) => ({
    stepId: s.id,
    stepType: s.step_type as HackathonPhase3StepType,
    status: s.status as HackathonPhase3StepStatus,
    content: [],
    assessments: [],
    aiFeedback: s.ai_feedback as AICoachResponse | null,
    submissionData: s.submission_data as Record<string, unknown> | null,
  }));
}

// ============================================================
// Cycle Management
// ============================================================

export async function startPhase3Cycle(
  teamId: string,
  programPhaseId: string
): Promise<string | null> {
  try {
    // Get max cycle number across ALL cycles (including abandoned) to avoid unique constraint violations
    const { data: maxRow } = await supabase
      .from("hackathon_phase3_cycles")
      .select("cycle_number")
      .eq("team_id", teamId)
      .order("cycle_number", { ascending: false })
      .limit(1)
      .single();

    const nextCycle = (maxRow?.cycle_number ?? 0) + 1;

    const { data: inserted, error } = await supabase
      .from("hackathon_phase3_cycles")
      .insert({
        team_id: teamId,
        program_phase_id: programPhaseId,
        cycle_number: nextCycle,
        status: "planning",
      })
      .select("id")
      .single();

    if (error) {
      console.error("startPhase3Cycle insert error", error);
      return null;
    }

    return inserted?.id ?? null;
  } catch (e) {
    console.error("startPhase3Cycle error", e);
    return null;
  }
}

export async function getTeamCurrentCycle(teamId: string) {
  const { data, error } = await supabase.rpc("get_team_current_cycle", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("getTeamCurrentCycle error", error);
    return null;
  }

  return data as {
    cycle_number: number;
    status: string;
    step_type: string;
    step_status: string;
  }[] | null;
}

export async function getCycleById(cycleId: string): Promise<HackathonPhase3Cycle | null> {
  const { data, error } = await supabase
    .from("hackathon_phase3_cycles")
    .select("*")
    .eq("id", cycleId)
    .single();

  if (error || !data) return null;
  return data as HackathonPhase3Cycle;
}

export async function getTeamCycles(teamId: string): Promise<HackathonPhase3Cycle[]> {
  const { data, error } = await supabase
    .from("hackathon_phase3_cycles")
    .select("*")
    .eq("team_id", teamId)
    .neq("status", "abandoned")
    .order("cycle_number", { ascending: true });

  if (error) return [];
  return (data ?? []) as HackathonPhase3Cycle[];
}

// ============================================================
// Step Submission
// ============================================================

export async function submitCycleStep(
  cycleId: string,
  stepType: string,
  submissionData: Record<string, unknown>,
  status: string = "submitted"
): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_cycle_steps")
    .upsert(
      {
        cycle_id: cycleId,
        step_type: stepType,
        submission_data: submissionData,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      },
      { onConflict: "cycle_id,step_type" }
    );

  if (error) {
    console.error("submitCycleStep error", error);
    return false;
  }

  if (stepType === "hypothesis" && status === "submitted") {
    const who = submissionData.who as string;
    const willDo = submissionData.will_do as string;
    const because = submissionData.because as string;
    const measuredBy = submissionData.measured_by as string;
    if (!who || !willDo || !because || !measuredBy) {
      console.error("submitCycleStep: refusing to write empty hypothesis fields to cycle", submissionData);
      return true;
    }
    const { error: cycleError } = await supabase
      .from("hackathon_phase3_cycles")
      .update({
        hypothesis_who: who,
        hypothesis_will_do: willDo,
        hypothesis_because: because,
        hypothesis_measured_by: measuredBy,
      })
      .eq("id", cycleId);

    if (cycleError) {
      console.error("update cycle hypothesis error", cycleError);
    }
  }

  if (stepType === "pretotype" && status === "submitted") {
    const { error: cycleError } = await supabase
      .from("hackathon_phase3_cycles")
      .update({
        pretotype_method: submissionData.method as string,
        variable_changed: submissionData.variable_changed as string,
        pretotype_artifact_url: submissionData.artifact_url as string | null,
        pretotype_description: submissionData.description as string,
      })
      .eq("id", cycleId);

    if (cycleError) {
      console.error("update cycle pretotype error", cycleError);
    }
  }

  if (stepType === "synthesis" && status === "submitted") {
    const gateDecision = submissionData.gate_decision as string;
    // Map new gate values to legacy values for DB compatibility
    const dbGateDecision =
      gateDecision === "next_cycle"
        ? "refine"
        : gateDecision === "finish"
        ? "proceed"
        : gateDecision === "kill"
        ? "kill"
        : gateDecision;
    const { error: cycleError } = await supabase
      .from("hackathon_phase3_cycles")
      .update({
        gate_decision: dbGateDecision,
        synthesis_result:
          dbGateDecision === "proceed"
            ? "confirmed"
            : dbGateDecision === "kill"
            ? "killed"
            : dbGateDecision === "refine"
            ? "unclear"
            : null,
        synthesis_what_changed: submissionData.what_changed as string,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", cycleId);

    if (cycleError) {
      console.error("update cycle synthesis error", cycleError);
    }
  }

  return true;
}

export async function lockCycleStep(
  cycleId: string,
  stepType: string
): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_cycle_steps")
    .update({
      status: "locked",
      locked_at: new Date().toISOString(),
    })
    .eq("cycle_id", cycleId)
    .eq("step_type", stepType);

  if (error) {
    console.error("lockCycleStep error", error);
    return false;
  }

  return true;
}

export async function getCycleSteps(cycleId: string): Promise<HackathonPhase3CycleStep[]> {
  const { data, error } = await supabase
    .from("hackathon_phase3_cycle_steps")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("step_type");

  if (error) return [];
  return (data ?? []) as HackathonPhase3CycleStep[];
}

// ============================================================
// Test Sessions
// ============================================================

export async function createTestSession(
  session: Omit<HackathonPhase3TestSession, "id" | "created_at">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("hackathon_phase3_test_sessions")
    .insert({
      cycle_step_id: session.cycle_step_id || null,
      team_id: session.team_id,
      cycle_number: session.cycle_number,
      tester_name: session.tester_name,
      tester_role: session.tester_role,
      tester_contact: session.tester_contact,
      tester_channel: session.tester_channel,
      fresh_tester: session.fresh_tester,
      fresh_override_reason: session.fresh_override_reason,
      session_date: session.session_date,
      session_duration_min: session.session_duration_min,
      behavior_log: session.behavior_log,
      unprompted_quotes: session.unprompted_quotes,
      painful_detail: session.painful_detail,
      session_result: session.session_result,
      clip_url: session.clip_url,
      screenshot_urls: session.screenshot_urls,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createTestSession error", error);
    return null;
  }

  return data?.id ?? null;
}

export async function getTeamTestSessions(teamId: string): Promise<HackathonPhase3TestSession[]> {
  const { data, error } = await supabase
    .from("hackathon_phase3_test_sessions")
    .select("*")
    .eq("team_id", teamId)
    .order("cycle_number", { ascending: true })
    .order("session_date", { ascending: true });

  if (error) return [];
  return (data ?? []) as HackathonPhase3TestSession[];
}

export async function deleteTestSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_test_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("deleteTestSession error", error);
    return false;
  }
  return true;
}

export async function deleteCycleById(cycleId: string): Promise<boolean> {
  const { data: deletedRow, error } = await supabase
    .from("hackathon_phase3_cycles")
    .delete()
    .eq("id", cycleId)
    .select("id")
    .maybeSingle();

  if (deletedRow?.id === cycleId) {
    return true;
  }

  if (error) {
    console.warn("deleteCycleById hard delete failed, falling back to abandoned status", error);
  } else {
    console.warn("deleteCycleById hard delete affected zero rows, falling back to abandoned status", { cycleId });
  }

  const { data: softDeletedRow, error: softDeleteError } = await supabase
    .from("hackathon_phase3_cycles")
    .update({ status: "abandoned" })
    .eq("id", cycleId)
    .neq("status", "abandoned")
    .select("id,status")
    .maybeSingle();

  if (softDeletedRow?.id === cycleId) {
    return true;
  }

  if (softDeleteError) {
    console.error("deleteCycleById fallback error", softDeleteError);
    return false;
  }

  const { data: remainingRow, error: verifyError } = await supabase
    .from("hackathon_phase3_cycles")
    .select("id,status")
    .eq("id", cycleId)
    .maybeSingle();

  if (verifyError) {
    console.error("deleteCycleById verification error", verifyError);
    return false;
  }

  if (!remainingRow || remainingRow.status === "abandoned") {
    return true;
  }

  console.error("deleteCycleById could not delete or soft-delete cycle", remainingRow);
  return false;
}

export async function checkFreshTester(
  teamId: string,
  testerName: string,
  cycleNumber: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_fresh_tester", {
    p_team_id: teamId,
    p_tester_name: testerName,
    p_cycle_number: cycleNumber,
  });

  if (error) {
    console.error("checkFreshTester error", error);
    return false;
  }

  return data as boolean;
}

// ============================================================
// Daily Check-ins
// ============================================================

export async function getTeamDailyCheckins(teamId: string): Promise<HackathonPhase3DailyCheckin[]> {
  const { data, error } = await supabase
    .from("hackathon_phase3_daily_checkins")
    .select("*")
    .eq("team_id", teamId)
    .order("day_number", { ascending: true });

  if (error) return [];
  return (data ?? []) as HackathonPhase3DailyCheckin[];
}

export async function submitDailyCheckin(
  teamId: string,
  dayNumber: number,
  checkinData: {
    current_cycle_number?: number;
    current_cycle_state?: string;
    current_hypothesis?: string;
    variable_changed?: string;
    test_sessions_today?: number;
    status?: string;
    late_reason?: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_daily_checkins")
    .upsert(
      {
        team_id: teamId,
        day_number: dayNumber,
        ...checkinData,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "team_id,day_number" }
    );

  if (error) {
    console.error("submitDailyCheckin error", error);
    return false;
  }

  return true;
}

// ============================================================
// Mid-Phase Synthesis
// ============================================================

export async function getMidphaseSynthesis(teamId: string): Promise<HackathonPhase3MidphaseSynthesis | null> {
  const { data, error } = await supabase
    .from("hackathon_phase3_midphase_synthesis")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error || !data) return null;
  return data as HackathonPhase3MidphaseSynthesis;
}

export async function submitMidphaseSynthesis(
  teamId: string,
  synthesis: {
    what_learned?: string;
    what_changed?: string;
    what_wrong?: string;
    next_hypothesis?: string;
    pretotype_state_url?: string;
    confidence_score?: number;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_midphase_synthesis")
    .upsert(
      {
        team_id: teamId,
        ...synthesis,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "team_id" }
    );

  if (error) {
    console.error("submitMidphaseSynthesis error", error);
    return false;
  }

  return true;
}

// ============================================================
// Module Progress
// ============================================================

export async function getModuleProgress(
  participantId: string
): Promise<HackathonPhase3ModuleProgress[]> {
  const { data, error } = await supabase
    .from("hackathon_phase3_module_progress")
    .select("*")
    .eq("participant_id", participantId)
    .order("module_number", { ascending: true });

  if (error) return [];
  return (data ?? []) as HackathonPhase3ModuleProgress[];
}

export async function updateModuleProgress(
  participantId: string,
  teamId: string,
  moduleNumber: number,
  status: string,
  quizData?: {
    answers?: Record<string, unknown>;
    score?: number;
    passed?: boolean;
  }
): Promise<boolean> {
  const update: Record<string, unknown> = {
    participant_id: participantId,
    team_id: teamId,
    module_number: moduleNumber,
    status,
  };

  if (quizData) {
    update.quiz_answers = quizData.answers;
    update.quiz_score = quizData.score;
    update.quiz_passed = quizData.passed;
  }

  if (status === "completed") {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("hackathon_phase3_module_progress")
    .upsert(update, { onConflict: "participant_id,module_number" });

  if (error) {
    console.error("updateModuleProgress error", error);
    return false;
  }

  return true;
}

// ============================================================
// Video Submissions
// ============================================================

export async function getVideoSubmission(teamId: string): Promise<HackathonPhase3VideoSubmission | null> {
  const { data, error } = await supabase
    .from("hackathon_phase3_video_submissions")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error || !data) return null;
  return data as HackathonPhase3VideoSubmission;
}

export async function saveVideoStoryboard(
  teamId: string,
  storyboard: Record<string, unknown>[]
): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_video_submissions")
    .upsert(
      {
        team_id: teamId,
        storyboard,
      },
      { onConflict: "team_id" }
    );

  if (error) {
    console.error("saveVideoStoryboard error", error);
    return false;
  }

  return true;
}

export async function submitRound1Video(
  teamId: string,
  videoData: {
    video_url: string;
    video_duration_sec: number;
    video_file_size_mb: number;
    hard_gates: Record<string, boolean>;
    soft_gates: Record<string, boolean>;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_video_submissions")
    .upsert(
      {
        team_id: teamId,
        ...videoData,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "team_id" }
    );

  if (error) {
    console.error("submitRound1Video error", error);
    return false;
  }

  return true;
}

// ============================================================
// Leaderboard & Funnel
// ============================================================

export async function getPhase3Leaderboard(): Promise<Phase3LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("phase3_leaderboard_cycles")
    .select("*")
    .order("cycles_completed", { ascending: false });

  if (error) return [];
  return (data ?? []) as Phase3LeaderboardEntry[];
}

export async function getPhase3Funnel(): Promise<Phase3FunnelEntry[]> {
  const { data, error } = await supabase
    .from("phase3_funnel")
    .select("*")
    .order("funnel_stage");

  if (error) return [];
  return (data ?? []) as Phase3FunnelEntry[];
}

// ============================================================
// Scorecard
// ============================================================

export async function getCycleScorecard(cycleId: string) {
  const { data, error } = await supabase.rpc("get_cycle_scorecard", {
    p_cycle_id: cycleId,
  });

  if (error) {
    console.error("getCycleScorecard error", error);
    return null;
  }

  return data as Record<string, number> | null;
}

// ============================================================
// AI Feedback Update
// ============================================================

export async function updateStepAIFeedback(
  cycleId: string,
  stepType: string,
  feedback: AICoachResponse
): Promise<boolean> {
  const { error } = await supabase
    .from("hackathon_phase3_cycle_steps")
    .update({
      ai_feedback: feedback as any,
      ai_feedback_at: new Date().toISOString(),
      status: "ai_reviewed",
    })
    .eq("cycle_id", cycleId)
    .eq("step_type", stepType);

  if (error) {
    console.error("updateStepAIFeedback error", error);
    return false;
  }

  return true;
}
