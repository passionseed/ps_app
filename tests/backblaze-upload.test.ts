import { beforeEach, describe, expect, it, vi } from "vitest";

describe("uploadToBackblaze", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("uploads picked web blob data directly to Backblaze without expo-file-system", async () => {
    const readAsStringAsync = vi.fn().mockRejectedValue(new Error("file-system unavailable on web"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadUrl: "https://upload.example.com/b2",
            authorizationToken: "upload-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ fileId: "file-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    vi.stubGlobal("fetch", fetchMock);
    const { Platform } = await import("react-native");
    (Platform as { OS: string }).OS = "web";
    vi.doMock("expo-file-system/legacy", () => ({
      readAsStringAsync,
      copyAsync: vi.fn(),
      cacheDirectory: "/mock/cache/",
    }));
    vi.doMock("../lib/runtime-config", () => ({
      getSupabaseRuntimeConfig: () => ({
        url: "https://supabase.example.com",
        anonKey: "anon-key",
      }),
    }));

    const { uploadToBackblaze } = await import("../lib/backblazeUpload");

    const result = await uploadToBackblaze("blob:http://localhost/image", "image.jpg", "image/jpeg");

    expect(readAsStringAsync).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "blob:http://localhost/image");
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://upload.example.com/b2",
      expect.objectContaining({
        method: "POST",
        headers: expect.not.objectContaining({
          "Content-Length": expect.any(String),
        }),
        body: expect.any(ArrayBuffer),
      })
    );
    expect(result.url).toMatch(/^https:\/\/cdn\.passionseed\.org\/file\/pseed-dev\/pretotype-/);
  });

  it("uses fetch instead of expo-file-system in a web runtime even when Platform.OS is stale", async () => {
    const readAsStringAsync = vi.fn().mockRejectedValue(new Error("file-system unavailable on web"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([4, 5, 6]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadUrl: "https://upload.example.com/b2",
            authorizationToken: "upload-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ fileId: "file-id" }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});
    const { Platform } = await import("react-native");
    (Platform as { OS: string }).OS = "ios";
    vi.doMock("expo-file-system/legacy", () => ({
      readAsStringAsync,
      copyAsync: vi.fn(),
      cacheDirectory: "/mock/cache/",
    }));
    vi.doMock("../lib/runtime-config", () => ({
      getSupabaseRuntimeConfig: () => ({
        url: "https://supabase.example.com",
        anonKey: "anon-key",
      }),
    }));

    const { uploadToBackblaze } = await import("../lib/backblazeUpload");

    await uploadToBackblaze("file://web-picked-image", "image.jpg", "image/jpeg");

    expect(readAsStringAsync).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "file://web-picked-image");
  });

  it("falls back to the B2 Edge upload proxy when browser direct upload is blocked by CORS", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([7, 8, 9]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadUrl: "https://upload.example.com/b2",
            authorizationToken: "upload-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: "https://cdn.passionseed.org/file/pseed-dev/pretotype-edge-image.jpg",
            fileName: "pretotype-edge-image.jpg",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});
    const { Platform } = await import("react-native");
    (Platform as { OS: string }).OS = "web";
    vi.doMock("../lib/runtime-config", () => ({
      getSupabaseRuntimeConfig: () => ({
        url: "https://supabase.example.com",
        anonKey: "anon-key",
      }),
    }));

    const { uploadToBackblaze } = await import("../lib/backblazeUpload");

    const result = await uploadToBackblaze("blob:http://localhost/image", "image.jpg", "image/jpeg");

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://supabase.example.com/functions/v1/b2-upload",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer anon-key",
          apikey: "anon-key",
          "Content-Type": "application/json",
        }),
      })
    );
    expect(result).toEqual({
      url: "https://cdn.passionseed.org/file/pseed-dev/pretotype-edge-image.jpg",
      fileName: "pretotype-edge-image.jpg",
    });
  });
});
