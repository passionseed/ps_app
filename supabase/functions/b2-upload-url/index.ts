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

let cachedAuth: { authorizationToken: string; apiUrl: string } | null = null;

async function b2Authorize() {
  if (cachedAuth) return cachedAuth;

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
  return cachedAuth;
}

serve(async (req) => {
  console.log("[b2-upload-url] Request received:", req.method);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    console.log("[b2-upload-url] Authorizing with B2...");
    const auth = await b2Authorize();
    console.log("[b2-upload-url] B2 auth success, apiUrl:", auth.apiUrl?.substring(0, 40) + "...");

    const bucketId = requiredEnv("B2_BUCKET_ID");
    console.log("[b2-upload-url] Getting upload URL for bucket:", bucketId.substring(0, 10) + "...");
    
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: auth.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId }),
    });

    console.log("[b2-upload-url] B2 get_upload_url response:", response.status);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[b2-upload-url] B2 get_upload_url failed:", response.status, errorText);
      throw new Error(`B2 get_upload_url failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("[b2-upload-url] Got upload URL successfully");

    return new Response(
      JSON.stringify({
        uploadUrl: data.uploadUrl,
        authorizationToken: data.authorizationToken,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...CORS,
        },
      }
    );
  } catch (e: any) {
    console.error("[b2-upload-url] Error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message || "Failed to get upload URL" }),
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
