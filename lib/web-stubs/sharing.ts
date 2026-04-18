// Web stub for expo-sharing - no-op on web
export interface SharingOptions {
  dialogTitle?: string;
  UTI?: string;
  mimeType?: string;
}

// No-op function for web
export async function shareAsync(url: string, options?: SharingOptions): Promise<void> {
  // On web, we could use the Web Share API, but for now just no-op
  void url;
  void options;
  console.warn("[Sharing] Share not implemented for web");
}

export async function isAvailableAsync(): Promise<boolean> {
  // Check if Web Share API is available
  return typeof navigator !== "undefined" && "share" in navigator;
}
