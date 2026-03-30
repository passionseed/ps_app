// PathLab Content System types (new activity-based system)

// ============ Activity Types ============

export type PathActivityType =
  | "learning"
  | "reflection"
  | "milestone"
  | "checkpoint"
  | "journal_prompt"
  | "ai_chat"
  | "npc_dialogue";

export type PathActivityScope = "individual" | "team" | "hybrid";
export type PathArtifactKind =
  | "response"
  | "structured_canvas"
  | "file"
  | "media"
  | "ai_feedback_loop"
  | "research_bundle";
export type PathGateRule =
  | "complete"
  | "all_members_complete"
  | "min_members_complete"
  | "mentor_pass"
  | "team_submission_pass";
export type PathReviewMode = "auto" | "mentor" | "auto_then_mentor";

export interface PathWorkflowMetadata {
  scope: PathActivityScope;
  artifact_kind: PathArtifactKind;
  gate_rule: PathGateRule;
  review_mode: PathReviewMode;
  required_member_count: number | null;
  allow_retry: boolean;
  unlock_hint: string | null;
}

export interface PathActivityBehavior {
  scope: PathActivityScope;
  artifactKind: PathArtifactKind;
  gateRule: PathGateRule;
  reviewMode: PathReviewMode;
  unlockCondition: string | null;
  minMembersRequired: number | null;
}

export interface PathActivity {
  id: string;
  path_day_id: string;
  title: string;
  instructions: string | null;
  display_order: number;
  estimated_minutes: number | null;
  is_required: boolean;
  is_draft: boolean;
  draft_reason: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============ Content Types ============

export type PathContentType =
  // Inherited from learning maps
  | "video"
  | "short_video"
  | "canva_slide"
  | "text"
  | "image"
  | "pdf"
  | "resource_link"
  | "order_code"
  // PathLab-specific
  | "daily_prompt"
  | "reflection_card"
  | "emotion_check"
  | "progress_snapshot"
  | "ai_chat"
  | "npc_chat";

export interface PathContent {
  id: string;
  activity_id: string;
  content_type: PathContentType;
  content_title: string | null;
  content_url: string | null;
  content_body: string | null;
  display_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============ Assessment Types ============

export type PathAssessmentType =
  // Inherited from learning maps
  | "quiz"
  | "text_answer"
  | "file_upload"
  | "image_upload"
  | "checklist"
  // PathLab-specific
  | "daily_reflection"
  | "interest_rating"
  | "energy_check";

export interface PathAssessment {
  id: string;
  activity_id: string;
  assessment_type: PathAssessmentType;
  points_possible: number | null;
  is_graded: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PathQuizQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  created_at: string;
}

// ============ Progress Types ============

export type PathActivityStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface PathActivityProgress {
  id: string;
  enrollment_id: string;
  activity_id: string;
  status: PathActivityStatus;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface PathAssessmentSubmission {
  id: string;
  progress_id: string;
  assessment_id: string;
  text_answer: string | null;
  file_urls: string[] | null;
  image_url: string | null;
  quiz_answers: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  submitted_at: string;
}

// ============ Content Metadata Types ============

export interface DailyPromptMetadata {
  prompt_type?: string;
  difficulty?: string;
}

export interface ReflectionCardMetadata {
  prompts?: string[];
  categories?: string[];
}

export interface EmotionCheckMetadata {
  emotion_scale?: string[];
}

export interface ProgressSnapshotMetadata {
  metrics?: string[];
}

export interface AIChatMetadata {
  system_prompt?: string;
  objective?: string;
  completion_criteria?: string;
  model?: string;
  max_messages?: number;
}

export interface NPCChatMetadata {
  conversation_id?: string;
  summary?: string;
  allow_restart?: boolean;
  show_history?: boolean;
}

// ============ Assessment Metadata Types ============

export interface ChecklistMetadata {
  items?: Array<{
    id: string;
    text: string;
    required?: boolean;
  }>;
}

export interface DailyReflectionMetadata {
  prompts?: string[];
  min_words?: number;
}

export interface InterestRatingMetadata {
  scale_min?: number;
  scale_max?: number;
  labels?: Record<number, string>;
}

export interface EnergyCheckMetadata {
  levels?: Array<{
    value: number;
    label: string;
    emoji?: string;
  }>;
}

// ============ Combined Types for UI ============

export interface PathActivityWithContent extends PathActivity {
  path_content: PathContent[];
  path_assessment: PathAssessmentWithQuestions | null;
  progress?: PathActivityProgress;
  submission?: PathAssessmentSubmission | null;
}

const DEFAULT_WORKFLOW_METADATA: PathWorkflowMetadata = {
  scope: "individual",
  artifact_kind: "response",
  gate_rule: "complete",
  review_mode: "auto",
  required_member_count: null,
  allow_retry: false,
  unlock_hint: null,
};

function normalizeString<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}

function normalizeRequiredMemberCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

export function getPathActivityWorkflowMetadata(
  activity: {
    metadata?: Record<string, unknown> | null;
    path_assessment?: { metadata?: Record<string, unknown> | null } | null;
  },
): PathWorkflowMetadata {
  const raw =
    activity.metadata ??
    activity.path_assessment?.metadata ??
    null;

  if (!raw) {
    return { ...DEFAULT_WORKFLOW_METADATA };
  }

  return {
    scope:
      normalizeString(raw.scope, ["individual", "team", "hybrid"]) ??
      DEFAULT_WORKFLOW_METADATA.scope,
    artifact_kind:
      normalizeString(raw.artifact_kind, [
        "response",
        "structured_canvas",
        "file",
        "media",
        "ai_feedback_loop",
        "research_bundle",
      ]) ?? DEFAULT_WORKFLOW_METADATA.artifact_kind,
    gate_rule:
      normalizeString(raw.gate_rule, [
        "complete",
        "all_members_complete",
        "min_members_complete",
        "mentor_pass",
        "team_submission_pass",
      ]) ?? DEFAULT_WORKFLOW_METADATA.gate_rule,
    review_mode:
      normalizeString(raw.review_mode, [
        "auto",
        "mentor",
        "auto_then_mentor",
      ]) ?? DEFAULT_WORKFLOW_METADATA.review_mode,
    required_member_count:
      normalizeRequiredMemberCount(raw.required_member_count) ??
      DEFAULT_WORKFLOW_METADATA.required_member_count,
    allow_retry:
      typeof raw.allow_retry === "boolean"
        ? raw.allow_retry
        : DEFAULT_WORKFLOW_METADATA.allow_retry,
    unlock_hint:
      typeof raw.unlock_hint === "string"
        ? raw.unlock_hint
        : DEFAULT_WORKFLOW_METADATA.unlock_hint,
  };
}

export function getActivityBehavior(
  activity: Pick<PathActivityWithContent, "metadata" | "path_assessment" | "path_content">,
): PathActivityBehavior {
  const workflow = getPathActivityWorkflowMetadata(activity);
  const assessmentMetadata = activity.path_assessment?.metadata ?? {};
  const contentMetadata = activity.path_content.find((content) => content.metadata)
    ?.metadata ?? {};

  return {
    scope: workflow.scope,
    artifactKind: workflow.artifact_kind,
    gateRule:
      normalizeString(assessmentMetadata.gate_rule, [
        "complete",
        "all_members_complete",
        "min_members_complete",
        "mentor_pass",
        "team_submission_pass",
      ]) ?? workflow.gate_rule,
    reviewMode:
      normalizeString(assessmentMetadata.review_mode, [
        "auto",
        "mentor",
        "auto_then_mentor",
      ]) ?? workflow.review_mode,
    unlockCondition:
      typeof contentMetadata.unlock_condition === "string"
        ? contentMetadata.unlock_condition
        : workflow.unlock_hint,
    minMembersRequired:
      normalizeRequiredMemberCount(assessmentMetadata.min_members_required) ??
      workflow.required_member_count,
  };
}

// Helper to get activity type from content or assessment
export function getActivityType(activity: PathActivityWithContent): string {
  if (activity.path_content && activity.path_content.length > 0) {
    return activity.path_content[0].content_type;
  }
  if (activity.path_assessment) {
    return activity.path_assessment.assessment_type;
  }
  return 'unknown';
}

export interface PathAssessmentWithQuestions extends PathAssessment {
  quiz_questions?: PathQuizQuestion[];
}
