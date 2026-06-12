// lib/revealState.ts
//
// Persists whether a user has seen the passion-identity reveal animation.
// Per-user key so switching accounts doesn't bleed state between users.
// Once true, the reveal animation is skipped on return visits.
//
// Replay: the user can re-trigger the reveal via a dedicated button in
// a future update. This module just tracks the "already seen" flag.

import { getItem, setItem } from './asyncStorage';

function revealKey(userId: string): string {
  return `passion_identity_revealed/${userId}`;
}

/**
 * Returns true if the user has already seen the reveal animation.
 * Returns false on first visit or if storage read fails.
 */
export async function hasSeenReveal(userId: string): Promise<boolean> {
  try {
    const val = await getItem(revealKey(userId));
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark that the user has seen the reveal animation.
 * Fail-silent: errors are swallowed so a storage failure never breaks the UX.
 */
export async function markRevealSeen(userId: string): Promise<void> {
  try {
    await setItem(revealKey(userId), 'true');
  } catch {
    // Fail-silent
  }
}
