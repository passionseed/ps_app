const runtimeConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  expoProjectId: process.env.EXPO_PUBLIC_PROJECT_ID,
} as const;

type RuntimeConfigKey = keyof typeof runtimeConfig;

const LABELS: Record<RuntimeConfigKey, string> = {
  supabaseUrl: "EXPO_PUBLIC_SUPABASE_URL",
  supabasePublishableKey: "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  expoProjectId: "EXPO_PUBLIC_PROJECT_ID",
};

export function getMissingRuntimeConfig(
  keys: RuntimeConfigKey[],
): string[] {
  return keys
    .filter((key) => {
      const val = runtimeConfig[key]?.trim();
      return !val || (val.startsWith("${") && val.endsWith("}"));
    })
    .map((key) => LABELS[key]);
}

export function getSupabaseRuntimeConfig() {
  return {
    url: runtimeConfig.supabaseUrl?.trim() ?? "",
    publishableKey: runtimeConfig.supabasePublishableKey?.trim() ?? "",
  };
}

export function getSupabaseConfigErrorMessage(): string | null {
  const missing = getMissingRuntimeConfig([
    "supabaseUrl",
    "supabasePublishableKey",
  ]);

  if (missing.length === 0) return null;

  return `Missing app runtime config: ${missing.join(", ")}`;
}

export function getExpoProjectId(): string | undefined {
  return runtimeConfig.expoProjectId?.trim() || undefined;
}

export function isEnrollmentResetEnabled(): boolean {
  const overrideFlag =
    process.env.EXPO_PUBLIC_ENABLE_ENROLLMENT_RESET?.trim().toLowerCase() ===
    "true";
  const isDevRuntime = typeof __DEV__ !== "undefined" ? __DEV__ : false;
  return isDevRuntime || overrideFlag;
}
