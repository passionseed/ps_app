/**
 * Get environment variable from process.env.
 * EXPO_PUBLIC_* vars are automatically available at runtime on all platforms
 * (web, iOS, Android) when prefixed with EXPO_PUBLIC_.
 */
function getEnvVar(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" ? value : undefined;
}

const runtimeConfig = {
  supabaseUrl: getEnvVar("EXPO_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: getEnvVar("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  expoProjectId: getEnvVar("EXPO_PUBLIC_PROJECT_ID"),
} as const;

type RuntimeConfigKey = keyof typeof runtimeConfig;

const LABELS: Record<RuntimeConfigKey, string> = {
  supabaseUrl: "supabaseUrl",
  supabasePublishableKey: "supabasePublishableKey",
  expoProjectId: "eas.projectId",
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
    url: runtimeConfig.supabaseUrl?.trim().replace(/\/$/, "") ?? "",
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
