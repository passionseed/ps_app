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
  b2ApplicationKeyId: getEnvVar("b2ApplicationKeyId"),
  b2ApplicationKey: getEnvVar("b2ApplicationKey"),
  b2BucketName: getEnvVar("b2BucketName"),
  b2BucketId: getEnvVar("b2BucketId"),
  b2Endpoint: getEnvVar("b2Endpoint"),
  cloudflareDomain: getEnvVar("cloudflareDomain"),
  expoProjectId: (Constants.expoConfig as any)?.extra?.eas?.projectId,
} as const;

type RuntimeConfigKey = keyof typeof runtimeConfig;

const LABELS: Record<RuntimeConfigKey, string> = {
  supabaseUrl: "supabaseUrl",
  supabasePublishableKey: "supabasePublishableKey",
  supabaseAnonKey: "supabaseAnonKey",
  b2ApplicationKeyId: "b2ApplicationKeyId",
  b2ApplicationKey: "b2ApplicationKey",
  b2BucketName: "b2BucketName",
  b2BucketId: "b2BucketId",
  b2Endpoint: "b2Endpoint",
  cloudflareDomain: "cloudflareDomain",
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

export function getBackblazeConfig() {
  return {
    applicationKeyId: runtimeConfig.b2ApplicationKeyId?.trim() ?? "",
    applicationKey: runtimeConfig.b2ApplicationKey?.trim() ?? "",
    bucketName: runtimeConfig.b2BucketName?.trim() ?? "pseed-dev",
    bucketId: runtimeConfig.b2BucketId?.trim() ?? "",
    endpoint: runtimeConfig.b2Endpoint?.trim() ?? "s3.us-east-005.backblazeb2.com",
    cdnDomain: runtimeConfig.cloudflareDomain?.trim() ?? "cdn.passionseed.org",
  };
}
