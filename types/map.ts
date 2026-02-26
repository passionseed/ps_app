// Map node types from pseed project

export type NodeType =
  | "text"
  | "video"
  | "quiz"
  | "assessment"
  | "project"
  | "file_upload"
  | "learning"
  | "end";

export type NodeProgressStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "passed"
  | "failed";

export interface NodeContentRecord {
  id: string;
  node_id: string;
  content_type: "video" | "canva_slide" | "text_with_images" | "resource_link" | "text";
  content_url?: string;
  content_body?: string;
  content_title?: string;
  display_order?: number;
  created_at: string;
}

export interface NodeAssessment {
  id: string;
  node_id: string;
  assessment_type: "quiz" | "text_answer" | "image_upload" | "file_upload";
  quiz_questions?: QuizQuestionDB[];
  created_at?: string;
}

export interface QuizQuestionDB {
  id: string;
  assessment_id: string;
  question_text: string;
  options?: Array<{ option: string; text: string }>;
  correct_option?: string;
}

export interface MapNode {
  id: string;
  map_id: string;
  title: string;
  content?: NodeContent;
  node_type: NodeType;
  position_x?: number;
  position_y?: number;
  instructions?: string; // For learning nodes with root-level instructions
  metadata?: Record<string, unknown>; // For nodes with metadata (position, etc.)
  node_content?: NodeContentRecord[]; // Actual content from node_content table
  node_assessments?: NodeAssessment[]; // Assessments from node_assessments table
  created_at: string;
  updated_at: string;
}

export interface NodeContent {
  // Common
  description?: string;
  instructions?: string;

  // Video node
  video_url?: string;
  video_duration?: number;

  // Quiz node
  questions?: QuizQuestion[];
  passing_score?: number;

  // File upload node
  allowed_types?: string[];
  max_file_size?: number;

  // Text node
  body?: string;

  // Project node
  deliverables?: string[];
  rubric?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "drag_drop" | "fill_blank";
  options?: QuizOption[];
  correct_answer?: string | string[];
  explanation?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface StudentNodeProgress {
  id: string;
  user_id: string;
  node_id: string;
  status: NodeProgressStatus;
  submission?: NodeSubmission;
  feedback?: string;
  arrived_at?: string;
  started_at?: string;
  submitted_at?: string;
  updated_at: string;
}

export interface NodeSubmission {
  // Quiz submission
  answers?: Record<string, string | string[]>;

  // File upload submission
  file_url?: string;
  file_name?: string;
  file_type?: string;

  // Text/response submission
  response?: string;

  // Time tracking
  time_spent_seconds?: number;
}
