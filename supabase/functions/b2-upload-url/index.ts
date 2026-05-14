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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const auth = await b2Authorize();

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: auth.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId: requiredEnv("B2_BUCKET_ID") }),
    });

    if (!response.ok) throw new Error(`B2 get_upload_url failed: ${response.status}`);

    const data = await response.json();

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
    console.error("B2 upload url error:", e);
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
