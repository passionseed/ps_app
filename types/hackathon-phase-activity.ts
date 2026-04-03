export type HackathonPhaseActivityContentType =
  | 'video'
  | 'short_video'
  | 'canva_slide'
  | 'text'
  | 'image'
  | 'pdf'
  | 'ai_chat'
  | 'npc_chat';

export type HackathonPhaseActivityAssessmentType =
  | 'text_answer'
  | 'file_upload'
  | 'image_upload';

export interface HackathonPhaseActivity {
  id: string;
  phase_id: string;
  title: string;
  instructions: string | null;
  display_order: number;
  estimated_minutes: number | null;
  is_required: boolean;
  is_draft: boolean;
  submission_scope: "individual" | "team";
  created_at: string;
  updated_at: string;
}

export interface HackathonPhaseActivityContent {
  id: string;
  activity_id: string;
  content_type: HackathonPhaseActivityContentType;
  content_title: string | null;
  content_url: string | null;
  content_body: string | null;
  display_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HackathonPhaseActivityAssessment {
  id: string;
  activity_id: string;
  assessment_type: HackathonPhaseActivityAssessmentType;
  points_possible: number | null;
  is_graded: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Full activity with content and optional assessment — used for home screen display */
export interface HackathonPhaseActivityDetail extends HackathonPhaseActivity {
  content: HackathonPhaseActivityContent[];
  assessment: HackathonPhaseActivityAssessment | null;
}

/** Phase with its activities — used for home screen */
export interface HackathonPhaseWithActivities {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  description: string | null;
  phase_number: number;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  activities: HackathonPhaseActivityDetail[];
}
