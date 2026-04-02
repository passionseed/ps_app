import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Profile = {
  id: string;
  expo_push_token: string | null;
  mobile_settings: {
    push_enabled: boolean;
    reminder_time: string;
    theme: "light" | "dark";
  } | null;
};

type EventPayload =
  | { type: "day_ready"; dayNumber: number }
  | { type: "streak_milestone"; streakDays: 3 | 7 | 14 };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function getUsersForHour(
  supabase: ReturnType<typeof createClient>,
  hour: number,
): Promise<Profile[]> {
  const hourPrefix = `${hour.toString().padStart(2, "0")}:`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, expo_push_token, mobile_settings")
    .eq("is_onboarded", true)
    .not("expo_push_token", "is", null)
    .filter("mobile_settings->>push_enabled", "eq", "true")
    .ilike("mobile_settings->>reminder_time", `${hourPrefix}%`);

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return data || [];
}

async function getProfileForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, expo_push_token, mobile_settings")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

function getEventMessage(event: EventPayload) {
  if (event.type === "day_ready") {
    return {
      title: `Day ${event.dayNumber} ready!`,
      body: "Jump back in when you have a few minutes.",
      data: {
        type: "day_ready",
        dayNumber: event.dayNumber,
      },
    };
  }

  return {
    title: `${event.streakDays}-day streak 🔥`,
    body: "You are building real momentum. Keep going.",
    data: {
      type: "streak_milestone",
      streakDays: event.streakDays,
    },
  };
}

async function sendPushNotification(
  token: string,
  payload: {
    title: string;
    body: string;
    data: Record<string, unknown>;
  },
): Promise<void> {
  const message = {
    to: token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data,
  };

  const response = await fetch(EXPO_PUSH_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Expo push error: ${error}`);
  }

  const result = await response.json();
  console.log("Push sent:", result);
}

async function handleDailyCron(
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const hour = new Date().getUTCHours();

  console.log(`Running notification cron for UTC hour ${hour}`);

  const users = await getUsersForHour(supabase, hour);
  console.log(`Found ${users.length} users for hour ${hour}`);

  const results = await Promise.allSettled(
    users.map(async (user) => {
      if (!user.expo_push_token) return;

      await sendPushNotification(user.expo_push_token, {
        title: "Time to grow! 🌱",
        body: "Continue your daily learning path.",
        data: { type: "daily_reminder" },
      });
      return { userId: user.id, success: true };
    }),
  );

  const successCount = results.filter((result) => result.status === "fulfilled")
    .length;
  const failCount = results.length - successCount;

  return json({
    success: true,
    sent: successCount,
    failed: failCount,
    hour,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: Partial<EventPayload> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.type) {
    return handleDailyCron(service);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const profile = await getProfileForUser(service, user.id);

  if (
    !profile?.expo_push_token ||
    !profile.mobile_settings?.push_enabled
  ) {
    return json({ success: true, skipped: "push_disabled" });
  }

  try {
    await sendPushNotification(
      profile.expo_push_token,
      getEventMessage(body as EventPayload),
    );
    return json({ success: true, delivered: body.type });
  } catch (error) {
    console.error("Event push failed:", error);
    return json({ success: false, error: String(error) }, 500);
  }
});
