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

function encodeB2FileName(fileName: string): string {
  return fileName.split("/").map(encodeURIComponent).join("/");
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

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
  };
  return map[mimeType] || "jpg";
}

function ensureExtension(fileName: string, mimeType: string): string {
  const ext = getExtensionFromMimeType(mimeType);
  const hasExt = /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(fileName);
  return hasExt ? fileName : `${fileName}.${ext}`;
}

export async function uploadToBackblaze(
  uri: string,
  fileName: string,
  mimeType: string,
  teamId?: string
): Promise<BackblazeUploadResult> {
  try {
    console.log("[backblazeUpload] Starting upload...", { uri: uri.substring(0, 50) + "...", fileName, mimeType, teamId });
    const bytes = await readFileBytes(uri);
    console.log("[backblazeUpload] Read file bytes:", bytes.length, "bytes");
    const safeFileName = ensureExtension(fileName, mimeType);
    const pathPrefix = teamId ? `hackathon/phase-3/${teamId}/pretotype/` : "pretotype/";
    const uniqueFileName = `${pathPrefix}pretotype-${Date.now()}-${safeFileName}`;
    console.log("[backblazeUpload] Generated filename:", uniqueFileName);

    console.log("[backblazeUpload] Requesting upload URL from edge function...");
    const urlResponse = await fetch(`${SUPABASE_URL}/functions/v1/b2-upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });

    console.log("[backblazeUpload] Upload URL response status:", urlResponse.status);
    if (!urlResponse.ok) {
      const errorData = await urlResponse.json().catch(() => ({ error: "Unknown error" }));
      console.error("[backblazeUpload] Failed to get upload URL:", errorData);
      throw new Error(errorData.error || `Failed to get upload URL: ${urlResponse.status}`);
    }

    const { uploadUrl, authorizationToken } = await urlResponse.json();
    console.log("[backblazeUpload] Got upload URL:", uploadUrl?.substring(0, 60) + "...");

    const arrayBuffer = new Uint8Array(bytes).buffer as ArrayBuffer;

    console.log("[backblazeUpload] Uploading to B2 directly...");
    let response: Response;
    try {
      response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: authorizationToken,
          "X-Bz-File-Name": encodeB2FileName(uniqueFileName),
          "Content-Type": mimeType,
          "X-Bz-Content-Sha1": "do_not_verify",
        },
        body: arrayBuffer,
      });
      console.log("[backblazeUpload] B2 direct upload response:", response.status);
    } catch (e) {
      console.log("[backblazeUpload] Direct upload failed, trying fallback...", e);
      if (!isWebRuntime()) throw e;
      console.log("[backblazeUpload] Using edge function fallback upload...");
      const fallbackResponse = await fetch(`${SUPABASE_URL}/functions/v1/b2-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          fileName: uniqueFileName,
          mimeType,
          base64Data: bytesToBase64(bytes),
        }),
      });

      console.log("[backblazeUpload] Fallback response:", fallbackResponse.status);
      if (!fallbackResponse.ok) {
        const errorData = await fallbackResponse.json().catch(() => ({ error: "Unknown error" }));
        console.error("[backblazeUpload] Fallback failed:", errorData);
        throw new Error(errorData.error || `B2 Edge upload failed: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      console.log("[backblazeUpload] Fallback success! URL:", fallbackData.url);
      return fallbackData;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[backblazeUpload] B2 upload failed:", response.status, errorText);
      throw new Error(`B2 upload failed: ${response.status} ${errorText}`);
    }

    const cdnUrl = `https://cdn.passionseed.org/${uniqueFileName}`;
    console.log("[backblazeUpload] Upload complete! CDN URL:", cdnUrl);

    return {
      url: cdnUrl,
      fileName: uniqueFileName,
    };
  } catch (e) {
    console.error("[backblazeUpload] Fatal error:", e);
    throw e;
  }
}

export function getBackblazePublicUrl(fileName: string): string {
  return `https://cdn.passionseed.org/${fileName}`;
}
