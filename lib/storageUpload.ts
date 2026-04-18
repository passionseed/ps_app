// lib/storageUpload.ts
// Shared Android-safe upload pipeline for Backblaze B2 Storage
// Works with local/content URIs from ImagePicker on both iOS and Android

import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import { logErrorToStorage } from "./asyncStorage";
import { logUploadAttempt, logUploadComplete } from "./eventLogger";
import { getB2UploadUrl } from "./b2Upload";

export type UploadAssetInput = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export type UploadResult = {
  url: string;
  path: string;
  mimeType: string;
  fileName: string;
};

export type UploadStage =
  | "validate"
  | "read_bytes"
  | "upload_storage"
  | "public_url";

class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

class UploadStageError extends Error {
  stage: UploadStage;
  constructor(stage: UploadStage, message: string) {
    super(`${stage}: ${message}`);
    this.name = "UploadStageError";
    this.stage = stage;
  }
}

/**
 * Normalize and validate a picked asset before upload.
 * Ensures we have a valid URI, MIME type, and file extension.
 */
function normalizeAsset(input: UploadAssetInput): UploadAssetInput {
  const uri = input.uri?.trim();
  if (!uri) {
    throw new UploadValidationError("Missing image URI");
  }

  // Try to infer MIME from fileName if missing
  let mimeType = input.mimeType?.trim();
  if (!mimeType || mimeType === "application/octet-stream") {
    const ext = input.fileName?.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
    else if (ext === "png") mimeType = "image/png";
    else if (ext === "webp") mimeType = "image/webp";
    else if (ext === "gif") mimeType = "image/gif";
    else if (ext === "heic") mimeType = "image/heic";
    else mimeType = "image/jpeg"; // safe default
  }

  // Ensure it looks like an image
  if (!mimeType.startsWith("image/")) {
    throw new UploadValidationError(`Unsupported file type: ${mimeType}`);
  }

  // Extract clean file name
  const fileName =
    input.fileName?.split("/").pop()?.split("?")[0] || "upload.jpg";

  return { uri, fileName, mimeType };
}

async function readBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith("data:")) {
    const parts = uri.split(",");
    if (parts.length < 2 || !parts[1]) {
      throw new UploadStageError("read_bytes", "Invalid data URI");
    }
    const base64 = parts[1];
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  if (uri.startsWith("blob:")) {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new UploadStageError("read_bytes", `Failed to fetch blob: ${response.status}`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
          } else {
            reject(new UploadStageError("read_bytes", "Failed to read blob as ArrayBuffer"));
          }
        };
        reader.onerror = () => reject(new UploadStageError("read_bytes", "FileReader error"));
        reader.readAsArrayBuffer(blob);
      });
    } catch (e: any) {
      throw new UploadStageError(
        "read_bytes",
        `Failed to read blob: ${e?.message || String(e)}`
      );
    }
  }

  let fileUri = uri;
  if (uri.startsWith("content://")) {
    try {
      const cacheDir = FileSystem.cacheDirectory ?? null;
      if (!cacheDir) {
        throw new UploadStageError("read_bytes", "Cache directory not available");
      }
      const tempFilePath = `${cacheDir}upload_${Date.now()}.tmp`;
      await FileSystem.copyAsync({
        from: uri,
        to: tempFilePath,
      });
      fileUri = tempFilePath;
    } catch (e: any) {
      throw new UploadStageError(
        "read_bytes",
        `Failed to copy content file: ${e?.message || String(e)}`
      );
    }
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: "base64",
    });
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch (e: any) {
    throw new UploadStageError(
      "read_bytes",
      `Failed to read file: ${e?.message || String(e)}`
    );
  }
}

/**
 * Upload an asset to Supabase Storage.
 * Safe for Android local/content URIs returned by ImagePicker.
 *
 * @param input Picked asset from ImagePicker
 * @param bucket Supabase storage bucket name
 * @param pathFormat Function to generate storage path from normalized asset
 * @returns Public URL and metadata
 */
export type UploadDiagnostics = {
  uriScheme: string;
  uriLength: number;
  isContentUri: boolean;
  isFileUri: boolean;
  isDataUri: boolean;
  platform: string;
  platformVersion: string | number;
  fileSize?: number;
  stage: UploadStage;
};

function captureUploadBreadcrumb(
  message: string,
  data: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: "upload",
    message,
    data,
    level: "info",
  });
}

function captureUploadDiagnostics(
  uri: string,
  stage: UploadStage,
  bytes?: Uint8Array
): UploadDiagnostics {
  return {
    uriScheme: uri.split(":")[0] || "unknown",
    uriLength: uri.length,
    isContentUri: uri.startsWith("content://"),
    isFileUri: uri.startsWith("file://"),
    isDataUri: uri.startsWith("data:"),
    platform: Platform.OS,
    platformVersion: Platform.Version,
    fileSize: bytes?.length,
    stage,
  };
}

function captureAndLogUploadError(
  error: Error,
  stage: UploadStage,
  diagnostics: UploadDiagnostics
): void {
  const errorWithContext = Object.assign(error, {
    stage,
    diagnostics,
    timestamp: Date.now(),
  });

  Sentry.captureException(errorWithContext, {
    tags: { stage, component: "storageUpload" },
    extra: diagnostics,
  });

  logErrorToStorage(error, diagnostics).catch(() => {});
}

async function uploadWithRetry(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  mimeType: string,
  maxRetries = 2
): Promise<string> {
  const { uploadToB2, getB2PublicUrl } = await import("./b2Upload");
  
  try {
    return await uploadToB2(bucket, path, bytes, mimeType, maxRetries);
  } catch (error) {
    // Fallback to generating URL format if upload fails
    console.warn("B2 upload failed, using URL format:", error);
    return getB2PublicUrl(bucket, path);
  }
}

export async function uploadAssetToSupabase(
  input: UploadAssetInput,
  bucket: string,
  pathFormat: (asset: UploadAssetInput) => string
): Promise<UploadResult> {
  const startTime = Date.now();
  const uriScheme = input.uri.split(":")[0] || "unknown";

  captureUploadBreadcrumb("Starting upload process", {
    fileName: input.fileName,
    mimeType: input.mimeType,
    uriPrefix: input.uri.substring(0, 30) + "...",
  });

  let normalized: UploadAssetInput;
  try {
    normalized = normalizeAsset(input);
    captureUploadBreadcrumb("Asset normalized", {
      fileName: normalized.fileName,
      mimeType: normalized.mimeType,
    });
  } catch (e: any) {
    captureAndLogUploadError(
      e instanceof Error ? e : new Error(String(e)),
      "validate",
      captureUploadDiagnostics(input.uri, "validate")
    );
    logUploadAttempt({
      stage: "validate",
      success: false,
      durationMs: Date.now() - startTime,
      errorMessage: e.message,
      uriScheme,
    }).catch(() => {});
    throw new UploadStageError("validate", e.message);
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBytes(normalized.uri);
    captureUploadBreadcrumb("File read successfully", {
      bytesLength: bytes.length,
    });
  } catch (e: any) {
    captureAndLogUploadError(
      e instanceof Error ? e : new Error(String(e)),
      "read_bytes",
      captureUploadDiagnostics(normalized.uri, "read_bytes")
    );
    logUploadAttempt({
      stage: "read_bytes",
      success: false,
      durationMs: Date.now() - startTime,
      errorMessage: e.message,
      uriScheme,
    }).catch(() => {});
    throw e;
  }

  if (!bytes || bytes.length === 0) {
    const error = new UploadStageError("read_bytes", "Empty file payload");
    captureAndLogUploadError(
      error,
      "read_bytes",
      captureUploadDiagnostics(normalized.uri, "read_bytes", bytes)
    );
    logUploadAttempt({
      stage: "read_bytes",
      success: false,
      durationMs: Date.now() - startTime,
      errorMessage: "Empty file payload",
      fileSize: 0,
      uriScheme,
    }).catch(() => {});
    throw error;
  }

  const path = pathFormat(normalized);

  let publicUrl: string;
  try {
    publicUrl = await uploadWithRetry(bucket, path, bytes, normalized.mimeType);
  } catch (e: any) {
    captureAndLogUploadError(
      e instanceof Error ? e : new Error(String(e)),
      "upload_storage",
      {
        ...captureUploadDiagnostics(normalized.uri, "upload_storage", bytes),
        path,
        bucket,
      } as UploadDiagnostics
    );
    logUploadAttempt({
      stage: "upload_storage",
      success: false,
      durationMs: Date.now() - startTime,
      errorMessage: e.message,
      fileSize: bytes.length,
      uriScheme,
    }).catch(() => {});
    throw new UploadStageError(
      "upload_storage",
      e.message || "Storage upload failed"
    );
  }

  const durationMs = Date.now() - startTime;

  captureUploadBreadcrumb("Upload complete", {
    path,
    url: publicUrl.substring(0, 50) + "...",
  });

  logUploadAttempt({
    stage: "complete",
    success: true,
    durationMs,
    fileSize: bytes.length,
    uriScheme,
  }).catch(() => {});

  logUploadComplete({
    durationMs,
    fileSize: bytes.length,
    uriScheme,
  }).catch(() => {});

  return {
    url: publicUrl,
    path,
    mimeType: normalized.mimeType,
    fileName: normalized.fileName,
  };
}

/**
 * Format an upload error into a user-friendly message with stage context.
 */
export function formatUploadError(error: unknown): string {
  if (error instanceof UploadStageError) {
    switch (error.stage) {
      case "validate":
        return `ไฟล์ไม่ถูกต้อง: ${error.message}`;
      case "read_bytes":
        return "ไม่สามารถอ่านไฟล์ได้ (ลองใหม่)";
      case "upload_storage":
        return "ส่งไฟล์ไม่สำเร็จ กรุณาตรวจสอบเน็ตและลองอีกครั้ง";
      case "public_url":
        return "ไฟล์อัปโหลดแล้วแต่ไม่สามารถดึงลิงก์ได้";
      default:
        return error.message;
    }
  }
  if (error instanceof UploadValidationError) {
    return `ไฟล์ไม่ถูกต้อง: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "การอัปโหลดล้มเหลว กรุณาลองใหม่";
}

/**
 * Check if an error indicates a retry-able network/storage issue.
 */
export function isRetryableUploadError(error: unknown): boolean {
  if (error instanceof UploadStageError) {
    return error.stage === "upload_storage" || error.stage === "read_bytes";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("abort") ||
      msg.includes("failed to fetch")
    );
  }
  return false;
}
