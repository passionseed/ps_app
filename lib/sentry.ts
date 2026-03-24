import * as Sentry from "@sentry/react-native";
import type { ReactNativeOptions } from "@sentry/react-native";

const SENTRY_DSN =
  "https://7b4ad4da49242478ad4aef96a6dd2a41@o4511084030328832.ingest.us.sentry.io/4511089087873024";

let didInitializeSentry = false;

export function getSentryInitOptions({
  isDev = __DEV__,
}: {
  isDev?: boolean;
} = {}): ReactNativeOptions {
  return {
    dsn: SENTRY_DSN,
    sendDefaultPii: true,
    enableLogs: isDev,
  };
}

export function initializeSentry() {
  if (didInitializeSentry) {
    return;
  }

  Sentry.init(getSentryInitOptions());
  didInitializeSentry = true;
}
