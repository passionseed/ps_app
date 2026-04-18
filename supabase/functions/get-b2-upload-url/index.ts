import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.1032.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.1032.0";

const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT") || "s3.us-east-005.backblazeb2.com";
const B2_BUCKET = Deno.env.get("B2_BUCKET_NAME") || "pseed-dev";
const B2_KEY_ID = Deno.env.get("B2_APPLICATION_KEY_ID") || "";
const B2_KEY = Deno.env.get("B2_APPLICATION_KEY") || "";
const CLOUDFLARE_DOMAIN = Deno.env.get("CLOUDFLARE_DOMAIN") || "cdn.passionseed.org";

const s3Client = new S3Client({
  endpoint: `https://${B2_ENDPOINT}`,
  region: "us-east-005",
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_KEY,
  },
});

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { bucket, path, contentType } = await req.json();

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: bucket, path" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Generate presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: `${bucket}/${path}`,
      ContentType: contentType || "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Return Cloudflare CDN URL for public access
    const publicUrl = `https://${CLOUDFLARE_DOMAIN}/${bucket}/${path}`;

    return new Response(
      JSON.stringify({ uploadUrl, publicUrl }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate upload URL" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
