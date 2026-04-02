import { describe, expect, it, vi } from "vitest";

async function loadRuntimeConfigModule(env: Record<string, string | undefined>) {
  vi.resetModules();

  for (const key of [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "EXPO_PUBLIC_PROJECT_ID",
  ]) {
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }

  return import("../lib/runtime-config");
}

describe("runtime config", () => {
  it("reports missing supabase config clearly", async () => {
    const mod = await loadRuntimeConfigModule({
      EXPO_PUBLIC_SUPABASE_URL: undefined,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
    });

    expect(mod.getSupabaseConfigErrorMessage()).toBe(
      "Missing app runtime config: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("returns trimmed supabase config when present", async () => {
    const mod = await loadRuntimeConfigModule({
      EXPO_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " public-anon-key ",
      EXPO_PUBLIC_PROJECT_ID: " project-id ",
    });

    expect(mod.getSupabaseConfigErrorMessage()).toBeNull();
    expect(mod.getSupabaseRuntimeConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "public-anon-key",
      anonKey: "",
    });
    expect(mod.getExpoProjectId()).toBe("project-id");
  });
});
