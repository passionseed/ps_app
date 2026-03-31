// lib/userSignals.ts
// Fetches user event history and computes an affinity profile for personalization.

import { supabase } from './supabase';

/** Maps onboarding interest categories to seed tags */
export const INTEREST_TO_TAGS: Record<string, string[]> = {
  technology: ['tech', 'coding', 'ai', 'stem', 'machine-learning', 'web', 'gamedev'],
  science: ['stem', 'biology', 'chemistry', 'physics', 'research'],
  business: ['business', 'entrepreneurship', 'startup', 'economics', 'finance', 'innovation'],
  arts: ['creative', 'design', 'music', 'film', 'art'],
  humanities: ['philosophy', 'writing', 'critical-thinking', 'social-science', 'humanities'],
  food: ['cooking', 'chef', 'food', 'culinary'],
  sports: ['sports', 'fitness', 'health', 'wellness'],
  social: ['community', 'teamwork', 'leadership', 'social-science'],
};

/** Maps career search keywords to seed tags */
export const CAREER_TO_TAGS: Record<string, string[]> = {
  'machine learning': ['machine-learning', 'ai', 'tech', 'stem'],
  software: ['coding', 'tech', 'web', 'stem'],
  'data scientist': ['machine-learning', 'ai', 'stem', 'tech'],
  chef: ['cooking', 'chef', 'food', 'culinary'],
  entrepreneur: ['business', 'startup', 'entrepreneurship', 'innovation'],
  'game developer': ['gamedev', 'coding', 'gaming', 'tech'],
  economist: ['economics', 'finance', 'business', 'social-science'],
  philosopher: ['philosophy', 'humanities', 'writing'],
  'web developer': ['web', 'coding', 'frontend', 'tech'],
};

export interface AffinityProfile {
  /** Flat set of tag strings derived from user events, deduped */
  tags: Set<string>;
  /** Human-readable reason strings keyed by tag (e.g., "Because you searched for AI") */
  reasons: Record<string, string>;
}

/**
 * Fetch the user's recent events and compute an affinity profile.
 * Returns null if the user has no relevant events or on any error.
 * Always fail-silent — never throws.
 */
export async function computeAffinityProfile(
  userId: string,
): Promise<AffinityProfile | null> {
  try {
    const { data: events, error } = await supabase
      .from('user_events')
      .select('event_type, event_data')
      .eq('user_id', userId)
      .in('event_type', [
        'interest_selected',
        'career_searched',
        'career_selected',
        'program_saved',
      ])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !events || events.length === 0) return null;

    const tags = new Set<string>();
    const reasons: Record<string, string> = {};

    for (const event of events) {
      const data = event.event_data as Record<string, unknown>;

      if (event.event_type === 'interest_selected') {
        const category = (data.category as string | undefined)?.toLowerCase() ?? '';
        const matched = INTEREST_TO_TAGS[category];
        if (matched) {
          matched.forEach((tag) => {
            tags.add(tag);
            if (!reasons[tag]) {
              reasons[tag] = `Because you're interested in ${cap(category)}`;
            }
          });
        }
      }

      if (
        event.event_type === 'career_searched' ||
        event.event_type === 'career_selected'
      ) {
        const query = (
          (data.query as string | undefined) ??
          (data.career_name as string | undefined) ??
          ''
        ).toLowerCase();

        for (const [keyword, keyTags] of Object.entries(CAREER_TO_TAGS)) {
          if (query.includes(keyword)) {
            keyTags.forEach((tag) => {
              tags.add(tag);
              if (!reasons[tag]) {
                reasons[tag] = `Because you searched for ${cap(query)}`;
              }
            });
          }
        }
      }
    }

    if (tags.size === 0) return null;
    return { tags, reasons };
  } catch {
    return null;
  }
}

function cap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
