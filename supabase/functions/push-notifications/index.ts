import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

interface Profile {
  id: string;
  expo_push_token: string | null;
  mobile_settings: {
    push_enabled: boolean;
    reminder_time: string;
    theme: "light" | "dark";
  } | null;
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

async function sendPushNotification(
  token: string,
  title: string,
  body: string,
): Promise<void> {
  const message = {
    to: token,
    sound: "default",
    title,
    body,
    data: { type: "daily_reminder" },
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

Deno.serve(async (req) => {
  const now = new Date();
  // Convert to Bangkok time (UTC+7)
  const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hour = bangkokTime.getUTCHours();

  console.log(`Running notification cron for hour ${hour} Bangkok time`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const users = await getUsersForHour(supabase, hour);
    console.log(`Found ${users.length} users for hour ${hour}`);

    const results = await Promise.allSettled(
      users.map(async (user) => {
        if (!user.expo_push_token) return;

        try {
          await sendPushNotification(
            user.expo_push_token,
            "Time to grow! 🌱",
            "Continue your daily learning path.",
          );
          return { userId: user.id, success: true };
        } catch (error) {
          console.error(`Failed to send to user ${user.id}:`, error);
          return { userId: user.id, success: false, error };
        }
      }),
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value?.success,
    ).length;
    const failCount = results.length - successCount;

    console.log(`Sent ${successCount} notifications, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        time: `hour ${hour}`,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Cron error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
