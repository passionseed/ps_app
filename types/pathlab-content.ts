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
