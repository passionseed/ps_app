import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { getSupabaseRuntimeConfig } from "./runtime-config";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseRuntimeConfig();

function bytesFromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function isWebRuntime(): boolean {
  return Platform.OS === "web" || (typeof window !== "undefined" && typeof document !== "undefined");
}

async function readFetchableUriBytes(uri: string): Promise<Uint8Array> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to read upload file: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith("data:")) {
    const parts = uri.split(",");
    if (parts.length < 2 || !parts[1]) {
      throw new Error("Invalid data URI");
    }
    return bytesFromBase64(parts[1]);
  }

  if (isWebRuntime() || uri.startsWith("blob:") || uri.startsWith("http://") || uri.startsWith("https://")) {
    return readFetchableUriBytes(uri);
  }

  let fileUri = uri;
  if (uri.startsWith("content://")) {
    const cacheDir = FileSystem.cacheDirectory ?? null;
    if (!cacheDir) throw new Error("Cache directory not available");
    const tempFilePath = `${cacheDir}upload_${Date.now()}.tmp`;
    await FileSystem.copyAsync({ from: uri, to: tempFilePath });
    fileUri = tempFilePath;
  }

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: "base64",
  });
  return bytesFromBase64(base64);
}

export interface BackblazeUploadResult {
  url: string;
  fileName: string;
}

export async function uploadToBackblaze(
  uri: string,
  fileName: string,
  mimeType: string
): Promise<BackblazeUploadResult> {
  try {
    const bytes = await readFileBytes(uri);
    const uniqueFileName = `pretotype-${Date.now()}-${fileName}`;

    const urlResponse = await fetch(`${SUPABASE_URL}/functions/v1/b2-upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!urlResponse.ok) {
      const errorData = await urlResponse.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Failed to get upload URL: ${urlResponse.status}`);
    }

    const { uploadUrl, authorizationToken } = await urlResponse.json();

    const arrayBuffer = new Uint8Array(bytes).buffer as ArrayBuffer;

    let response: Response;
    try {
      response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: authorizationToken,
          "X-Bz-File-Name": encodeURIComponent(uniqueFileName),
          "Content-Type": mimeType,
          "X-Bz-Content-Sha1": "do_not_verify",
        },
        body: arrayBuffer,
      });
    } catch (e) {
      if (!isWebRuntime()) throw e;
      const fallbackResponse = await fetch(`${SUPABASE_URL}/functions/v1/b2-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          fileName,
          mimeType,
          base64Data: bytesToBase64(bytes),
        }),
      });

      if (!fallbackResponse.ok) {
        const errorData = await fallbackResponse.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `B2 Edge upload failed: ${fallbackResponse.status}`);
      }

      return fallbackResponse.json();
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`B2 upload failed: ${response.status} ${errorText}`);
    }

    const B2_BUCKET = process.env.EXPO_PUBLIC_B2_BUCKET_NAME ?? "pseed-dev";
    const CDN_DOMAIN = process.env.EXPO_PUBLIC_CLOUDFLARE_DOMAIN ?? "cdn.passionseed.org";
    const cdnUrl = `https://${CDN_DOMAIN}/file/${B2_BUCKET}/${encodeURIComponent(uniqueFileName)}`;

    return {
      url: cdnUrl,
      fileName: uniqueFileName,
    };
  } catch (e) {
    console.error("Backblaze upload error:", e);
    throw e;
  }
}

export function getBackblazePublicUrl(fileName: string): string {
  const B2_BUCKET = process.env.EXPO_PUBLIC_B2_BUCKET_NAME ?? "pseed-dev";
  const CDN_DOMAIN = process.env.EXPO_PUBLIC_CLOUDFLARE_DOMAIN ?? "cdn.passionseed.org";
  return `https://${CDN_DOMAIN}/file/${B2_BUCKET}/${encodeURIComponent(fileName)}`;
}
