import { Platform } from "react-native";

let audioModule: typeof import("expo-audio") | null = null;
if (Platform.OS !== "web") {
  try {
    audioModule = require("expo-audio");
  } catch {
    audioModule = null;
  }
}

type AudioPlayer = {
  play(): Promise<void>;
  remove(): void;
};

let npcSpeakSound: AudioPlayer | null = null;
let activityCompleteSound: AudioPlayer | null = null;

export async function initializeSounds() {
  if (!audioModule || Platform.OS === "web") {
    return;
  }

  try {
    const { useAudioPlayer } = audioModule;
    try {
      npcSpeakSound = useAudioPlayer(require("../assets/sounds/npc-speak.mp3"));
    } catch {
      console.warn("[Sounds] npc-speak.mp3 not found - see assets/sounds/README.md");
    }

    try {
      activityCompleteSound = useAudioPlayer(require("../assets/sounds/activity-complete.mp3"));
    } catch {
      console.warn("[Sounds] activity-complete.mp3 not found - see assets/sounds/README.md");
    }

    console.log("[Sounds] Initialized successfully");
  } catch (error) {
    console.error("[Sounds] Failed to initialize audio system:", error);
  }
}

export async function playNPCSpeakSound() {
  if (Platform.OS === "web" || !npcSpeakSound) {
    return;
  }

  try {
    await npcSpeakSound.play();
  } catch (error) {
    console.error("[Sounds] Failed to play NPC speak sound:", error);
  }
}

export async function playActivityCompleteSound() {
  if (Platform.OS === "web" || !activityCompleteSound) {
    return;
  }

  try {
    await activityCompleteSound.play();
  } catch (error) {
    console.error("[Sounds] Failed to play activity complete sound:", error);
  }
}

export async function cleanupSounds() {
  if (Platform.OS === "web") {
    return;
  }

  try {
    if (npcSpeakSound) {
      npcSpeakSound.remove();
      npcSpeakSound = null;
    }
    if (activityCompleteSound) {
      activityCompleteSound.remove();
      activityCompleteSound = null;
    }
    console.log("[Sounds] Cleaned up successfully");
  } catch (error) {
    console.error("[Sounds] Failed to cleanup:", error);
  }
}
