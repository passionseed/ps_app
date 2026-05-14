import type { HackathonPhaseActivityContentType, HackathonPhaseActivityAssessmentType } from "./hackathon-phase-activity";

// ============================================================
// Phase 3 Content & Assessment Extensions
// ============================================================

export type HackathonPhase3ContentType =
  | HackathonPhaseActivityContentType
  | 'template'
  | 'auto_draft'
  | 'interactive_form';

export type HackathonPhase3ActivityType =
  | 'linear'
  | 'loop_step'
  | 'workspace'
  | 'checkpoint';

export type HackathonPhase3StepType =
  | 'hypothesis'
  | 'pretotype'
  | 'test_session'
  | 'synthesis';

export type HackathonPhase3CycleStatus =
  | 'planning'
  | 'testing'
  | 'synthesizing'
  | 'completed'
  | 'abandoned';

export type HackathonPhase3GateDecision =
  | 'refine'
  | 'proceed'
  | 'kill';

export type HackathonPhase3SynthesisResult =
  | 'confirmed'
  | 'killed'
  | 'unclear';

export type HackathonPhase3StepStatus =
  | 'draft'
  | 'submitted'
  | 'ai_reviewed'
  | 'mentor_reviewed'
  | 'locked';

export type HackathonPhase3TesterChannel =
  | 'in_person'
  | 'zoom'
  | 'phone'
  | 'line'
  | 'other';

export type HackathonPhase3DailyCheckinStatus =
  | 'draft'
  | 'submitted'
  | 'late'
  | 'excused';

export type HackathonPhase3ModuleStatus =
  | 'locked'
  | 'unlocked'
  | 'in_progress'
  | 'completed';

export type HackathonPhase3HumanReviewStatus =
  | 'pending'
  | 'flagged'
  | 'cleared'
  | 'reviewed';

// ============================================================
// Core Cycle Data
// ============================================================

export interface HackathonPhase3Cycle {
  id: string;
  team_id: string;
  program_phase_id: string;
  cycle_number: number;
  status: HackathonPhase3CycleStatus;
  gate_decision: HackathonPhase3GateDecision | null;
  
  // Hypothesis
  hypothesis_who: string | null;
  hypothesis_will_do: string | null;
  hypothesis_because: string | null;
  hypothesis_measured_by: string | null;
  hypothesis_full: string | null;
  
  // Variable
  variable_changed: string | null;
  prior_variable: string | null;
  
  // Pretotype
  pretotype_method: string | null;
  pretotype_artifact_url: string | null;
  pretotype_description: string | null;
  
  // Synthesis
  synthesis_result: HackathonPhase3SynthesisResult | null;
  synthesis_what_changed: string | null;
  synthesis_honest_wrongness: string | null;
  
  // Scoring
  ai_score: Phase3Scorecard | null;
  mentor_score: Phase3Scorecard | null;
  mentor_notes: string | null;
  
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
}

export interface Phase3Scorecard {
  hypothesis_quality: number;
  variable_isolation: number;
  behavioral_evidence: number;
  tester_freshness: number;
  synthesis_honesty: number;
  total: number;
}

// ============================================================
// Cycle Steps
// ============================================================

export interface HackathonPhase3CycleStep {
  id: string;
  cycle_id: string;
  step_type: HackathonPhase3StepType;
  status: HackathonPhase3StepStatus;
  submission_data: Record<string, unknown>;
  ai_feedback: AICoachResponse | null;
  ai_feedback_at: string | null;
  mentor_override: boolean;
  mentor_override_reason: string | null;
  created_at: string;
  submitted_at: string | null;
  locked_at: string | null;
}

export interface AICoachResponse {
  flags: AICoachFlag[];
  response: string;
  linked_module?: string;
  score?: number | null;
  breakdown?: {
    who: number;
    will_do: number;
    because: number;
    measured_by: number;
  } | null;
}

export interface AICoachFlag {
  severity: 'blocking' | 'warning' | 'info';
  flag_id: string;
  field: string;
  message: string;
  suggestion: string;
}

// ============================================================
// Test Sessions
// ============================================================

export interface HackathonPhase3TestSession {
  id: string;
  cycle_step_id: string;
  team_id: string;
  cycle_number: number;
  
  tester_name: string;
  tester_role: string | null;
  tester_contact: string | null;
  tester_channel: HackathonPhase3TesterChannel | null;
  
  fresh_tester: boolean;
  fresh_override_reason: string | null;
  
  session_date: string;
  session_duration_min: number | null;
  
  behavior_log: BehaviorLogEntry[];
  unprompted_quotes: string[];
  painful_detail: string | null;
  session_result: HackathonPhase3SynthesisResult | null;
  clip_url: string | null;
  screenshot_urls: string[] | null;
  ai_behavior_quality: {
    opinion_words_found: string[];
    suggestion: string;
  } | null;
  
  created_at: string;
}

export interface BehaviorLogEntry {
  interval: string; // e.g., "0:00-0:30"
  action: string;
  surprise: boolean;
}

// ============================================================
// Daily Check-ins
// ============================================================

export interface HackathonPhase3DailyCheckin {
  id: string;
  team_id: string;
  day_number: number;
  current_cycle_number: number | null;
  current_cycle_state: string | null;
  current_hypothesis: string | null;
  variable_changed: string | null;
  test_sessions_today: number;
  ai_feedback: AICoachResponse | null;
  ai_feedback_at: string | null;
  status: HackathonPhase3DailyCheckinStatus;
  due_at: string;
  submitted_at: string | null;
  late_reason: string | null;
  created_at: string;
}

// ============================================================
// Mid-Phase Synthesis
// ============================================================

export interface HackathonPhase3MidphaseSynthesis {
  id: string;
  team_id: string;
  auto_draft: string | null;
  auto_draft_generated_at: string | null;
  what_learned: string | null;
  what_changed: string | null;
  what_wrong: string | null;
  next_hypothesis: string | null;
  pretotype_state_url: string | null;
  confidence_score: number | null;
  ai_score: {
    pattern_detection: number;
    wrongness_honesty: number;
    evidence_specificity: number;
    total: number;
  } | null;
  ai_suggested_pattern: string | null;
  mentor_scheduled: boolean;
  mentor_meeting_at: string | null;
  mentor_notes: string | null;
  discord_post_id: string | null;
  posted_at: string | null;
  status: 'draft' | 'submitted' | 'scored' | 'mentor_reviewed';
  created_at: string;
  submitted_at: string | null;
}

// ============================================================
// Ritual Posts
// ============================================================

export interface HackathonPhase3RitualPost {
  id: string;
  team_id: string;
  cycle_number: number;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  discord_thread_id: string | null;
  posted_at: string | null;
  hypothesis_full: string;
  pre_test: boolean;
  test_sessions_after: number;
  ai_quality_score: Record<string, unknown> | null;
  ai_reply_discord_id: string | null;
  created_at: string;
}

// ============================================================
// Module Progress
// ============================================================

export interface HackathonPhase3ModuleProgress {
  id: string;
  participant_id: string;
  team_id: string;
  module_number: number;
  status: HackathonPhase3ModuleStatus;
  quiz_answers: Record<string, unknown> | null;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ============================================================
// Video Submissions
// ============================================================

export interface HackathonPhase3VideoSubmission {
  id: string;
  team_id: string;
  storyboard: VideoStoryboardSection[];
  video_url: string | null;
  video_duration_sec: number | null;
  video_file_size_mb: number | null;
  hard_gates: Record<string, boolean> | null;
  soft_gates: Record<string, boolean> | null;
  ai_extractor_output: Record<string, unknown> | null;
  ai_scrutinizer_output: Record<string, unknown> | null;
  ai_suspicion_score: number | null;
  human_review_status: HackathonPhase3HumanReviewStatus;
  human_reviewer_notes: string | null;
  judge_scores: Record<string, number> | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface VideoStoryboardSection {
  section: string;
  content: string;
  media_url: string | null;
  voiceover_url: string | null;
}

// ============================================================
// Workspace (Composite view)
// ============================================================

export interface Phase3Workspace {
  teamId: string;
  currentCycle: {
    cycleNumber: number;
    status: HackathonPhase3CycleStatus;
    activeStep: HackathonPhase3StepType;
    stepStatus: HackathonPhase3StepStatus;
  } | null;
  tracker: Phase3CycleTrackerEntry[];
  steps: Phase3WorkspaceStep[];
}

export interface Phase3CycleTrackerEntry {
  cycleNumber: number;
  hypothesis: string | null;
  result: HackathonPhase3SynthesisResult | null;
  variableChanged: string | null;
  score: number | null;
  status: HackathonPhase3CycleStatus;
}

export interface Phase3WorkspaceStep {
  stepType: HackathonPhase3StepType;
  status: HackathonPhase3StepStatus;
  content: Phase3StepContent[];
  assessments: Phase3StepAssessment[];
  aiFeedback: AICoachResponse | null;
  submissionData?: Record<string, unknown> | null;
}

export interface Phase3StepContent {
  id: string;
  content_type: HackathonPhase3ContentType;
  content_title: string | null;
  content_url: string | null;
  content_body: string | null;
  display_order: number;
  metadata: Record<string, unknown>;
}

export interface Phase3StepAssessment {
  id: string;
  assessment_type: HackathonPhaseActivityAssessmentType;
  display_order: number;
  points_possible: number | null;
  is_graded: boolean;
  metadata: Phase3AssessmentMetadata;
}

export interface Phase3AssessmentMetadata {
  prompt: string;
  placeholder: string;
  submission_label: string;
  min_words?: number;
  thread?: string;
  rubric_focus?: string[];
  decision_options?: string[];
  is_group_submission: boolean;
  ai_flags?: string[];
  linked_module?: string;
}

// ============================================================
// Leaderboard & Funnel Views
// ============================================================

export interface Phase3LeaderboardEntry {
  team_id: string;
  team_name: string;
  cycles_completed: number;
  distinct_testers: number;
  fresh_testers: number;
  hypotheses_preregistered: number;
  synthesis_submitted_at: string | null;
  video_submitted_at: string | null;
}

export interface Phase3FunnelEntry {
  team_id: string;
  team_name: string;
  current_cycle: number | null;
  current_status: string | null;
  last_gate_decision: string | null;
  checkins_submitted: number;
  total_test_sessions: number;
  fresh_test_sessions: number;
  confidence: number | null;
  funnel_stage: string;
}
