import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/react-native", () => ({
  init: vi.fn(),
  setContext: vi.fn(),
  setTags: vi.fn(),
}));

async function loadSentryModule() {
  vi.resetModules();
  return import("../lib/sentry");
}

describe("sentry startup config", () => {
  it("uses a production-safe monitoring profile with release metadata", async () => {
    const mod = await loadSentryModule();

    const opts = mod.getSentryInitOptions({
      isDev: false,
      environment: "production",
      release: "com.passionseed.app@1.0.4+42",
      dist: "42",
    });

    expect(opts).toMatchObject({
      dsn: "https://7b4ad4da49242478ad4aef96a6dd2a41@o4511084030328832.ingest.us.sentry.io/4511089087873024",
      environment: "production",
      release: "com.passionseed.app@1.0.4+42",
      dist: "42",
      sendDefaultPii: true,
      enableLogs: false,
      enableAutoPerformanceTracing: true,
      enableAppStartTracking: true,
      enableNativeFramesTracking: true,
      attachStacktrace: true,
      enableCaptureFailedRequests: true,
      tracesSampleRate: 0.2,
      profilesSampleRate: 0.2,
    });
    expect(opts.beforeSend).toBeTypeOf("function");
    expect(opts.integrations).toBeTypeOf("function");
  });

  it("uses full sampling and logs during development", async () => {
    const mod = await loadSentryModule();

    expect(
      mod.getSentryInitOptions({
        isDev: true,
        environment: "development",
      }),
    ).toMatchObject({
      environment: "development",
      enableLogs: true,
      tracesSampleRate: 1,
      profilesSampleRate: 1,
    });
  });

  it("derives Expo release context and annotates the runtime", async () => {
    const mod = await loadSentryModule();
    const Sentry = await import("@sentry/react-native");

    expect(
      mod.getSentryRuntimeContext({
        constants: {
          expoConfig: {
            version: "1.0.4",
            ios: { bundleIdentifier: "com.passionseed.app" },
          },
        },
        updates: {
          channel: "production",
          runtimeVersion: "1.0.4",
          updateId: "update-123",
          nativeBuildVersion: "42",
        },
      }),
    ).toEqual({
      environment: "production",
      release: "com.passionseed.app@1.0.4+42",
      dist: "42",
      updateId: "update-123",
      channel: "production",
      runtimeVersion: "1.0.4",
    });

    mod.initializeSentry({
      isDev: false,
      environment: "preview",
      release: "com.passionseed.app@1.0.4+43",
      dist: "43",
      channel: "preview",
      runtimeVersion: "1.0.4",
      updateId: "update-456",
    });

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "preview",
        release: "com.passionseed.app@1.0.4+43",
        dist: "43",
      }),
    );
    expect(Sentry.setTags).toHaveBeenCalledWith({
      "expo.channel": "preview",
      "expo.runtime_version": "1.0.4",
      "expo.update_id": "update-456",
    });
    expect(Sentry.setContext).toHaveBeenCalledWith("expo-updates", {
      channel: "preview",
      runtimeVersion: "1.0.4",
      updateId: "update-456",
    });
  });
});
