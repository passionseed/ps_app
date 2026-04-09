import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Register or update a push token for a hackathon participant.
 * Call this when participant logs in or on app initialization.
 *
 * Gracefully handles the case where Firebase is not initialized on Android
 * (e.g. missing google-services.json) by returning early.
 *
 * @param participantId - The ID of the hackathon participant
 * @throws Error if Supabase operation fails
 */
export async function registerPushToken(participantId: string): Promise<void> {
  // Get Expo push token
  let pushToken: string;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    pushToken = tokenData.data;
  } catch (error) {
    // Push token not available (e.g., on web, simulator, or Firebase not initialized)
    console.warn('[hackathonPushTokens] Push token not available:', error);
    return;
  }

  // Determine platform
  const platform = Platform.OS as 'ios' | 'android' | 'web';

  // Upsert to database
  const { error } = await supabase
    .from('hackathon_participant_push_tokens')
    .upsert(
      {
        participant_id: participantId,
        push_token: pushToken,
        platform: platform,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'push_token',
      }
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
