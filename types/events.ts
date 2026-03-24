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