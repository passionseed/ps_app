import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SessionParticipant = {
  id: string;
  role: string | null;
};

type SessionRecord = {
  participant_id: string;
  expires_at: string;
  hackathon_participants: SessionParticipant | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
}

function isModeratorRole(role?: string | null): boolean {
  return role === "admin" || role === "mentor" || role === "organizer";
}

async function authenticateParticipant(token: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("hackathon_sessions")
    .select(
      `
      participant_id,
      expires_at,
      hackathon_participants!participant_id(id, role)
    `
    )
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    supabase,
    session: (data as SessionRecord | null) ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return json({ error: "Authorization header required" }, 401);
    }

    const { supabase, session } = await authenticateParticipant(token);
    if (!session) {
      return json({ error: "Invalid or expired hackathon session" }, 401);
    }

    const body = await req.json();
    const action = body?.action;
    const participantId = body?.participantId;
    const isAdmin = Boolean(body?.isAdmin);

    if (!participantId || participantId !== session.participant_id) {
      return json({ error: "Participant mismatch" }, 403);
    }

    const canModerate = isModeratorRole(session.hackathon_participants?.role);

    if (isAdmin && !canModerate) {
      return json({ error: "Moderator privileges required" }, 403);
    }

    if (action === "delete_comment") {
      const commentId = body?.commentId;
      if (!commentId) {
        return json({ error: "commentId is required" }, 400);
      }

      let query = supabase
        .from("hackathon_activity_comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", commentId)
        .is("deleted_at", null);

      if (!canModerate) {
        query = query.eq("participant_id", session.participant_id);
      }

      const { data, error } = await query.select("id");

      if (error) {
        return json({ error: error.message }, 500);
      }

      if (!data || data.length === 0) {
        return json(
          {
            error:
              "Comment could not be deleted. It may have already been removed or you may not have permission.",
          },
          403
        );
      }

      return json({ success: true });
    }

    if (action === "delete_reply") {
      const replyId = body?.replyId;
      if (!replyId) {
        return json({ error: "replyId is required" }, 400);
      }

      let query = supabase
        .from("hackathon_activity_comment_replies")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", replyId)
        .is("deleted_at", null);

      if (!canModerate) {
        query = query.eq("participant_id", session.participant_id);
      }

      const { data, error } = await query.select("id");

      if (error) {
        return json({ error: error.message }, 500);
      }

      if (!data || data.length === 0) {
        return json(
          {
            error:
              "Reply could not be deleted. It may have already been removed or you may not have permission.",
          },
          403
        );
      }

      return json({ success: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500
    );
  }
});
