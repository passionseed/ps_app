// types/events.ts

/**
 * Event type constants for mobile app analytics.
 * Shared with web app via user_events table.
 */
export const EVENT_TYPES = {
  // Mobile-specific
  MOBILE_APP_OPENED: 'mobile_app_opened',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  INTEREST_SELECTED: 'interest_selected',
  CAREER_SELECTED: 'career_selected',

  // Portfolio
  PORTFOLIO_ITEM_ADDED: 'portfolio_item_added',
  PORTFOLIO_ITEM_DELETED: 'portfolio_item_deleted',

  // Fit scores
  FIT_SCORE_VIEWED: 'fit_score_viewed',

  // Programs
  PROGRAM_VIEWED: 'program_viewed',
  PROGRAM_SAVED: 'program_saved',
  PROGRAM_UNSAVED: 'program_unsaved',

  // Plans
  ADMISSION_PLAN_CREATED: 'admission_plan_created',

  // Career search
  CAREER_SEARCHED: 'career_searched',
  JOURNEY_SIMULATION_CREATED: 'journey_simulation_created',

  // Seed velocity analytics
  SEED_STARTED: 'seed_started',
  SEED_COMPLETED: 'seed_completed',
  DIRECTION_FINDER_VIEWED: 'direction_finder_viewed',

  // Upload analytics
  UPLOAD_ATTEMPT: 'upload_attempt',
  UPLOAD_COMPLETE: 'upload_complete',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * Event data schemas for type-safe logging.
 */
export interface EventDataMap {
  mobile_app_opened: Record<string, never>;
  onboarding_started: Record<string, never>;
  onboarding_step_completed: { step: string; duration_seconds: number };
  interest_selected: { category: string; statement: string };
  career_selected: { career_name: string; source: 'ai' | 'custom' };
  portfolio_item_added: { item_type: string; title: string };
  portfolio_item_deleted: { item_id: string };
  fit_score_viewed: { filter: 'eligible' | 'all' };
  program_viewed: { program_id: string; university_id: string; round_id?: string };
  program_saved: { program_id: string; university_id: string };
  program_unsaved: { program_id: string };
  admission_plan_created: { round_count: number; program_ids: string[] };
  career_searched: { query: string; results_count: number };
  journey_simulation_created: { job_id: string; job_title: string };
  seed_started: {
    seed_id: string;
    seed_title: string;
    seed_category_id: string | null;
    seed_tags: string[];
    path_id: string | null;
    enrollment_id: string;
    source: 'seed_detail';
  };
  seed_completed: {
    enrollment_id: string;
    seed_id: string;
    path_id: string | null;
    seed_title: string;
    seed_category_id: string | null;
    seed_tags: string[];
    completed_seed_count: number;
    milestone_seed_count: 1 | 2 | 3 | 5 | null;
  };
  direction_finder_viewed: {
    source: 'profile_ikigai';
  };
  upload_attempt: {
    stage: string;
    success: boolean;
    duration_ms?: number;
    error_message?: string;
    file_size?: number;
    uri_scheme?: string;
  };
  upload_complete: {
    duration_ms: number;
    file_size: number;
    uri_scheme: string;
  };
}

/**
 * User event record from database.
 */
export interface UserEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  event_data: Record<string, unknown>;
  session_id: string;
  created_at: string;
}
