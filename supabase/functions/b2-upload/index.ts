// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim() ?? "";
  if (!value) throw new Error(`Missing ${name} Supabase secret`);
  return value;
}

const B2_BUCKET = Deno.env.get("B2_BUCKET_NAME")?.trim() || "pseed-dev";
const CDN_DOMAIN = Deno.env.get("CLOUDFLARE_DOMAIN")?.trim() || "cdn.passionseed.org";

interface B2Auth {
  authorizationToken: string;
  apiUrl: string;
}

let cachedAuth: B2Auth | null = null;
let authExpiry: number = 0;

async function b2Authorize(): Promise<B2Auth> {
  const now = Date.now();
  if (cachedAuth && authExpiry > now + 60000) {
    return cachedAuth;
  }

  const keyId = requiredEnv("B2_APPLICATION_KEY_ID");
  const key = requiredEnv("B2_APPLICATION_KEY");
  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: {
      Authorization: "Basic " + btoa(`${keyId}:${key}`),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `B2 auth failed: ${response.status}. Check B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY Supabase secrets.${errorText ? ` ${errorText}` : ""}`
    );
  }

  const data = await response.json();
  cachedAuth = {
    authorizationToken: data.authorizationToken,
    apiUrl: data.apiUrl,
  };
  authExpiry = now + 23 * 60 * 60 * 1000;
  return cachedAuth;
}

interface B2UploadUrl {
  uploadUrl: string;
  authorizationToken: string;
}

let cachedUploadUrl: B2UploadUrl | null = null;
let uploadUrlExpiry: number = 0;

async function b2GetUploadUrl(auth: B2Auth): Promise<B2UploadUrl> {
  const now = Date.now();
  if (cachedUploadUrl && uploadUrlExpiry > now + 60000) {
    return cachedUploadUrl;
  }

  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bucketId: requiredEnv("B2_BUCKET_ID") }),
  });

  if (!response.ok) {
    throw new Error(`B2 upload URL failed: ${response.status}`);
  }

  const data = await response.json();
  cachedUploadUrl = {
    uploadUrl: data.uploadUrl,
    authorizationToken: data.authorizationToken,
  };
  uploadUrlExpiry = now + 23 * 60 * 60 * 1000;
  return cachedUploadUrl;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { fileName, mimeType, base64Data } = await req.json();

    if (!fileName || !base64Data) {
      return new Response(
        JSON.stringify({ error: "Missing fileName or base64Data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const uniqueFileName = `pretotype-${Date.now()}-${fileName}`;

    const auth = await b2Authorize();
    const uploadUrl = await b2GetUploadUrl(auth);

    const response = await fetch(uploadUrl.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: uploadUrl.authorizationToken,
        "X-Bz-File-Name": encodeURIComponent(uniqueFileName),
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "X-Bz-Content-Sha1": "do_not_verify",
      },
      body: bytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`B2 upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const cdnUrl = `https://${CDN_DOMAIN}/file/${B2_BUCKET}/${encodeURIComponent(uniqueFileName)}`;

    return new Response(
      JSON.stringify({
        url: cdnUrl,
        fileName: uniqueFileName,
        fileId: data.fileId,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...CORS,
        },
      }
    );
  } catch (e: any) {
    console.error("B2 upload error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Upload failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...CORS,
        },
      }
    );
  }
});
