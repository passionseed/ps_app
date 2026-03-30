import { useAudioPlayer, type AudioPlayer } from 'expo-audio';

// Sound instances
let npcSpeakSound: AudioPlayer | null = null;
let activityCompleteSound: AudioPlayer | null = null;

/**
 * Initialize audio system and preload sounds
 */
export async function initializeSounds() {
  try {
    // Preload sounds - handle missing files gracefully
    try {
      npcSpeakSound = useAudioPlayer(require('../assets/sounds/npc-speak.mp3'));
    } catch (error) {
      console.warn('[Sounds] npc-speak.mp3 not found - see assets/sounds/README.md');
    }

    try {
      activityCompleteSound = useAudioPlayer(require('../assets/sounds/activity-complete.mp3'));
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
      await npcSpeakSound.play();
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
      await activityCompleteSound.play();
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
      npcSpeakSound.remove();
      npcSpeakSound = null;
    }
    if (activityCompleteSound) {
      activityCompleteSound.remove();
      activityCompleteSound = null;
    }
    console.log('[Sounds] Cleaned up successfully');
  } catch (error) {
    console.error('[Sounds] Failed to cleanup:', error);
  }
}
