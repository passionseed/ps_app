// lib/storageUpload.ts
// Shared Android-safe upload pipeline for Supabase Storage
// Works with local/content URIs from ImagePicker on both iOS and Android

import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";

export type UploadAssetInput = {
  uri: string;
  fileName: string;
  mimeType?: string;
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

/**
 * Read file bytes safely using Expo FileSystem.
 * Avoids fetch(uri).arrayBuffer() which fails on Android for local/content URIs.
 */
async function readBytes(uri: string): Promise<Uint8Array> {
  // For data URIs, decode directly
  if (uri.startsWith("data:")) {
    const parts = uri.split(",");
    if (parts.length < 2 || !parts[1]) {
      throw new UploadStageError("read_bytes", "Invalid data URI");
    }
    const base64 = parts[1];
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  // For file:// URIs and content:// URIs on Android, use expo-file-system
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
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
export async function uploadAssetToSupabase(
  input: UploadAssetInput,
  bucket: string,
  pathFormat: (asset: UploadAssetInput) => string
): Promise<UploadResult> {
  // 1. Validate and normalize
  let normalized: UploadAssetInput;
  try {
    normalized = normalizeAsset(input);
  } catch (e: any) {
    throw new UploadStageError("validate", e.message);
  }

  // 2. Read bytes
  let bytes: Uint8Array;
  try {
    bytes = await readBytes(normalized.uri);
  } catch (e: any) {
    throw e; // Already wrapped
  }

  if (!bytes || bytes.length === 0) {
    throw new UploadStageError("read_bytes", "Empty file payload");
  }

  // 3. Upload to storage
  const path = pathFormat(normalized);
  let uploadError: Error | null = null;
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: normalized.mimeType,
        upsert: true,
      });
    if (error) uploadError = new Error(error.message);
  } catch (e: any) {
    uploadError = e;
  }

  if (uploadError) {
    throw new UploadStageError(
      "upload_storage",
      uploadError.message || "Storage upload failed"
    );
  }

  // 4. Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!urlData?.publicUrl) {
    throw new UploadStageError("public_url", "Failed to get public URL");
  }

  return {
    url: urlData.publicUrl,
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
