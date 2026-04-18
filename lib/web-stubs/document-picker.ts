// Web stub for expo-document-picker - no-op on web
export type DocumentPickerType = "all" | "audio" | "images" | "plainText" | "pdf" | "video";

export interface DocumentPickerOptions {
  type?: DocumentPickerType[] | string;
  copyToCacheDirectory?: boolean;
  multiple?: boolean;
}

export interface DocumentPickerResult {
  canceled: boolean;
  assets?: Array<{
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
  }>;
}

// Mock function for web
export async function getDocumentAsync(options?: DocumentPickerOptions): Promise<DocumentPickerResult> {
  void options;
  // On web, we could implement file input, but for now return canceled
  console.warn("[DocumentPicker] Document picker not fully implemented for web");
  return { canceled: true };
}
