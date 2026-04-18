import Constants from "expo-constants";

/**
 * Get environment variable from Expo Constants.
 * EAS env vars are build-time only; we embed them in app.config.js extra field
 * to make them available at runtime via Constants.expoConfig.extra.
 */
function getEnvVar(name: string): string | undefined {
  try {
    const extra = (Constants.expoConfig as any)?.extra;
    const value = extra?.[name];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

const runtimeConfig = {
  supabaseUrl: getEnvVar("supabaseUrl"),
  supabasePublishableKey: getEnvVar("supabasePublishableKey"),
  supabaseAnonKey: getEnvVar("supabaseAnonKey"),
  expoProjectId: (Constants.expoConfig as any)?.extra?.eas?.projectId,
} as const;

type RuntimeConfigKey = keyof typeof runtimeConfig;

const LABELS: Record<RuntimeConfigKey, string> = {
  supabaseUrl: "supabaseUrl",
  supabasePublishableKey: "supabasePublishableKey",
  supabaseAnonKey: "supabaseAnonKey",
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
    url: runtimeConfig.supabaseUrl?.trim() ?? "",
    publishableKey: runtimeConfig.supabasePublishableKey?.trim() ?? "",
    anonKey: runtimeConfig.supabaseAnonKey?.trim() ?? "",
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
