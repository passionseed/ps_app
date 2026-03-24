import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/react-native", () => ({
  init: vi.fn(),
}));

async function loadSentryModule() {
  vi.resetModules();
  return import("../lib/sentry");
}

describe("sentry startup config", () => {
  it("uses a minimal production-safe init profile by default", async () => {
    const mod = await loadSentryModule();

    expect(mod.getSentryInitOptions({ isDev: false })).toEqual({
      dsn: "https://7b4ad4da49242478ad4aef96a6dd2a41@o4511084030328832.ingest.us.sentry.io/4511089087873024",
      sendDefaultPii: true,
      enableLogs: false,
    });
  });

  it("enables sentry logs in development only", async () => {
    const mod = await loadSentryModule();

    expect(mod.getSentryInitOptions({ isDev: true }).enableLogs).toBe(true);
    expect(mod.getSentryInitOptions({ isDev: false }).enableLogs).toBe(false);
  });
});
