import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  // Handle OPTIONS for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse webhook payload
    const payload = await req.json();
    const reply = payload.record; // The inserted reply record

    if (!reply || !reply.comment_id || !reply.participant_id) {
      console.error("Invalid payload: missing reply data", payload);
      return json({ error: "Invalid payload: missing reply data" }, 400);
    }

    // Create service client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get parent comment
    const { data: comment, error: commentError } = await supabase
      .from("hackathon_activity_comments")
      .select("id, participant_id, activity_id")
      .eq("id", reply.comment_id)
      .single();

    if (commentError || !comment) {
      console.error("Error fetching comment:", commentError);
      return json({ error: "Parent comment not found" }, 404);
    }

    // 2. Don't notify if replying to own comment
    if (comment.participant_id === reply.participant_id) {
      console.log("Skipping self-reply notification");
      return json({ success: true, skipped: "self_reply" });
    }

    // 3. Get activity title
    const { data: activity, error: activityError } = await supabase
      .from("hackathon_phase_activities")
      .select("id, title")
      .eq("id", comment.activity_id)
      .single();

    if (activityError || !activity) {
      console.error("Error fetching activity:", activityError);
      return json({ error: "Activity not found" }, 404);
    }

    // 4. Get replier name
    const { data: replier, error: replierError } = await supabase
      .from("hackathon_participants")
      .select("id, display_name")
      .eq("id", reply.participant_id)
      .single();

    if (replierError || !replier) {
      console.error("Error fetching replier:", replierError);
      return json({ error: "Replier not found" }, 404);
    }

    // 5. Get recipient push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("hackathon_participant_push_tokens")
      .select("push_token")
      .eq("participant_id", comment.participant_id);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      return json({ error: "Failed to fetch push tokens" }, 500);
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for recipient");
      return json({ success: true, skipped: "no_tokens" });
    }

    // 6. Send notifications
    const messages = tokens.map((t) => ({
      to: t.push_token,
      sound: "default",
      title: "New Reply",
      body: `${replier.display_name} replied to your comment on ${activity.title}`,
      data: {
        type: "comment_reply",
        activityId: comment.activity_id,
        commentId: reply.comment_id,
      },
    }));

    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Expo push error:", errorText);
      return json({ error: "Failed to send push notification" }, 500);
    }

    const result = await response.json();
    console.log("Push notifications sent:", result);

    return json({
      success: true,
      sent: tokens.length,
      activityId: comment.activity_id,
      commentId: reply.comment_id,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return json(
      { error: "Internal server error", details: String(error) },
      500
    );
  }
});
