import { Platform } from 'react-native';
import { supabase } from './supabase';

let Notifications: typeof import("expo-notifications") | null = null;
if (Platform.OS !== "web") {
  try {
    Notifications = require("expo-notifications");
  } catch {
    Notifications = null;
  }
}

export async function registerPushToken(participantId: string): Promise<void> {
  if (!Notifications) {
    return;
  }

  let pushToken: string;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    pushToken = tokenData.data;
  } catch (error) {
    console.warn("[hackathonPushTokens] Push token not available:", error);
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
