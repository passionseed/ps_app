// Web stub for expo-audio - no-op on web
export interface AudioPlayer {
  play(): Promise<void>;
  remove(): void;
}

// No-op hook for web
export function useAudioPlayer(): AudioPlayer {
  return {
    play: async () => { /* No-op on web */ },
    remove: () => { /* No-op on web */ },
  };
}
