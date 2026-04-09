// lib/eventLogger.ts

import { supabase } from './supabase';
import type { EventType, EventDataMap } from '../types/events';
import { storage } from './storage';
import {
  buildDirectionFinderViewedEventData,
  buildSeedCompletedEventData,
  buildSeedStartedEventData,
} from './seedVelocityAnalytics';
import type { Seed } from '../types/seeds';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const SESSION_KEY = 'ps_session_id';
const SESSION_TS_KEY = 'ps_session_timestamp';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Postgrest errors sometimes omit message; avoid logging `{}`. */
function formatSupabaseError(error: unknown): string {
  if (error == null) return 'unknown error';
  if (typeof error === 'object') {
    const e = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    const parts = [e.message, e.code, e.details, e.hint].filter(
      (p): p is string => typeof p === 'string' && p.length > 0
    );
    if (parts.length) return parts.join(' | ');
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Get or create a session ID with 24-hour expiry.
 * Uses MMKV for synchronous access.
 */
function getSessionId(): string {
  try {
    const stored = storage.getString(SESSION_KEY);
    const ts = storage.getString(SESSION_TS_KEY);

    if (stored && ts && Date.now() - parseInt(ts, 10) < SESSION_TTL_MS) {
      return stored;
    }

    const newId = generateUUID();
    storage.set(SESSION_KEY, newId);
    storage.set(SESSION_TS_KEY, Date.now().toString());
    return newId;
  } catch {
    return generateUUID();
  }
}

/**
 * Log an event to the user_events table.
 * Fail-silent: never blocks user flow.
 */
export async function logEvent<K extends keyof EventDataMap>(
  eventType: K,
  eventData: EventDataMap[K]
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Skip if not authenticated

    const sessionId = getSessionId();

    const { error } = await supabase.from('user_events').insert({
      user_id: user.id,
      event_type: eventType,
      event_data: eventData,
      session_id: sessionId,
    });

    if (error) {
      console.error('[EventLogger] Failed to log event:', formatSupabaseError(error));
    }
  } catch (error) {
    console.error('[EventLogger] Unexpected error:', formatSupabaseError(error));
    // Fail-silent: don't throw
  }
}

/**
 * Log app opened event - call from root layout on mount.
 */
export async function logAppOpened(): Promise<void> {
  await logEvent('mobile_app_opened', {});
}

/**
 * Log onboarding started event.
 */
export async function logOnboardingStarted(): Promise<void> {
  await logEvent('onboarding_started', {});
}

/**
 * Log onboarding step completed event.
 */
export async function logOnboardingStepCompleted(
  step: string,
  durationSeconds: number
): Promise<void> {
  await logEvent('onboarding_step_completed', { step, duration_seconds: durationSeconds });
}

/**
 * Log interest selected event.
 */
export async function logInterestSelected(
  category: string,
  statement: string
): Promise<void> {
  await logEvent('interest_selected', { category, statement });
}

/**
 * Log career selected event.
 */
export async function logCareerSelected(
  careerName: string,
  source: 'ai' | 'custom'
): Promise<void> {
  await logEvent('career_selected', { career_name: careerName, source });
}

/**
 * Log portfolio item added event.
 */
export async function logPortfolioItemAdded(
  itemType: string,
  title: string
): Promise<void> {
  await logEvent('portfolio_item_added', { item_type: itemType, title });
}

/**
 * Log portfolio item deleted event.
 */
export async function logPortfolioItemDeleted(itemId: string): Promise<void> {
  await logEvent('portfolio_item_deleted', { item_id: itemId });
}

/**
 * Log fit score viewed event.
 */
export async function logFitScoreViewed(filter: 'eligible' | 'all'): Promise<void> {
  await logEvent('fit_score_viewed', { filter });
}

/**
 * Log program viewed event.
 */
export async function logProgramViewed(
  programId: string,
  universityId: string,
  roundId?: string
): Promise<void> {
  await logEvent('program_viewed', { program_id: programId, university_id: universityId, round_id: roundId });
}

/**
 * Log program saved event.
 */
export async function logProgramSaved(
  programId: string,
  universityId: string
): Promise<void> {
  await logEvent('program_saved', { program_id: programId, university_id: universityId });
}

/**
 * Log program unsaved event.
 */
export async function logProgramUnsaved(programId: string): Promise<void> {
  await logEvent('program_unsaved', { program_id: programId });
}

/**
 * Log admission plan created event.
 */
export async function logAdmissionPlanCreated(
  roundCount: number,
  programIds: string[]
): Promise<void> {
  await logEvent('admission_plan_created', { round_count: roundCount, program_ids: programIds });
}

/**
 * Log career searched event.
 */
export async function logCareerSearched(
  query: string,
  resultsCount: number
): Promise<void> {
  await logEvent('career_searched', { query, results_count: resultsCount });
}

/**
 * Log journey simulation created event.
 */
export async function logJourneySimulationCreated(
  jobId: string,
  jobTitle: string
): Promise<void> {
  await logEvent('journey_simulation_created', { job_id: jobId, job_title: jobTitle });
}

/**
 * Log when a user starts a seed for the first time.
 */
export async function logSeedStarted(params: {
  seed: Pick<Seed, 'id' | 'title' | 'category_id' | 'tags'>;
  pathId: string;
  enrollmentId: string;
}): Promise<void> {
  await logEvent(
    'seed_started',
    buildSeedStartedEventData({
      seed: params.seed,
      pathId: params.pathId,
      enrollmentId: params.enrollmentId,
    })
  );
}

/**
 * Log when a user completes the final reflection for a seed.
 */
export async function logSeedCompleted(params: {
  enrollmentId: string;
  seedId: string;
  pathId: string | null;
  seedTitle: string;
  categoryId: string | null;
  tags: string[];
  completedSeedCount: number;
  milestoneSeedCount: 1 | 2 | 3 | 5 | null;
}): Promise<void> {
  await logEvent(
    'seed_completed',
    buildSeedCompletedEventData({
      enrollmentId: params.enrollmentId,
      seedId: params.seedId,
      pathId: params.pathId,
      seedTitle: params.seedTitle,
      categoryId: params.categoryId,
      tags: params.tags,
      completedSeedCount: params.completedSeedCount,
      milestoneSeedCount: params.milestoneSeedCount,
    })
  );
}

/**
 * Log when a user opens the current Direction Finder surface.
 */
export async function logDirectionFinderViewed(): Promise<void> {
  await logEvent('direction_finder_viewed', buildDirectionFinderViewedEventData());
}
