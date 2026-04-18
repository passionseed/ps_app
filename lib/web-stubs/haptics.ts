// Web stub for expo-haptics - no-op on web
export enum ImpactFeedbackStyle {
  Light = "light",
  Medium = "medium",
  Heavy = "heavy",
}

export enum NotificationFeedbackType {
  Success = "success",
  Warning = "warning",
  Error = "error",
}

// No-op functions for web
export async function impactAsync(style?: ImpactFeedbackStyle): Promise<void> {
  // Haptics not available on web
  void style;
}

export async function notificationAsync(type?: NotificationFeedbackType): Promise<void> {
  // Haptics not available on web
  void type;
}

export async function selectionAsync(): Promise<void> {
  // Haptics not available on web
}
