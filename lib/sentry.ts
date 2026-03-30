import * as Sentry from "@sentry/react-native";
import type { ReactNativeOptions } from "@sentry/react-native";

const SENTRY_DSN =
  "https://7b4ad4da49242478ad4aef96a6dd2a41@o4511084030328832.ingest.us.sentry.io/4511089087873024";
const DEFAULT_IS_DEV = typeof __DEV__ !== "undefined" ? __DEV__ : false;

type ExpoConstantsLike = {
  expoConfig?: {
    version?: string;
    ios?: {
      bundleIdentifier?: string;
    };
    android?: {
      package?: string;
    };
    slug?: string;
  };
};

type ExpoUpdatesLike = {
  channel?: string | null;
  runtimeVersion?: string | null;
  updateId?: string | null;
  nativeBuildVersion?: string | null;
};

export type SentryRuntimeContext = {
  isDev?: boolean;
  environment?: string;
  release?: string;
  dist?: string;
  updateId?: string | null;
  channel?: string | null;
  runtimeVersion?: string | null;
};

let didInitializeSentry = false;

export function getSentryInitOptions({
  isDev = DEFAULT_IS_DEV,
  environment,
  release,
  dist,
}: SentryRuntimeContext = {}): ReactNativeOptions {
  return {
    dsn: SENTRY_DSN,
    environment,
    release,
    dist,
    sendDefaultPii: true,
    enableLogs: isDev,
    enableAutoPerformanceTracing: true,
    enableAppStartTracking: true,
    enableNativeFramesTracking: true,
    tracesSampleRate: isDev ? 1 : 0.2,
    profilesSampleRate: isDev ? 1 : 0.2,
  };
}

export function getSentryRuntimeContext({
  isDev = DEFAULT_IS_DEV,
  constants,
  updates,
}: SentryRuntimeContext & {
  constants?: ExpoConstantsLike;
  updates?: ExpoUpdatesLike;
} = {}): SentryRuntimeContext {
  const resolvedConstants =
    constants ??
    (require("expo-constants").default as ExpoConstantsLike | undefined);
  const resolvedUpdates =
    updates ?? (require("expo-updates") as ExpoUpdatesLike | undefined);
  const expoConfig = resolvedConstants?.expoConfig;
  const appVersion = expoConfig?.version?.trim();
  const nativeBuildVersion = resolvedUpdates?.nativeBuildVersion?.trim();
  const appIdentifier =
    expoConfig?.ios?.bundleIdentifier?.trim() ||
    expoConfig?.android?.package?.trim() ||
    expoConfig?.slug?.trim();
  const channel = resolvedUpdates?.channel?.trim() || null;
  const runtimeVersion = resolvedUpdates?.runtimeVersion?.trim() || null;
  const updateId = resolvedUpdates?.updateId?.trim() || null;

  return {
    environment: channel || (isDev ? "development" : "production"),
    release:
      appIdentifier && appVersion && nativeBuildVersion
        ? `${appIdentifier}@${appVersion}+${nativeBuildVersion}`
        : undefined,
    dist: nativeBuildVersion || undefined,
    updateId,
    channel,
    runtimeVersion,
  };
}

function annotateSentryRuntime({
  channel,
  runtimeVersion,
  updateId,
}: SentryRuntimeContext) {
  const tags = {
    ...(channel ? { "expo.channel": channel } : {}),
    ...(runtimeVersion ? { "expo.runtime_version": runtimeVersion } : {}),
    ...(updateId ? { "expo.update_id": updateId } : {}),
  };

  if (Object.keys(tags).length > 0) {
    Sentry.setTags(tags);
  }

  Sentry.setContext("expo-updates", {
    channel: channel ?? "unknown",
    runtimeVersion: runtimeVersion ?? "unknown",
    updateId: updateId ?? "embedded",
  });
}

export function initializeSentry(
  runtimeContext: SentryRuntimeContext = getSentryRuntimeContext(),
) {
  if (didInitializeSentry) {
    return;
  }

  Sentry.init(getSentryInitOptions(runtimeContext));
  annotateSentryRuntime(runtimeContext);
  didInitializeSentry = true;
}
