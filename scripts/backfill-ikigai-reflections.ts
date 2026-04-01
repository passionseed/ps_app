import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { backfillMissingIkigaiReflections } from "../lib/ikigaiBackfill";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://iikrvgjfkuijcpvdwzvv.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or publishable key");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  const email = process.env.BACKFILL_USER_EMAIL;
  const password = process.env.BACKFILL_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set BACKFILL_USER_EMAIL and BACKFILL_USER_PASSWORD before running this script"
    );
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw signInError;
  }

  const result = await backfillMissingIkigaiReflections(supabase);

  if (result.processedCount === 0) {
    console.log("No past reflections need backfill.");
    return;
  }

  console.log(`Backfilled ${result.processedCount} reflections.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
