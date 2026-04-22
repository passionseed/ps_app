/**
 * CORS headers for hackathon API routes.
 * Allows requests from the app domain (app.passionseed.org, passion-seed.expo.app)
 * and the website domain (www.passionseed.org) during development.
 */
export const HACKATHON_ALLOWED_ORIGINS = [
  "https://app.passionseed.org",
  "https://www.passionseed.org",
  "http://localhost:3000",
  // EAS preview URLs — these are dynamic so we check dynamically in the helper
];

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = HACKATHON_ALLOWED_ORIGINS.some(
    (o) => origin === o || origin.startsWith("https://passion-seed--")
  );
  return {
    "Access-Control-Allow-Origin": allowed ? origin : HACKATHON_ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-supabase-signature",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Merge CORS headers into a ResponseInit headers object.
 * Use this when returning any API response.
 */
export function withCors(
  init: ResponseInit,
  request: Request,
): ResponseInit {
  return {
    ...init,
    headers: {
      ...corsHeaders(request),
      ...(init.headers as Record<string, string> | undefined),
    },
  };
}
