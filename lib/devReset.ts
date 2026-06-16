// lib/devReset.ts
//
// Developer-only data reset helpers. Lets devs wipe specific slices of a
// user's state so flows (onboarding, the passion-identity reveal, path
// progress) can be re-tested without creating a fresh account.
//
// These are gated behind `__DEV__` at the call site (see app/settings.tsx).
// They are intentionally destructive — every helper deletes real rows.

import { supabase } from './supabase';
import { getItem, removeItem, getAllKeys } from './asyncStorage';

export type ResetTarget = 'onboarding' | 'reveal' | 'paths' | 'localCache';

export interface ResetTargetMeta {
  key: ResetTarget;
  label: string;
  description: string;
  /** true when the reset touches the shared Supabase database (not just local). */
  remote: boolean;
}

export const RESET_TARGETS: ResetTargetMeta[] = [
  {
    key: 'onboarding',
    label: 'Onboarding',
    description: 'Clears is_onboarded + onboarding_state, interests, career goals',
    remote: true,
  },
  {
    key: 'reveal',
    label: 'Passion Reveal',
    description: 'Re-shows the identity reveal animation on next visit',
    remote: false,
  },
  {
    key: 'paths',
    label: 'Path Progress',
    description: 'Deletes enrollments, reflections, node progress',
    remote: true,
  },
  {
    key: 'localCache',
    label: 'Local Cache',
    description: 'Clears on-device cache + error logs (keeps auth session)',
    remote: false,
  },
];

/**
 * Reset onboarding: the user re-enters the onboarding flow on next launch.
 * Clears the profile flags plus all onboarding-derived rows.
 */
export async function resetOnboarding(userId: string): Promise<string> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_onboarded: false, onboarded_at: null })
    .eq('id', userId);
  if (profileError) throw profileError;

  await Promise.all([
    supabase.from('onboarding_state').delete().eq('user_id', userId),
    supabase.from('user_interests').delete().eq('user_id', userId),
    supabase.from('career_goals').delete().eq('user_id', userId),
  ]);

  return 'Onboarding reset — relaunch to re-run the flow.';
}

/**
 * Reset the passion-identity reveal flag so the animation replays.
 * Local-only — mirrors the key written by lib/revealState.ts.
 */
export async function resetReveal(userId: string): Promise<string> {
  await removeItem(`passion_identity_revealed/${userId}`);
  return 'Reveal flag cleared — animation will replay.';
}

/**
 * Reset all PathLab progress for the user. Reflections are keyed by
 * enrollment_id, so we resolve enrollments first, delete their child rows,
 * then delete the enrollments themselves.
 */
export async function resetPaths(userId: string): Promise<string> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('path_enrollments')
    .select('id')
    .eq('user_id', userId);
  if (enrollError) throw enrollError;

  const enrollmentIds = (enrollments ?? []).map((e) => e.id as string);

  if (enrollmentIds.length > 0) {
    await Promise.all([
      supabase.from('path_reflections').delete().in('enrollment_id', enrollmentIds),
      supabase.from('path_exit_reflections').delete().in('enrollment_id', enrollmentIds),
      supabase.from('path_end_reflections').delete().in('enrollment_id', enrollmentIds),
    ]);
  }

  await Promise.all([
    supabase.from('student_node_progress').delete().eq('user_id', userId),
    supabase.from('path_enrollments').delete().eq('user_id', userId),
  ]);

  return `Path progress reset — removed ${enrollmentIds.length} enrollment(s).`;
}

// Local-storage key prefixes that are safe to wipe. Auth/session keys are
// deliberately excluded so the dev stays logged in.
const CLEARABLE_KEY_PREFIXES = [
  'my-paths-cache',
  'profile-screen-cache',
  'seed-detail-cache',
  'passion_identity_revealed/',
  'ps_error_logs',
];

/**
 * Clear on-device cache + debug logs. In-memory Map caches reset on reload;
 * this clears the persisted localStorage entries. Auth session is preserved.
 */
export async function resetLocalCache(): Promise<string> {
  const keys = await getAllKeys();
  const toRemove = keys.filter((k) =>
    CLEARABLE_KEY_PREFIXES.some((p) => k.startsWith(p)),
  );
  await Promise.all(toRemove.map((k) => removeItem(k)));
  return `Cleared ${toRemove.length} local key(s) — reload to rebuild caches.`;
}

/**
 * Read (without deleting) the data a given reset target would wipe.
 * Returns a plain object suitable for JSON display in the dev modal.
 */
export async function inspectReset(
  target: ResetTarget,
  userId: string,
): Promise<unknown> {
  switch (target) {
    case 'onboarding': {
      const [profile, state, interests, careers] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_onboarded, onboarded_at')
          .eq('id', userId)
          .maybeSingle(),
        supabase.from('onboarding_state').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_interests').select('*').eq('user_id', userId),
        supabase.from('career_goals').select('*').eq('user_id', userId),
      ]);
      return {
        profile_flags: profile.data ?? null,
        onboarding_state: state.data ?? null,
        user_interests: interests.data ?? [],
        career_goals: careers.data ?? [],
      };
    }
    case 'reveal': {
      const val = await getItem(`passion_identity_revealed/${userId}`);
      return { key: `passion_identity_revealed/${userId}`, value: val };
    }
    case 'paths': {
      const { data: enrollments } = await supabase
        .from('path_enrollments')
        .select('id')
        .eq('user_id', userId);
      const enrollmentIds = (enrollments ?? []).map((e) => e.id as string);

      const [reflections, exits, ends, progress] = await Promise.all([
        enrollmentIds.length
          ? supabase.from('path_reflections').select('*').in('enrollment_id', enrollmentIds)
          : Promise.resolve({ data: [] }),
        enrollmentIds.length
          ? supabase.from('path_exit_reflections').select('*').in('enrollment_id', enrollmentIds)
          : Promise.resolve({ data: [] }),
        enrollmentIds.length
          ? supabase.from('path_end_reflections').select('*').in('enrollment_id', enrollmentIds)
          : Promise.resolve({ data: [] }),
        supabase.from('student_node_progress').select('*').eq('user_id', userId),
      ]);
      return {
        enrollments: enrollments ?? [],
        reflections: reflections.data ?? [],
        exit_reflections: exits.data ?? [],
        end_reflections: ends.data ?? [],
        node_progress: progress.data ?? [],
      };
    }
    case 'localCache': {
      const keys = await getAllKeys();
      const matched = keys.filter((k) =>
        CLEARABLE_KEY_PREFIXES.some((p) => k.startsWith(p)),
      );
      const entries: Record<string, string | null> = {};
      for (const k of matched) entries[k] = await getItem(k);
      return entries;
    }
  }
}

export async function runReset(target: ResetTarget, userId: string): Promise<string> {
  switch (target) {
    case 'onboarding':
      return resetOnboarding(userId);
    case 'reveal':
      return resetReveal(userId);
    case 'paths':
      return resetPaths(userId);
    case 'localCache':
      return resetLocalCache();
  }
}
