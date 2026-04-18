// Web stub for expo-image-picker - no-op on web
export type MediaType = "images" | "videos" | "all";

export interface ImagePickerOptions {
  mediaTypes?: MediaType[];
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  base64?: boolean;
  exif?: boolean;
}

export interface ImagePickerResult {
  canceled: boolean;
  assets?: Array<{
    uri: string;
    width: number;
    height: number;
    type?: "image" | "video";
    fileName?: string;
    fileSize?: number;
    base64?: string;
    exif?: Record<string, any>;
  }>;
}

// Mock function for web
export async function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult> {
  void options;
  // On web, we could implement file input, but for now return canceled
  console.warn("[ImagePicker] Image picker not fully implemented for web");
  return { canceled: true };
}

export async function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult> {
  void options;
  console.warn("[ImagePicker] Camera not available on web");
  return { canceled: true };
}

export async function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }> {
  return { granted: false };
}

export async function requestCameraPermissionsAsync(): Promise<{ granted: boolean }> {
  return { granted: false };
}
