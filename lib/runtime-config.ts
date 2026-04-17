import { captureMessage, captureException } from "./sentry";

function getEnvVar(name: string): string | undefined {
  try {
    return process.env[name];
  } catch (e) {
    captureException(e, { context: `getEnvVar(${name})` });
    return undefined;
  }
}

const runtimeConfig = {
  supabaseUrl: getEnvVar("EXPO_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: getEnvVar("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseAnonKey: getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  expoProjectId: getEnvVar("EXPO_PUBLIC_PROJECT_ID"),
} as const;

type RuntimeConfigKey = keyof typeof runtimeConfig;

const LABELS: Record<RuntimeConfigKey, string> = {
  supabaseUrl: "EXPO_PUBLIC_SUPABASE_URL",
  supabasePublishableKey: "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  supabaseAnonKey: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
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
    anonKey: runtimeConfig.supabaseAnonKey?.trim() ?? "",
  };
}

export function getSupabaseConfigErrorMessage(): string | null {
  const missing = getMissingRuntimeConfig([
    "supabaseUrl",
    "supabasePublishableKey",
  ]);

  if (missing.length === 0) return null;

  const diagnosticInfo = {
    missing,
    envVarNames: Object.keys(process.env).filter(k => k.startsWith("EXPO_PUBLIC_")),
    hasSupabaseUrl: !!runtimeConfig.supabaseUrl,
    hasSupabasePublishableKey: !!runtimeConfig.supabasePublishableKey,
    supabaseUrlValue: runtimeConfig.supabaseUrl?.substring(0, 20) || "undefined",
    publishableKeyValue: runtimeConfig.supabasePublishableKey?.substring(0, 20) || "undefined",
  };
  
  captureMessage(
    `Runtime config error: ${missing.join(", ")}`,
    "error"
  );
  captureMessage(
    `Runtime config diagnostic: ${JSON.stringify(diagnosticInfo)}`,
    "info"
  );

  return `Missing app runtime config: ${missing.join(", ")}`;
}

export function getExpoProjectId(): string | undefined {
  return runtimeConfig.expoProjectId?.trim() || undefined;
}
