import { describe, expect, it, vi } from "vitest";

vi.mock("react-native-url-polyfill/auto", () => ({}));
vi.mock("../lib/runtime-config", () => ({
  getSupabaseConfigErrorMessage: () => "Missing EXPO_PUBLIC_SUPABASE_URL",
  getSupabaseRuntimeConfig: () => ({ url: "", publishableKey: "", anonKey: "" }),
}));

import { supabase } from "../lib/supabase";
import { mapTransportError } from "../lib/round/api";

describe("missing-config proxy (X5)", () => {
  it("covers rpc and surfaces unavailable through the round client", async () => {
    const response = (await supabase.rpc("shift_round_home", {})) as unknown as { data: unknown; error: { code: string; message: string }; status: number };
    expect(response.data).toBeNull();
    expect(response.error.code).toBe("CONFIG_MISSING");
    expect(mapTransportError(response.error, response.status).category).toBe("unavailable");
  });

  it("covers storage without throwing", async () => {
    const bucket = supabase.storage.from("shift-round-media");
    const upload = await bucket.upload("a/b/c/photo.jpg", new Uint8Array([1]));
    expect(upload.data).toBeNull();
    expect(upload.error).toBeTruthy();
    expect((await bucket.createSignedUrl("x", 60)).error).toBeTruthy();
  });

  it("covers the app_config read used by flags", async () => {
    const result = (await (supabase.from("app_config").select("key,value") as unknown as { like: (c: string, v: string) => Promise<{ data: unknown; error: unknown }> }).like("key", "shift_round.%"));
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
