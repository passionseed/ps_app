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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const inboxItem = payload.record;

    if (!inboxItem || !inboxItem.participant_id || !inboxItem.type) {
      console.error("Invalid payload: missing inbox item data", payload);
      return json({ error: "Invalid payload: missing inbox item data" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens, error: tokensError } = await supabase
      .from("hackathon_participant_push_tokens")
      .select("push_token")
      .eq("participant_id", inboxItem.participant_id);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      return json({ error: "Failed to fetch push tokens" }, 500);
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for participant:", inboxItem.participant_id);
      return json({ success: true, skipped: "no_tokens" });
    }

    const getNotificationContent = (type: string, title: string) => {
      switch (type) {
        case "assessment_review":
          return {
            title: "Feedback Received",
            body: title,
          };
        case "mentor_comment":
          return {
            title: "New Mentor Comment",
            body: title,
          };
        case "admin_announcement":
          return {
            title: "Announcement",
            body: title,
          };
        case "system":
          return {
            title: "Notification",
            body: title,
          };
        default:
          return {
            title: "New Message",
            body: title,
          };
      }
    };

    const content = getNotificationContent(inboxItem.type, inboxItem.title);

    const messages = tokens.map((t) => ({
      to: t.push_token,
      sound: "default",
      title: content.title,
      body: content.body,
      data: {
        type: "inbox_item",
        inboxItemId: inboxItem.id,
        inboxItemType: inboxItem.type,
        actionUrl: inboxItem.action_url,
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
    console.log("Inbox push notifications sent:", result);

    return json({
      success: true,
      sent: tokens.length,
      inboxItemId: inboxItem.id,
      type: inboxItem.type,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return json(
      { error: "Internal server error", details: String(error) },
      500
    );
  }
});
