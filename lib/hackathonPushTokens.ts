import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getExistingPushToken, requestPushPermissions } from './notifications';

/** Check if a participant already has at least one push token saved. */
export async function hasParticipantPushToken(participantId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('hackathon_participant_push_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('participant_id', participantId);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function registerPushToken(participantId: string): Promise<void> {
  let pushToken: string | null;
  try {
    pushToken = await getExistingPushToken();
  } catch (error) {
    console.warn("[hackathonPushTokens] Push token not available:", error);
    return;
  }

  if (!pushToken) {
    return;
  }

  await savePushTokenForParticipant(participantId, pushToken);
}

/** Request permission, get token, and save it. Returns the token or null. */
export async function requestAndRegisterPushToken(participantId: string): Promise<string | null> {
  const pushToken = await requestPushPermissions();
  if (!pushToken) return null;
  await savePushTokenForParticipant(participantId, pushToken);
  return pushToken;
}

async function savePushTokenForParticipant(participantId: string, pushToken: string): Promise<void> {
  const platform = Platform.OS as 'ios' | 'android' | 'web';
  const { error } = await supabase
    .from('hackathon_participant_push_tokens')
    .upsert(
      {
        participant_id: participantId,
        push_token: pushToken,
        platform,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'push_token' },
    );
  if (error) throw error;
}

/**
 * Update the last_used_at timestamp for a participant's push token(s).
 * Call this periodically (e.g., on app open) to track active tokens.
 *
 * @param participantId - The ID of the hackathon participant
 * @throws Error if Supabase operation fails
 */
export async function updatePushTokenLastUsed(participantId: string): Promise<void> {
  const { error } = await supabase
    .from('hackathon_participant_push_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('participant_id', participantId);

  if (error) throw error;
}

/**
 * Remove a push token from the database.
 * Call this on logout or when cleaning up invalid tokens.
 *
 * @param pushToken - The Expo push token to remove
 * @throws Error if Supabase operation fails
 */
export async function removePushToken(pushToken: string): Promise<void> {
  const { error } = await supabase
    .from('hackathon_participant_push_tokens')
    .delete()
    .eq('push_token', pushToken);

  if (error) throw error;
}
