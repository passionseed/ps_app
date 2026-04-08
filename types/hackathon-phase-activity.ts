export type HackathonPhaseActivityContentType =
  | 'video'
  | 'short_video'
  | 'canva_slide'
  | 'text'
  | 'image'
  | 'pdf'
  | 'ai_chat'
  | 'npc_chat'
  | 'infographic_comic'
  | 'webtoon';

export interface HackathonComicPanelMetadata {
  id?: string;
  order?: number;
  display_order?: number;
  headline?: string;
  title?: string;
  label?: string;
  body?: string;
  description?: string;
  image_key?: string;
  imageKey?: string;
  image_url?: string;
  imageUrl?: string;
  accent?: string;
  tone?: string;
}

export interface HackathonComicMetadata {
  variant?: string;
  panels?: HackathonComicPanelMetadata[];
}

export interface HackathonComicPanel {
  id: string;
  order: number;
  headline: string;
  body: string;
  imageKey: string | null;
  accent: string;
}

export interface HackathonComicContent {
  variant: string;
  panels: HackathonComicPanel[];
}

export interface HackathonWebtoonChunkMetadata {
  id?: string;
  order?: number;
  image_key?: string;
  imageKey?: string;
  image_url?: string;
  imageUrl?: string;
}

export interface HackathonWebtoonMetadata {
  variant?: string;
  original_width?: number;
  original_height?: number;
  panel_width?: number;
  panel_height?: number;
  chunks?: HackathonWebtoonChunkMetadata[];
}

export interface HackathonWebtoonChunk {
  id: string;
  order: number;
  imageKey: string | null;
}

export interface HackathonWebtoonContent {
  variant: string;
  originalWidth: number | null;
  originalHeight: number | null;
  panelWidth: number | null;
  panelHeight: number | null;
  chunks: HackathonWebtoonChunk[];
}

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
  display_order: number;
  points_possible: number | null;
  is_graded: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Full activity with content and assessments — used for home screen display */
export interface HackathonPhaseActivityDetail extends HackathonPhaseActivity {
  content: HackathonPhaseActivityContent[];
  assessments: HackathonPhaseActivityAssessment[];
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
