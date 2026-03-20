import { Audio } from 'expo-audio';

// Sound instances
let npcSpeakSound: Audio.Sound | null = null;
let activityCompleteSound: Audio.Sound | null = null;

/**
 * Initialize audio system and preload sounds
 */
export async function initializeSounds() {
  try {
    // Preload sounds - handle missing files gracefully
    try {
      npcSpeakSound = await Audio.Sound.createAsync(
        require('../assets/sounds/npc-speak.mp3')
      );
    } catch (error) {
      console.warn('[Sounds] npc-speak.mp3 not found - see assets/sounds/README.md');
    }

    try {
      activityCompleteSound = await Audio.Sound.createAsync(
        require('../assets/sounds/activity-complete.mp3')
      );
    } catch (error) {
      console.warn('[Sounds] activity-complete.mp3 not found - see assets/sounds/README.md');
    }

    console.log('[Sounds] Initialized successfully');
  } catch (error) {
    console.error('[Sounds] Failed to initialize audio system:', error);
  }
}

/**
 * Play sound when NPC starts speaking
 */
export async function playNPCSpeakSound() {
  try {
    if (npcSpeakSound) {
      await npcSpeakSound.replayAsync();
    }
  } catch (error) {
    console.error('[Sounds] Failed to play NPC speak sound:', error);
  }
}

/**
 * Play sound when activity is completed
 */
export async function playActivityCompleteSound() {
  try {
    if (activityCompleteSound) {
      await activityCompleteSound.replayAsync();
    }
  } catch (error) {
    console.error('[Sounds] Failed to play activity complete sound:', error);
  }
}

/**
 * Cleanup sound resources
 */
export async function cleanupSounds() {
  try {
    if (npcSpeakSound) {
      await npcSpeakSound.unloadAsync();
      npcSpeakSound = null;
    }
    if (activityCompleteSound) {
      await activityCompleteSound.unloadAsync();
      activityCompleteSound = null;
    }
    console.log('[Sounds] Cleaned up successfully');
  } catch (error) {
    console.error('[Sounds] Failed to cleanup:', error);
  }
}
