import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import { getSupabaseRuntimeConfig } from "./runtime-config";

const B2_ENDPOINT = process.env.EXPO_PUBLIC_B2_ENDPOINT || "s3.us-east-005.backblazeb2.com";
const B2_BUCKET = process.env.EXPO_PUBLIC_B2_BUCKET_NAME || "pseed-dev";
const CLOUDFLARE_DOMAIN = process.env.EXPO_PUBLIC_CLOUDFLARE_DOMAIN || "cdn.passionseed.org";

/**
 * Get a presigned upload URL from the server
 * Uses the Supabase Edge Function to generate a secure upload URL
 */
async function getPresignedUploadUrl(
  bucket: string,
  path: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const config = getSupabaseRuntimeConfig();
  const url = `${config.url}/functions/v1/get-b2-upload-url`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.publishableKey}`,
    },
    body: JSON.stringify({
      bucket,
      path,
      contentType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get upload URL: ${error}`);
  }

  const data = await response.json();
  return {
    uploadUrl: data.uploadUrl,
    publicUrl: data.publicUrl,
  };
}

/**
 * Upload bytes directly to B2 using a presigned URL
 */
async function uploadToB2Direct(
  uploadUrl: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: bytes,
  });

  if (!response.ok) {
    throw new Error(`B2 upload failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Main upload function - gets presigned URL and uploads to B2
 */
export async function uploadToB2(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType: string,
  maxRetries = 2
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get presigned URL
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
        bucket,
        path,
        contentType
      );

      // Upload directly to B2
      await uploadToB2Direct(uploadUrl, bytes, contentType);

      return publicUrl;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      Sentry.addBreadcrumb({
        category: "upload",
        message: `B2 upload attempt ${attempt + 1} failed`,
        data: { bucket, path, error: lastError.message },
        level: "warning",
      });

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Upload failed after retries");
}

export function getB2PublicUrl(bucket: string, path: string): string {
  return `https://${B2_ENDPOINT}/${B2_BUCKET}/${bucket}/${path}`;
}

export function isB2Url(url: string): boolean {
  return url.includes("backblazeb2.com") || url.includes(CLOUDFLARE_DOMAIN);
}

export function getCloudflareDomain(): string {
  return CLOUDFLARE_DOMAIN;
}
