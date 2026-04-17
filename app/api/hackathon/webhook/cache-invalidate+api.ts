import {
  invalidateHackathonHomeCache,
  invalidatePhaseCache,
  invalidateTeamCache,
  invalidateTeamMembershipCache,
} from "../../../../lib/prefetch";

type WebhookType = "INSERT" | "UPDATE" | "DELETE";

type SupabaseWebhookPayload = {
  type?: WebhookType;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

const SUPPORTED_HACKATHON_TABLES = new Set([
  "hackathon_teams",
  "hackathon_program_phases",
  "hackathon_team_members",
  "hackathon_programs",
]);

function responseOk(processed: boolean) {
  return Response.json({ ok: true, processed }, { status: 200 });
}

function getSecret() {
  return process.env.SUPABASE_WEBHOOK_SECRET ?? process.env.EXPO_PUBLIC_SUPABASE_WEBHOOK_SECRET;
}

function readRecord(payload: SupabaseWebhookPayload) {
  return payload.record ?? payload.old_record ?? null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeSignature(value: string) {
  return value.trim().replace(/^sha256=/i, "");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function createHmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignatureIfPresent(request: Request, rawBody: string) {
  const provided = request.headers.get("x-supabase-signature");
  if (!provided) return true;

  const secret = getSecret();
  if (!secret) {
    console.error("Supabase webhook signature header received without SUPABASE_WEBHOOK_SECRET configured");
    return false;
  }

  const expected = await createHmacSha256Hex(secret, rawBody);
  return timingSafeEqual(normalizeSignature(provided), expected);
}

function invalidateForPayload(payload: SupabaseWebhookPayload) {
  const table = payload.table;
  if (!table || !SUPPORTED_HACKATHON_TABLES.has(table)) return false;

  const record = readRecord(payload);

  switch (table) {
    case "hackathon_teams": {
      const teamId = readString(record?.id);
      if (teamId) invalidateTeamCache(teamId);
      return true;
    }
    case "hackathon_program_phases": {
      const phaseId = readString(record?.id);
      if (phaseId) invalidatePhaseCache(phaseId);
      return true;
    }
    case "hackathon_team_members": {
      const teamId = readString(record?.team_id);
      const participantId = readString(record?.participant_id);
      if (teamId) invalidateTeamCache(teamId);
      if (participantId) invalidateTeamMembershipCache(participantId);
      return true;
    }
    case "hackathon_programs": {
      invalidateHackathonHomeCache();
      return true;
    }
    default:
      return false;
  }
}

export async function POST(request: Request) {
  let rawBody = "";

  try {
    rawBody = await request.text();

    if (!(await verifySignatureIfPresent(request, rawBody))) {
      return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const payload = (rawBody ? JSON.parse(rawBody) : {}) as SupabaseWebhookPayload;
    const isHackathonTable = payload.schema === "public" && SUPPORTED_HACKATHON_TABLES.has(payload.table ?? "");

    if (!isHackathonTable) return responseOk(false);

    try {
      invalidateForPayload(payload);
    } catch (error) {
      console.error("Failed to invalidate hackathon cache from webhook", error, {
        table: payload.table,
        type: payload.type,
      });
    }

    return responseOk(true);
  } catch (error) {
    console.error("Failed to process hackathon cache invalidation webhook", error);
    return responseOk(false);
  }
}
